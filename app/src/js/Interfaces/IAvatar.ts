import { AnimationAction, AnimationMixer, Object3D, Scene } from 'three';

export interface IAvatar {
    scene: Scene;
    model: Object3D | null;
    mixer: AnimationMixer;
    animationsMap: Map<string, AnimationAction | null>;

    init(): void;
    load(): void;
    update(delta: number): void;
    destroy(): void;
}