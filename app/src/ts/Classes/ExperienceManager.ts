import { gsap } from 'gsap';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { SceneKey } from '../Enums/SceneKey';
import { ref, Ref } from 'vue';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { SocketEvent } from '../Enums/SocketEvent.ts';
import { ThreeLoaders } from './ThreeLoaders.ts';
import { EventService } from '../Services/EventService.ts';
import { CustomEventKey } from '../Enums/CustomEventKey.ts';
import { ISocketInitData } from '../Interfaces/ISocketInitData.ts';
import { ISocketUserData } from '../Interfaces/ISocketUserData.ts';
import { ExperienceSocket } from './ExperienceSocket.ts';
import { IExperienceScene } from '../Interfaces/IExperienceScene.ts';
import { IExtendedObject3D } from '../Interfaces/IExtendedObject3D.ts';
import { IModelCacheEntry } from '../Interfaces/IModelCacheEntry.ts';
import { ISocketMessageData } from '../Interfaces/ISocketMessageData.ts';
import { ISocketSceneStateData } from '../Interfaces/ISocketSceneStateData.ts';
import { ISocketTriggerEmoteData } from '../Interfaces/ISocketTriggerEmoteData.ts';
import { ISocketClientUpdatePlayerData } from '../Interfaces/ISocketClientUpdatePlayerData.ts';
import { Clock, DefaultLoadingManager, LoadingManager, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import ExperienceRenderer from './ExperienceRenderer.ts';
import Player from './Player.ts';
import ExperienceScene from './ExperienceScene.ts';
import Npc from './Npc.ts';
import Stats from 'stats.js';

export default class ExperienceManager {
	private static _instance: ExperienceManager | null = null;
	private canvas: HTMLCanvasElement | null = null;
	public clock: Clock = new Clock();
	public userId: string | null = null;
	public username: string | null = null;
	public modelId: number | null = null;
	private renderer: ExperienceRenderer | null = null;
	private scenes: Map<SceneKey, IExperienceScene> = new Map();
	private animateFrameId: number | null = null;
	public activeScene: IExperienceScene | null = null;
	private loaderManager: LoadingManager = DefaultLoadingManager;
	private raycaster: Raycaster = new Raycaster();
	private pointer: Vector2 | null = null;
	private hoveredPlayer: Player | null = null;
	private hoveredNpc: Npc | null = null;
	public selectedPlayer: Ref<Player | null> = ref(null);
	public incomingVisitorMessageData: Ref<ISocketMessageData> = ref({ message: null, senderUserId: null });
	public isInteractive: boolean = true;
	private modelCache: Map<string, IModelCacheEntry> = new Map();
	private needsRaycast: boolean = false;
	private stats: Stats = new Stats();
	private raycastThrottle: number = 0;
	private static readonly RAYCAST_INTERVAL: number = 5; // Runs every 5 frames

	private constructor() {}

	public static get instance(): ExperienceManager {
		if (!ExperienceManager._instance) {
			ExperienceManager._instance = new ExperienceManager();
		}
		return ExperienceManager._instance;
	}

	public init(canvas: HTMLCanvasElement, username: string, modelId: number): void {
		if (this.canvas) {
			// Prevent re-initialization
			throw new Error('ExperienceManager is already initialized');
		}

		// Init...
		this.canvas = canvas;
		this.renderer = new ExperienceRenderer(this.canvas);
		this.username = username;
		this.modelId = modelId;
		this.updateSceneCamerasAndRenderSize();

		// Add event listeners
		this.addEventListeners();

		// Handle scene loading
		this.handleSceneLoading();

		// Setup websocket event listeners
		this.setupSocketListeners();

		// Setup stats
		this.stats.showPanel(0);
		if (!document.body.contains(this.stats.dom)) {
			document.body.appendChild(this.stats.dom);
		}
	}

	private setupSocketListeners(): void {
		ExperienceSocket.on<ISocketInitData>(SocketEvent.INIT, (data) => {
			console.log('Init', data);

			// Set user id
			this.userId = data.id;

			// Make sure scenes map starts clean/empty
			this.scenes.clear();

			// Create scenes dynamically from backend data
			data.scenes.forEach((sceneData) => {
				const scene = new ExperienceScene(this.canvas!, sceneData.sceneKey, sceneData.settings);
				this.scenes.set(sceneData.sceneKey, scene);
			});

			// Set active scene
			this.setActiveScene(data.currentSceneKey as SceneKey);
		});

		ExperienceSocket.on<ISocketSceneStateData>(SocketEvent.SCENE_STATE, (data) => {
			console.log('Scene state', data);

			// Add current player
			if (!this.activeScene?.players[data.currentPlayer.id]) {
				this.activeScene?.addCurrentPlayer(
					data.currentPlayer.username,
					parseInt(data.currentPlayer.modelId),
					new Vector3(...data.currentPlayer.position),
					new Quaternion(...data.currentPlayer.quaternion)
				);
			}

			// Add npcs if they're not present in active scene
			data.npcs.forEach((npc) => {
				if (!this.activeScene?.npcs.find((n) => n.username === npc.username)) {
					this.activeScene?.addNpc(
						npc.username,
						npc.modelId,
						npc.dialog,
						new Vector3(...npc.position),
						new Quaternion(...npc.quaternion)
					);
				}
			});

			// Get visitor ids mapping
			const visitorsIds = new Set(data.visitors.map((visitor) => visitor.id));

			// Add new visitors to the scene
			if (data.visitors.length) {
				data.visitors.forEach((visitor) => {
					if (!this.activeScene?.players[visitor.id]) {
						this.activeScene?.addVisitor(
							visitor.id,
							visitor.username,
							parseInt(visitor.modelId),
							new Vector3(...visitor.position),
							new Quaternion(...visitor.quaternion)
						);
					}
				});
			}

			// Remove visitors that should no longer be in scene
			Object.keys(this.activeScene!.players).forEach((socketId) => {
				if (
					!visitorsIds.has(socketId) &&
					this.activeScene!.players[socketId] &&
					!this.activeScene!.players[socketId].isCurrent
				) {
					this.activeScene?.removeVisitor(socketId);
				}
			});
		});

		ExperienceSocket.on<ISocketClientUpdatePlayerData>(SocketEvent.CLIENT_UPDATE_PLAYER, (data) => {
			// Update player in target scene
			if (this.activeScene && this.activeScene.players && this.activeScene.sceneKey === data.sceneKey) {
				const player = this.activeScene.players[data.visitorId];
				if (player && player.controls) {
					// Update the keys press object
					player.controls.keysPressed = data.keysPressed;

					// Update the visitor
					player.update(data.delta);
				}
			}
		});

		ExperienceSocket.on<ISocketMessageData>(SocketEvent.SEND_MESSAGE, (data) => {
			console.log('New message received!', data);

			// Set ref
			this.incomingVisitorMessageData.value = data;
		});

		ExperienceSocket.on<ISocketTriggerEmoteData>(SocketEvent.TRIGGER_EMOTE, (data) => {
			console.log('Emote triggered!', data);

			if (!this.activeScene || !this.activeScene.currentPlayer || !this.activeScene.currentPlayer.controls) {
				return;
			}

			// Find target visitor
			const targetVisitor = this.activeScene.players[data.userId] ?? null;

			if (!targetVisitor) {
				console.warn('Target player not found when trying to trigger emote...');
				return;
			}

			if (!targetVisitor.controls) {
				return;
			}

			// Set emote animation name
			targetVisitor.controls.playAnimation(data.animationName);
		});

		ExperienceSocket.on<ISocketUserData>(SocketEvent.FART, async (data) => {
			console.log('Player farted!', data);

			if (!this.activeScene) {
				return;
			}

			// Find the target visitor
			const targetVisitor = this.activeScene.players[data.userId] ?? null;

			if (!targetVisitor) {
				console.warn('Target player not found when trying to trigger fart...');
				return;
			}

			// Trigger fart
			await targetVisitor.fart();
		});
	}
	setActiveScene(key: SceneKey): void {
		// Check if the scene exists
		if (!this.scenes.has(key)) {
			console.warn(`Scene "${key}" not found.`);
			return;
		}

		if (this.activeScene && this.activeScene.sceneKey === key) {
			return;
		}

		if (this.activeScene && this.activeScene.currentPlayer && this.activeScene.currentPlayer.model) {
			// Make sure all tweens are killed first
			gsap.killTweensOf(this.activeScene.currentPlayer.model.scale);

			// First remove current player from previous active scene
			gsap.to(this.activeScene.currentPlayer.model.scale, {
				x: 0,
				y: 0,
				z: 0,
				duration: 0.4,
				ease: 'back.inOut',
				onComplete: () => {
					if (this.activeScene) {
						// Remove active player from previous scene
						this.activeScene.removeCurrentPlayer();

						// Call destroy method on npc characters
						this.activeScene.npcs.forEach((npc) => npc.destroy());

						// Clear list
						this.activeScene.npcs = [];
					}

					// Set new active scene
					this.activeScene = this.scenes.get(key) || null;

					// Emit join room
					ExperienceSocket.emit(SocketEvent.JOIN_SCENE, {
						userId: this.userId,
						username: this.username,
						modelId: this.modelId,
						sceneKey: key,
						spawnPosition: this.activeScene?.currentPlayer?.model?.position ?? new Vector3(),
						spawnRotation: this.activeScene?.currentPlayer?.model?.quaternion ?? new Quaternion()
					});
				}
			});

			return;
		}

		// Set new active scene
		this.activeScene = this.scenes.get(key) || null;

		// Emit join room
		ExperienceSocket.emit(SocketEvent.JOIN_SCENE, {
			userId: this.userId,
			username: this.username,
			modelId: this.modelId,
			sceneKey: key,
			spawnPosition: this.activeScene?.currentPlayer?.model?.position ?? new Vector3(),
			spawnRotation: this.activeScene?.currentPlayer?.model?.quaternion ?? new Quaternion()
		});
	}

	private addEventListeners() {
		window.addEventListener('resize', () => this.resize());

		if (this.canvas) {
			this.canvas.addEventListener('pointermove', (event: PointerEvent) => this.onPointerMove(event));
			this.canvas.addEventListener('click', () => this.checkIntersectingPlayer());
		}
	}

	private removeEventListeners() {
		window.removeEventListener('resize', () => this.resize());

		if (this.canvas) {
			this.canvas.removeEventListener('pointermove', (event: PointerEvent) => this.onPointerMove(event));
			this.canvas.removeEventListener('click', () => this.checkIntersectingPlayer());
		}
	}

	private handleSceneLoading() {
		// On load
		this.loaderManager.onLoad = () => {
			// Start animation loop
			this.animate();

			// Dispatch is ready event
			EventService.dispatch(CustomEventKey.READY);
		};
	}

	handleRaycaster() {
		if (!this.activeScene || !this.pointer) {
			return;
		}

		this.raycastThrottle++;
		if (this.raycastThrottle % ExperienceManager.RAYCAST_INTERVAL !== 0) {
			return;
		}

		// Update the picking ray with the camera and pointer position
		this.raycaster.setFromCamera(this.pointer, this.activeScene.camera);

		// Filter players and NPCs beforehand
		const intersectTargets = [
			...Object.values(this.activeScene.players).map((player) => player.model),
			...this.activeScene.npcs.map((npc) => npc.model)
		];

		// Calculate objects intersecting the picking ray
		const intersects = this.raycaster.intersectObjects(intersectTargets, true);

		// Find the first intersected object that belongs to a player
		let characterIntersect: IExtendedObject3D | null = null;
		for (const intersect of intersects) {
			let obj: IExtendedObject3D = intersect.object;

			// Traverse up to find the player or NPC root
			while (obj) {
				if (obj.isPlayer || obj.isNpc) {
					characterIntersect = obj; // Assign the actual player/NPC object
					break; // Stop traversing since we found the right object
				}
				obj = obj.parent as IExtendedObject3D;
			}

			if (characterIntersect) break; // Stop searching once we find one
		}

		if (!characterIntersect || !this.activeScene) {
			// Remove class
			document.body.classList.remove('cursor-pointer');

			// Reset hovered player and npc when not hovering anymore
			this.hoveredPlayer = null;
			this.hoveredNpc = null;

			return;
		}

		// Attempt to find the hovered player or NPC in a single pass
		const players = this.activeScene.players;
		const npcs = this.activeScene.npcs;

		this.hoveredPlayer = null;
		this.hoveredNpc = null;
		let hoveredPlayerSocketId: string | null = null;

		for (const [socketId, player] of Object.entries(players)) {
			if (player.socketId === characterIntersect.userData['socketId']) {
				if (!player.isCurrent) {
					this.hoveredPlayer = player;
					hoveredPlayerSocketId = socketId;
				}
				break; // Found the player, exit early
			}
		}

		if (!this.hoveredPlayer) {
			for (const npc of npcs) {
				if (npc.username === characterIntersect.name) {
					this.hoveredNpc = npc;
					break; // Found an NPC, exit early
				}
			}
		}

		// Update cursor if needed
		if ((this.hoveredPlayer && this.userId !== hoveredPlayerSocketId) || this.hoveredNpc) {
			document.body.classList.add('cursor-pointer');
		}
	}

	public getModel(
		modelPrefix: ModelPrefix,
		modelId: number,
		spawnPosition: Vector3 = new Vector3(),
		spawnRotation: Quaternion = new Quaternion(),
		spawnScale: Vector3 = new Vector3()
	): Promise<IModelCacheEntry> {
		return new Promise(async (resolve, reject) => {
			if (this.modelCache.has(`${modelPrefix}-${modelId}`)) {
				// Reuse existing model
				const cachedGltf = this.modelCache.get(`${modelPrefix}-${modelId}`)!;

				// Set spawn position and rotation
				cachedGltf.model.position.copy(spawnPosition);
				cachedGltf.model.quaternion.copy(spawnRotation);

				const clonedModel: IExtendedObject3D = clone(cachedGltf.model);
				clonedModel.position.copy(spawnPosition);
				clonedModel.quaternion.copy(spawnRotation);
				clonedModel.scale.copy(spawnScale);

				if (modelPrefix === ModelPrefix.PLAYER) clonedModel.isPlayer = true;
				if (modelPrefix === ModelPrefix.NPC) clonedModel.isNpc = true;

				// Ensure matrix world is updated
				clonedModel.updateMatrixWorld(true);

				// Resolve
				resolve({ model: clonedModel, animations: cachedGltf.animations });

				return;
			}

			try {
				// Load model for first time
				const gltf = await ThreeLoaders.loadGLTF(`/assets/models/${modelPrefix}/${modelId}/scene.gltf`);
				const model: IExtendedObject3D = gltf.scene;

				// Do adjustments
				if (modelPrefix === ModelPrefix.PLAYER) model.isPlayer = true;
				if (modelPrefix === ModelPrefix.NPC) model.isNpc = true;
				model.position.copy(spawnPosition);
				model.quaternion.copy(spawnRotation);
				model.scale.copy(spawnScale);
				model.castShadow = true;
				model.receiveShadow = true;

				// Store in cache
				this.modelCache.set(`${modelPrefix}-${modelId}`, {
					model: model,
					animations: gltf.animations
				});

				// Resolve
				resolve({ model: model, animations: gltf.animations });
			} catch (error) {
				console.error(error);
				reject(new Error('Error loading player model'));
			}
		});
	}

	private animate(): void {
		// Get delta time
		const delta = this.clock.getDelta();

		if (this.activeScene && this.renderer) {
			// Begin stats
			this.stats.begin();

			// Update the active scene
			this.activeScene.update(delta);

			if (this.needsRaycast) {
				// Handle raycaster
				this.handleRaycaster();

				// Set needs raycast
				this.needsRaycast = false;
			}

			// Render the renderer
			this.renderer.render(this.activeScene.scene, this.activeScene.camera);

			// End stats
			this.stats.end();
		}

		// Request new frame
		this.animateFrameId = requestAnimationFrame(this.animate.bind(this));
	}

	private updateSceneCamerasAndRenderSize() {
		this.scenes.forEach((scene) => {
			// Update camera of all scenes
			scene.camera.aspect = window.innerWidth / window.innerHeight;
			scene.camera.updateProjectionMatrix();
		});

		if (this.renderer) {
			// Set canvas size again
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}
	}

	resize(): void {
		this.updateSceneCamerasAndRenderSize();
	}

	onPointerMove(event: PointerEvent) {
		if (!this.pointer) {
			this.pointer = new Vector2();
		}

		// calculate pointer position in normalized device coordinates
		// (-1 to +1) for both components

		this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		// Set needs raycast
		this.needsRaycast = true;
	}

	checkIntersectingPlayer() {
		if (!this.selectedPlayer.value && this.hoveredPlayer) {
			// Set ref so popup modal opens
			this.selectedPlayer.value = this.hoveredPlayer;
		}

		if (this.hoveredNpc && !this.hoveredNpc.isTalking) {
			// Play talking animation
			this.hoveredNpc.startDialog();

			// Dispatch play audio event
			EventService.dispatch(CustomEventKey.PLAY_AUDIO, '/assets/audio/talk.mp3');
		}
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

		// Remove event listeners
		this.removeEventListeners();

		if (this.renderer) {
			// Dispose of the renderer
			this.renderer.dispose();
		}
	}

	setInteractiveState(value: boolean) {
		this.isInteractive = value;
	}
}
