import { Object3D, Scene } from 'three';
import ExperienceCamera from '../Classes/ExperienceCamera.ts';
import Avatar from '../Classes/Avatar.ts';
import { SceneKey } from '../Enums/SceneKey.ts';

export interface IExperienceScene {
    scene: Scene;
    sceneKey: SceneKey,
    camera: ExperienceCamera;
    cameraParent: Object3D;
    updateAction: ((delta: number) => void) | null;
    playerAvatar: Avatar | null;
    visitorAvatars: { [key: string]: Avatar };

    setupFloor(color: string): void;
    addVisitor(userId: string): void;
    removeVisitor(userId: string): void;
    update(delta: number): void;
    destroy(): void;
}