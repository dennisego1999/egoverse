import { Vector3, Quaternion } from 'three';

export interface IBaseCharacter {
	username: string;
	modelId: number;
	position: Vector3;
	quaternion: Quaternion;
}
