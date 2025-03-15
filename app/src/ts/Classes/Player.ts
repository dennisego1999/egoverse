import { IPlayer } from '../Interfaces/IPlayer.ts';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { Vector3, Quaternion } from 'three';
import ExperienceCamera from './ExperienceCamera.ts';
import ExperienceScene from './ExperienceScene.ts';
import BaseCharacter from './BaseCharacter.ts';
import PlayerControls from './PlayerControls.ts';
import ParticleSystem from './ParticleSystem.ts';
import { EventService } from '../Services/EventService.ts';
import { wait } from '../Helpers';
import { CustomEventKey } from '../Enums/CustomEventKey.ts';

export default class Player extends BaseCharacter implements IPlayer {
	public isCurrent: boolean = false;
	public particleSystem: ParticleSystem | null = null;

	constructor(
		username: string,
		modelPrefix: ModelPrefix,
		modelId: number,
		experienceScene: ExperienceScene,
		camera: ExperienceCamera,
		isCurrent: boolean = false,
		spawnPosition: Vector3 = new Vector3(),
		spawnRotation: Quaternion = new Quaternion()
	) {
		super(username, modelPrefix, modelId, camera, experienceScene, spawnPosition, spawnRotation);

		this.isCurrent = isCurrent;

		// Initiate
		this.init().then(() => {
			// Setup controls after player is fully initiated
			this.controls = new PlayerControls(this);

			if (this.isCurrent) {
				// Make sure controls are connected
				this.controls.connect();
			}
		});

		// Setup fart particle effect
		this.particleSystem = new ParticleSystem({
			camera,
			// Assuming the bum is located slightly behind the player model, with a slight offset on the y-axis.
			emitPosition: this.model.position,
			parent: this.experienceScene.scene,
			rate: 25,
			texture: '/assets/textures/fire/particle.png'
		});

		// Set render action
		this.setRenderAction((delta) => {
			if (!this.model || !this.particleSystem) {
				return;
			}

			// Get the particles emit position
			const particlesEmitPosition = this.getParticlesEmitPosition();

			// Update the emit position of the effect
			this.particleSystem.params.emitPosition.copy(particlesEmitPosition);

			// Update the fart effect
			this.particleSystem.update(delta);
		});
	}

	private getParticlesEmitPosition(): Vector3 {
		// Get the position of the character's model
		const position = this.model.position.clone();

		// Create an offset relative to the character's local space (behind the character)
		const offset = new Vector3(0, 0.5, 0.35); // Offset behind the character

		// Apply the quaternion to the offset to rotate it based on the character's orientation
		offset.applyQuaternion(this.model.quaternion);

		// Update the final emit position by adding the rotated offset to the character's position
		return position.add(offset);
	}

	public async fart() {
		if (!this.particleSystem || this.particleSystem.isAlive) {
			return;
		}

		// Dispatch play audio event
		const randomFart: 1 | 2 = (Math.floor(Math.random() * 2) + 1) as 1 | 2;

		// Play random fart sound
		if (randomFart === 1) {
			EventService.dispatch(CustomEventKey.PLAY_AUDIO, '/assets/audio/fart.mp3');
		}

		if (randomFart === 2) {
			EventService.dispatch(CustomEventKey.PLAY_AUDIO, '/assets/audio/big-fart.mp3');
		}

		// Make active player particle fart system alive for 1 second
		this.particleSystem.isAlive = true;

		// Wait for set duration in seconds
		await wait(0.2);

		// Reset alive state
		this.particleSystem.isAlive = false;
	}
}
