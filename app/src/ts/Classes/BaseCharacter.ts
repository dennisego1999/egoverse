import { gsap } from 'gsap';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { Body, Sphere } from 'cannon-es';
import { AnimationName } from '../Enums/AnimationName.ts';
import { IBaseCharacter } from '../Interfaces/IBaseCharacter.ts';
import { IExperienceScene } from '../Interfaces/IExperienceScene.ts';
import { PhysicsCollisionGroup } from '../Enums/PhysicsCollisionGroup.ts';
import { copyQuaternionToCannon } from '../Helpers';
import { CharacterFacingDirection } from '../Enums/CharacterFacingDirection.ts';
import {
	AnimationAction,
	AnimationClip,
	AnimationMixer,
	Box3,
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	Quaternion,
	Vector3
} from 'three';
import ExperienceScene from './ExperienceScene.ts';
import ExperienceManager from './ExperienceManager.ts';
import PlayerControls from './PlayerControls.ts';
import NpcControls from './NpcControls.ts';
import ExperienceCamera from './ExperienceCamera.ts';
import Player from './Player.ts';
import Text3D from './Text3D.ts';

export default class BaseCharacter implements IBaseCharacter {
	public animationsMap: Map<string, AnimationAction>;
	public experienceScene: IExperienceScene;
	public mixer: AnimationMixer;
	public model: Object3D;
	public modelPrefix: ModelPrefix;
	public modelId: number;
	public controls: PlayerControls | NpcControls | null = null;
	public camera: ExperienceCamera;
	public spawnPosition: Vector3;
	public spawnRotation: Quaternion;
	public username: string;
	public usernameLabel: Object3D | null = null;
	public hitbox: Mesh | null = null;
	public physicsBody: Body | null = null;
	public renderAction: ((...args: any[]) => void) | null = null;
	private readonly physicsCharacterSphereRadius: number;

	constructor(
		username: string,
		modelPrefix: ModelPrefix,
		modelId: number,
		camera: ExperienceCamera,
		experienceScene: ExperienceScene,
		spawnPosition: Vector3 = new Vector3(),
		spawnRotation: Quaternion = new Quaternion()
	) {
		this.username = username;
		this.modelPrefix = modelPrefix;
		this.modelId = modelId;
		this.camera = camera;
		this.experienceScene = experienceScene;
		this.spawnPosition = spawnPosition;
		this.spawnRotation = spawnRotation;
		this.animationsMap = new Map();
		this.model = new Object3D();
		this.mixer = new AnimationMixer(new Mesh());
		this.physicsCharacterSphereRadius = 0.9;
	}

	get modelDimensions() {
		if (!this.model) {
			return { width: 0, height: 0, depth: 0 };
		}

		// Calculate dimensions
		const bbox = new Box3().setFromObject(this.model);
		const size = new Vector3();
		bbox.getSize(size);

		return { width: size.x, height: size.y, depth: size.z };
	}

	get facingDirection(): CharacterFacingDirection {
		// Create a unit vector pointing along the z-axis (forward direction)
		const forward = new Vector3(0, 0, 1);

		// Apply the quaternion to the forward vector to get the actual direction
		forward.applyQuaternion(this.model.quaternion);

		// Now, check the direction based on the resulting vector
		if (Math.abs(forward.x) > Math.abs(forward.z) && Math.abs(forward.x) > Math.abs(forward.y)) {
			// If the x component is the largest, check left or right
			if (forward.x > 0) {
				return CharacterFacingDirection.LEFT;
			} else {
				return CharacterFacingDirection.RIGHT;
			}
		} else if (Math.abs(forward.z) > Math.abs(forward.x) && Math.abs(forward.z) > Math.abs(forward.y)) {
			// If the z component is the largest, check front or back
			if (forward.z > 0) {
				return CharacterFacingDirection.BACK;
			} else {
				return CharacterFacingDirection.FRONT;
			}
		}

		// Default if no direction is clearly dominant
		return CharacterFacingDirection.UNKNOWN;
	}

	async init(): Promise<void> {
		// Create the character
		await this.load();
	}

	async load(): Promise<void> {
		try {
			const { model, animations } = await ExperienceManager.instance.getModel(
				this.modelPrefix,
				this.modelId,
				this.spawnPosition,
				this.spawnRotation
			);

			// Set model
			this.model = model;

			// Filter out the T pose animation
			const filteredAnimations = [
				...animations.filter((animation: AnimationClip) => animation.name !== AnimationName.TPOSE)
			];

			// Set animation mixer
			this.mixer = new AnimationMixer(this.model);

			// Set animations map
			filteredAnimations.forEach((animation: AnimationClip) => {
				this.animationsMap.set(animation.name as AnimationName, this.mixer.clipAction(animation));
			});

			// Add player to experienceScene
			this.experienceScene.scene.add(this.model);

			// Make sure all tweens are killed first
			gsap.killTweensOf(this.model.scale);

			// Animate in character
			gsap.fromTo(
				this.model.scale,
				{ x: 0, y: 0, z: 0 },
				{
					x: 1,
					y: 1,
					z: 1,
					ease: 'back.out',
					duration: 1,
					onComplete: () => {
						// Add username label
						this.addUsernameLabel();

						// Add model hitbox
						this.addHitBox();

						// Setup physics body of character
						this.setupPhysicsBody();
					}
				}
			);
		} catch (error) {
			console.error(error);
		}
	}

	async addUsernameLabel() {
		if (this instanceof Player && this.isCurrent) {
			return;
		}

		// Create 3D text
		this.usernameLabel = await Text3D.create(this.username, '/assets/fonts/rubik.json');

		// Get model height
		const bbox = new Box3();
		bbox.setFromObject(this.model, true);

		// Define target y position
		const targetPositionY = this.modelDimensions.height + 0.1;

		// Set y position right above model height using offset
		this.usernameLabel.position.y = targetPositionY;

		// Add to scene
		this.experienceScene.scene.add(this.usernameLabel);

		// Make sure all tweens are killed first
		gsap.killTweensOf(this.usernameLabel.scale);
		gsap.killTweensOf(this.usernameLabel.position);

		// Create timeline
		const tl: GSAPTimeline = gsap.timeline();

		// Animate in character
		tl.fromTo(
			this.usernameLabel.scale,
			{ x: 0, y: 0, z: 0 },
			{
				x: 1,
				y: 1,
				z: 1,
				ease: 'back.out',
				duration: 1
			},
			'0'
		).fromTo(
			this.usernameLabel.position,
			{ x: 0, y: targetPositionY + 0.5, z: 0 },
			{
				x: 0,
				y: targetPositionY,
				z: 0,
				ease: 'back.out',
				duration: 1
			},
			'0'
		);
	}

	addHitBox() {
		// Create a hitbox
		const geometry = new BoxGeometry(
			this.modelDimensions.width,
			this.modelDimensions.height,
			this.modelDimensions.depth
		);
		const material = new MeshBasicMaterial({ transparent: true, opacity: 0 });
		this.hitbox = new Mesh(geometry, material);

		// Position the hitbox so its base aligns with the model's base
		this.hitbox.position.y = this.model.position.y + this.modelDimensions.height / 2;

		// Update the name attribute
		this.hitbox.name = this.username;

		// Add custom data
		if (this.modelPrefix === ModelPrefix.PLAYER) this.hitbox.userData['isPlayer'] = true;
		if (this.modelPrefix === ModelPrefix.NPC) this.hitbox.userData['isNpc'] = true;
		if (this instanceof Player) {
			this.hitbox.userData['socketId'] = this.socketId;
		}

		// Set renderOrder to ensure it renders after everything else (or last in the stack)
		this.hitbox.renderOrder = 1;

		// Add hitbox to scene
		this.experienceScene.scene.add(this.hitbox);
	}

	setupPhysicsBody() {
		// Add physics
		const avatarShape = new Sphere(this.physicsCharacterSphereRadius);
		this.physicsBody = new Body({
			mass: 5,
			shape: avatarShape,
			collisionFilterGroup: PhysicsCollisionGroup.CHARACTER, // Set collision group
			collisionFilterMask: PhysicsCollisionGroup.FLOOR | PhysicsCollisionGroup.WALL | PhysicsCollisionGroup.SCENE_OBJECT // This body can only collide with bodies from these groups
		});
		this.physicsBody.allowSleep = false; // IMPORTANT to keep calculating the collisions => ONLY APPLY HERE
		this.physicsBody.position.x = this.model.position.x;
		this.physicsBody.position.y = this.physicsCharacterSphereRadius;
		this.physicsBody.position.z = this.model.position.z;
		ExperienceManager.instance.activeScene!.physicsWorld.addBody(this.physicsBody);
	}

	setRenderAction(action: (...args: any[]) => void): void {
		this.renderAction = action;
	}

	update(delta: number): void {
		// Update the mixer
		this.mixer.update(delta);

		if (this.physicsBody && this.model && this.hitbox) {
			// Make sure velocity is always 0 to prevent issues
			this.physicsBody.velocity.x = 0;
			this.physicsBody.velocity.y = 0;
			this.physicsBody.velocity.z = 0;

			// Sync the rotation and position of the character model and hitbox with physics
			this.physicsBody.quaternion.copy(copyQuaternionToCannon(this.model.quaternion));
			this.physicsBody.position.y = this.physicsCharacterSphereRadius;

			this.model.position.x = this.physicsBody.position.x;
			this.model.position.z = this.physicsBody.position.z;

			this.hitbox.position.x = this.physicsBody.position.x;
			this.hitbox.position.z = this.physicsBody.position.z;
			this.hitbox.quaternion.copy(this.model.quaternion);
		}

		// Sync position of avatar label with character position
		if (this.usernameLabel) {
			// Sync position
			this.usernameLabel.position.x = this.model.position.x;
			this.usernameLabel.position.z = this.model.position.z;
		}

		if (this.controls && ExperienceManager.instance.isInteractive) {
			// Update controls
			this.controls.update(delta, this.controls.keysPressed);
		}

		if (this.renderAction) {
			// Call custom render action
			this.renderAction(delta);
		}
	}

	destroy(): void {
		if (this.controls) {
			// Disconnect player controls
			this.controls.disconnect();
		}

		if (this.model) {
			// Make sure all tweens are killed first
			gsap.killTweensOf(this.model.scale);

			// Animate in character
			gsap.to(this.model.scale, {
				x: 0,
				y: 0,
				z: 0,
				ease: 'back.out',
				duration: 1,
				onComplete: () => {
					if (this.usernameLabel) {
						// Remove username label from experienceScene
						this.experienceScene.scene.remove(this.usernameLabel);
					}

					if (this.model) {
						// Remove model from experienceScene
						this.experienceScene.scene.remove(this.model);
					}

					if (this.physicsBody) {
						// Remove physics body
						this.experienceScene.physicsWorld.removeBody(this.physicsBody);
					}
				}
			});
		}
	}
}
