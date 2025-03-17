import { SceneKey } from '../Enums/SceneKey.ts';
import { Quaternion, Vector3 } from 'three';

export interface IPlayer {
	id: string;
	sceneKey: SceneKey;

	updatePositionAndRotation(position: Vector3, quaternion: Quaternion): void;
}
