import { IPlayer } from '../Interfaces/IPlayer.ts';
import { BaseCharacter } from './BaseCharacter.ts';
import { Quaternion, Vector3 } from 'three';

export class Player extends BaseCharacter implements IPlayer {
    public id: string;

    constructor(
        id: string,
        username: string,
        modelId: number,
        sceneKey: string,
        spawnPosition: Vector3 = new Vector3(),
        spawnRotation: Quaternion = new Quaternion()
    ) {
        super(username, modelId, sceneKey, spawnPosition, spawnRotation);

        this.id = id;
    }
}
