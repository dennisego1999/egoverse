import { IDialog } from './IDialog.ts';
import { Vector3, Quaternion } from 'three';

export interface ISocketSceneStateData {
	sceneKey: string;
	currentPlayer: {
		id: string;
		username: string;
		modelId: string;
		position: Array<number>;
		quaternion: Array<number>;
	};
	npcs: Array<{
		username: string;
		modelId: number;
		sceneKey: string;
		position: Vector3;
		quaternion: Quaternion;
		dialog: IDialog;
	}>;
	visitors: Array<{
		id: string;
		modelId: string;
		isCurrent: boolean;
		username: string;
		position: Array<number>;
		quaternion: Array<number>;
	}>;
}
