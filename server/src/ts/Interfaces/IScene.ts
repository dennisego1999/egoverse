import { Npc } from '../Classes/Npc.ts';
import { Player } from '../Classes/Player.ts';
import { ISceneState } from './ISceneState.ts';
import { ISceneSettings } from './ISceneSettings.ts';
import { SceneKey } from '../Enums/SceneKey.ts';
import { IDialog } from './IDialog.ts';

export interface IScene {
	players: Map<string, Player>;
	npcs: Array<Npc>;
	settings: ISceneSettings;

	addNpc(npc: Npc): void;
	removeNpc(npc: Npc): void;
	addPlayer(player: Player): void;
	removePlayer(playerId: string): void;
	updateSettings(newSettings: ISceneSettings): void;

	getState(currentUserId: string): {
		sceneKey: SceneKey;
		currentPlayer: { position: number[]; quaternion: number[] };
		npcs: { username: string; modelId: number; dialog: IDialog; position: number[]; quaternion: number[] }[];
		visitors: { id: string; username: string; modelId: number; position: number[]; quaternion: number[] }[];
	};
}
