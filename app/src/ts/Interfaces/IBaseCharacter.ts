import { Body } from 'cannon-es';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { IExperienceScene } from './IExperienceScene.ts';
import { CharacterFacingDirection } from '../Enums/CharacterFacingDirection.ts';
import { AnimationAction, AnimationMixer, Object3D, Quaternion, Vector3 } from 'three';
import PlayerControls from '../Classes/PlayerControls.ts';
import NpcControls from '../Classes/NpcControls.ts';
import ExperienceCamera from '../Classes/ExperienceCamera.ts';

export interface IBaseCharacter {
	username: string;
	usernameLabel: Object3D | null;
	modelPrefix: ModelPrefix;
	modelId: number;
	controls: PlayerControls | NpcControls | null;
	camera: ExperienceCamera;
	experienceScene: IExperienceScene;
	model: Object3D | null;
	mixer: AnimationMixer | null;
	animationsMap: Map<string, AnimationAction>;
	spawnPosition: Vector3;
	spawnRotation: Quaternion;
	modelHeight: number | null;
	physicsBody: Body | null;
	renderAction: ((...args: any[]) => void) | null;

	readonly facingDirection: CharacterFacingDirection;

	setRenderAction(action: (...args: any[]) => void): void;
	init(): Promise<void>;
	load(): Promise<void>;
	update(delta: number): void;
	destroy(): void;
}
