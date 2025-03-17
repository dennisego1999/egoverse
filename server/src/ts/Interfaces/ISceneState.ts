import { IDialog } from './IDialog.ts';
import { SceneKey } from '../Enums/SceneKey.ts';
import { QuaternionTuple, Vector3Tuple } from 'three';

export interface ISceneState {
	sceneKey: SceneKey;
	currentPlayer: {
		id: string;
		username: string;
		modelId: number;
		position: Vector3Tuple;
		quaternion: QuaternionTuple;
		sceneKey: SceneKey;
	};
	npcs: Array<{
		username: string;
		modelId: number;
		dialog: IDialog;
		position: Vector3Tuple;
		quaternion: QuaternionTuple;
	}>;
	visitors: Array<{
		id: string;
		username: string;
		modelId: number;
		position: Vector3Tuple;
		quaternion: QuaternionTuple;
	}>;
}
