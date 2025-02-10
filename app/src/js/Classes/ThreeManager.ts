import { Clock } from 'three';
import { SceneKey } from '../Enums/SceneKey';
import { IScene } from '../Interfaces/IScene.ts';
import ExperienceRenderer from './ExperienceRenderer.ts';

export default class ThreeManager {
	private readonly canvas: HTMLCanvasElement;
	private readonly clock: Clock;
	private readonly renderer: ExperienceRenderer;
	private readonly scenes: Map<SceneKey, IScene>;
	private animateFrameId: number | null = null;
	private activeScene: IScene | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.clock = new Clock();
		this.scenes = new Map();
		this.renderer = new ExperienceRenderer(canvas);

		// Start animation loop
		this.animate();
	}

	addScene(key: SceneKey, scene: IScene): void {
		this.scenes.set(key, scene);
	}

	setActiveScene(key: SceneKey): void {
		// Check if the scene exists
		if (!this.scenes.has(key)) {
			console.warn(`Scene "${key}" not found.`);
			return;
		}

		// Set new active scene
		this.activeScene = this.scenes.get(key) || null;
	}

	private animate(): void {
		// Get delta time
		const delta = this.clock.getDelta();

		// Only update and render the active scene
		if (this.activeScene) {
			// Update the scene
			this.activeScene.update(delta);

			// Render the renderer
			this.renderer.render(this.activeScene.scene, this.activeScene.camera);
		}

		// Request new frame
		this.animateFrameId = requestAnimationFrame(this.animate.bind(this));
	}

	destroy(): void {
		if (this.animateFrameId) {
			// Cancel next frame
			cancelAnimationFrame(this.animateFrameId);
		}

		// Destroy the active scene
		if (this.activeScene) {
			this.activeScene.destroy();
		}

		// Destroy all scenes in the map
		this.scenes.forEach((scene) => {
			scene.destroy();
		});

		// Dispose of the renderer
		this.renderer.dispose();
	}
}