import { gsap } from 'gsap';
import { wait } from '../Helpers';
import { INpc } from '../Interfaces/INpc.ts';
import { IDialog } from '../Interfaces/IDialog.ts';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { AnimationName } from '../Enums/AnimationName.ts';
import { Mesh, Quaternion, Vector3 } from 'three';
import ExperienceScene from './ExperienceScene.ts';
import BaseCharacter from './BaseCharacter.ts';
import ExperienceCamera from './ExperienceCamera.ts';
import NpcControls from './NpcControls.ts';
import Text3D from './Text3D.ts';

export default class Npc extends BaseCharacter implements INpc {
	public dialog: IDialog;
	public isTalking: boolean = false;

	constructor(
		username: string,
		modelPrefix: ModelPrefix,
		modelId: number,
		dialog: IDialog,
		experienceScene: ExperienceScene,
		camera: ExperienceCamera,
		spawnPosition: Vector3 = new Vector3(),
		spawnRotation: Quaternion = new Quaternion()
	) {
		super(username, modelPrefix, modelId, camera, experienceScene, spawnPosition, spawnRotation);

		this.dialog = dialog;

		// Initiate
		this.init().then(() => {
			// Setup controls after npc is fully initiated
			this.controls = new NpcControls(this);
		});
	}

	public async startDialog(): Promise<void> {
		if (!this.controls || this.isTalking) {
			return;
		}

		// Set talking state
		this.isTalking = true;

		// Play the talking animation
		this.controls.playAnimation(AnimationName.TALKING);

		// Config
		const textSize = 0.05;
		const textColor = 0x000000;
		const fontUrl = '/assets/fonts/rubik.json';
		const targetPositionY = this.modelDimensions.height ? this.modelDimensions.height + 0.4 : 4;

		// Generate messages
		for (const message of this.dialog.messages) {
			// Create 3D text for message
			const textMesh: Mesh = await Text3D.create(message!, fontUrl, textSize, textColor);

			// Position text near the model
			textMesh.position.set(this.model.position.x, targetPositionY, this.model.position.z);
			this.experienceScene.scene.add(textMesh);

			// Kill existing tweens
			gsap.killTweensOf(textMesh.scale, textMesh.position);

			// Animate text appearance
			const tl: GSAPTimeline = gsap.timeline();
			tl.fromTo(textMesh.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, ease: 'sine.inOut', duration: 0.8 }).fromTo(
				textMesh.position,
				{ y: targetPositionY + 0.15 },
				{ y: targetPositionY, ease: 'sine.inOut', duration: 0.8 },
				'0'
			);

			// Wait
			await wait(2);

			// Animate text disappearance (reverse)
			await tl.reverse();

			// Remove mesh from scene
			this.experienceScene.scene.remove(textMesh);

			// Wait
			await wait(1);
		}

		// Reset talking state
		this.isTalking = false;
	}
}
