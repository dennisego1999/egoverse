import { AvatarType } from '../Enums/AvatarType.ts';
import { IExperienceScene } from './IExperienceScene.ts';
import { AnimationAction, AnimationMixer, Object3D } from 'three';

export interface IAvatar {
    experienceScene: IExperienceScene;
    type: AvatarType;
    model: Object3D | null;
    mixer: AnimationMixer;
    animationsMap: Map<string, AnimationAction | null>;

    init(): void;
    load(): void;
    update(delta: number): void;
    destroy(): void;
}