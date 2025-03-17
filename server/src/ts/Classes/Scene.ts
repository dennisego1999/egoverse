import { Npc } from './Npc.ts';
import { Player } from './Player.ts';
import { IScene } from '../Interfaces/IScene';
import { SceneKey } from '../Enums/SceneKey.ts';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { ISceneState } from '../Interfaces/ISceneState.ts';
import { ISceneSettings } from '../Interfaces/ISceneSettings.ts';
import { Quaternion, Vector3 } from 'three';

export class Scene implements IScene {
	sceneKey: SceneKey;
	players: Map<string, Player>;
	npcs: Array<Npc>;
	settings: ISceneSettings;

	constructor(sceneKey: SceneKey) {
		this.sceneKey = sceneKey;
		this.npcs = [];
		this.settings = {
			environment: {
				modelPrefix: ModelPrefix.ENVIRONMENT,
				modelId: 1,
				spawnRotation: new Quaternion(),
				spawnPosition: new Vector3(),
				spawnScale: new Vector3(),
				physicsObjects: []
			}
		};
		this.players = new Map();
	}

	addPlayer(player: Player): void {
		this.players.set(player.id, player);
	}

	removePlayer(playerId: string): void {
		this.players.delete(playerId);
	}

	public addNpc(npc: Npc) {
		this.npcs.push(npc);
	}

	public removeNpc(npc: Npc) {
		this.npcs = this.npcs.filter((n) => n.username !== npc.username);
	}

	public updateSettings(newSettings: Partial<ISceneSettings>) {
		this.settings = { ...this.settings, ...newSettings };
	}

	getState(currentUserId: string): ISceneState {
		const currentPlayer = this.players.get(currentUserId)!;
		const visitors = Array.from(this.players.values()).filter((p) => p.id !== currentUserId);

		return {
			sceneKey: this.sceneKey,
			currentPlayer: {
				id: currentPlayer?.id,
				username: currentPlayer?.username,
				modelId: currentPlayer?.modelId,
				position: currentPlayer?.position.toArray(),
				quaternion: currentPlayer?.quaternion.toArray(),
				sceneKey: currentPlayer?.sceneKey
			},
			npcs: this.npcs.map((npc) => ({
				username: npc.username,
				modelId: npc.modelId,
				dialog: npc.dialog,
				position: npc.position.toArray(),
				quaternion: npc.quaternion.toArray()
			})),
			visitors: visitors.map((v) => ({
				id: v.id,
				username: v.username,
				modelId: v.modelId,
				position: v.position.toArray(),
				quaternion: v.quaternion.toArray()
			}))
		};
	}
}
