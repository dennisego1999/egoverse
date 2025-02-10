import { AvatarType } from '../Enums/AvatarType.ts';
import { IAvatarLobby } from '../Interfaces/IAvatarLobby.ts';
import { CameraControls } from './CameraControls.ts';
import { IExperienceScene } from '../Interfaces/IExperienceScene.ts';
import { AmbientLight, DirectionalLight, HemisphereLight, OrthographicCamera, Scene } from 'three';
import ExperienceCamera from './ExperienceCamera.ts';
import Avatar from './Avatar.ts';

export default abstract class ExperienceScene implements IExperienceScene, IAvatarLobby {
	public readonly scene: Scene;
	public readonly controls: CameraControls;
	public readonly camera: ExperienceCamera;
	public updateAction: ((delta: number) => void) | null;
	public playerAvatar: Avatar | null = null;
	public visitorAvatars: Avatar[] | null = null;

	protected constructor(canvas: HTMLCanvasElement) {
		this.scene = new Scene();
		this.camera = new ExperienceCamera(this.scene, canvas);
		this.updateAction = null;

		// Set current player
		this.playerAvatar = new Avatar(this.scene, this.camera, AvatarType.CURRENT_PLAYER);

		// Create camera controls
		this.controls = new CameraControls(this.playerAvatar, canvas);
		
		// Set render action
		this.setUpdateAction((delta) => {
			if(this.playerAvatar) {
				// Update avatar
				this.playerAvatar.update(delta);
			}
		});

		// Setup lighting
		this.setupLighting();
	}

	public setupLighting(): void {
		// Add ambient light
		const ambientLight = new AmbientLight(0xffffff, 5);
		this.scene.add(ambientLight);

		// Add hemisphere light
		const hemiLight = new HemisphereLight(0xffffff, 0x444444, 0.5);
		hemiLight.position.set(0, 20, 0);
		this.scene.add(hemiLight);

		// Add directional light
		const dirLight = new DirectionalLight(0xffffff, 10);
		dirLight.position.set(-3, 10, -10);
		dirLight.castShadow = true;
		dirLight.shadow.camera = new OrthographicCamera(-10, 10, 10, -10, 1, 1000);
		dirLight.shadow.mapSize.set(4096, 4096);
		this.scene.add(dirLight);
	}

	public setUpdateAction(callback: (delta: number) => void): void {
		this.updateAction = callback;
	}

	public update(delta: number): void {
		if (this.updateAction) {
			// Call render action if not paused
			this.updateAction(delta);
		}
	}

	public destroy(): void {
		// Dispose any resources tied to the scene
	}
}