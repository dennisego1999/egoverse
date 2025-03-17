import { Npc } from '../Classes/Npc.ts';
import { Scene } from '../Classes/Scene';
import { faker } from '@faker-js/faker';
import { Player } from '../Classes/Player';
import { SceneKey } from '../Enums/SceneKey';
import { ModelPrefix } from '../Enums/ModelPrefix.ts';
import { SocketEvent } from '../Enums/SocketEvent';
import { Server, Socket } from 'socket.io';
import { ISceneSettings } from '../Interfaces/ISceneSettings';
import { PhysicsObjectShape } from '../Enums/PhysicsObjectShape.ts';
import { Quaternion, Vector3 } from 'three';
import Dialog from '../Classes/Dialog.ts';

export class GameService {
	private static _instance: GameService;
	private io: Server;
	private scenes: Map<SceneKey, Scene> = new Map();
	private readonly MAX_PLAYERS = 100;

	/**
	 * Private constructor to enforce singleton pattern and initialize scenes & sockets.
	 */
	private constructor(io: Server) {
		this.io = io;
		this.initScenes();
		this.setupSocketEvents();
	}

	/**
	 * Ensures the GameService is initialized and returns the instance.
	 */
	public static initialize(io: Server): GameService {
		if (!GameService._instance) {
			GameService._instance = new GameService(io);
		}
		return GameService._instance;
	}

	/**
	 * Returns the existing instance of GameService.
	 * Throws an error if called before initialization.
	 */
	public static getInstance(): GameService {
		if (!GameService._instance) {
			throw new Error('GameService has not been initialized. Call GameService.initialize(io) first.');
		}
		return GameService._instance;
	}

	/**
	 * Initializes game scenes with predefined data.
	 */
	private initScenes() {
		// Define scene settings
		const scenesSettings: Map<SceneKey, ISceneSettings> = new Map();
		scenesSettings.set(SceneKey.FIRST_AREA, {
			environment: {
				modelPrefix: ModelPrefix.ENVIRONMENT,
				modelId: 1,
				spawnScale: new Vector3(0.65, 0.65, 0.65).toArray(),
				spawnPosition: new Vector3(0, -0.2, -10).toArray(),
				spawnRotation: new Quaternion().toArray(),
				physicsObjects: [
					{ name: 'Statue', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar1', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar2', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar3', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar4', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar5', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar6', shape: PhysicsObjectShape.BOX },
					{ name: 'Pillar7', shape: PhysicsObjectShape.BOX }
				]
			}
		});
		scenesSettings.set(SceneKey.SECOND_AREA, {
			environment: {
				modelPrefix: ModelPrefix.ENVIRONMENT,
				modelId: 2,
				spawnScale: new Vector3(1, 1, 1).toArray(),
				spawnPosition: new Vector3(0, 0, 0).toArray(),
				spawnRotation: new Quaternion().toArray(),
				physicsObjects: [
					{ name: 'Bbq', shape: PhysicsObjectShape.BOX },
					{ name: 'Car', shape: PhysicsObjectShape.BOX },
					{ name: 'Chair1', shape: PhysicsObjectShape.BOX },
					{ name: 'Chair2', shape: PhysicsObjectShape.BOX },
					{ name: 'CoolBox', shape: PhysicsObjectShape.BOX },
					{ name: 'Fire', shape: PhysicsObjectShape.SPHERE },
					{ name: 'Tent', shape: PhysicsObjectShape.BOX }
				]
			}
		});
		scenesSettings.set(SceneKey.THIRD_AREA, {
			environment: {
				modelPrefix: ModelPrefix.ENVIRONMENT,
				modelId: 3,
				spawnScale: new Vector3(0.85, 0.85, 0.85).toArray(),
				spawnPosition: new Vector3(0, 0, 0).toArray(),
				spawnRotation: new Quaternion().toArray(),
				physicsObjects: [{ name: 'Robot', shape: PhysicsObjectShape.SPHERE }]
			}
		});

		// Define scene NPC characters with unique dialogs
		const scenesNpcs: Map<SceneKey, Array<Npc>> = new Map();
		scenesNpcs.set(SceneKey.FIRST_AREA, [
			new Npc(
				`NPC ${faker.person.firstName()}`,
				1,
				this.generateUniqueDialog(),
				new Vector3(-2, 0.02, -4.5),
				this.degreesToQuaternion(215)
			),
			new Npc(
				`NPC ${faker.person.firstName()}`,
				2,
				this.generateUniqueDialog(),
				new Vector3(1.5, 0.02, -3.8),
				this.degreesToQuaternion(145)
			)
		]);
		scenesNpcs.set(SceneKey.SECOND_AREA, [
			new Npc(
				`NPC ${faker.person.firstName()}`,
				1,
				this.generateUniqueDialog(),
				new Vector3(1.5, 0.02, -2),
				this.degreesToQuaternion(145)
			)
		]);
		scenesNpcs.set(SceneKey.THIRD_AREA, [
			new Npc(
				`NPC ${faker.person.firstName()}`,
				2,
				this.generateUniqueDialog(),
				new Vector3(0.5, 0.02, -3),
				this.degreesToQuaternion(175)
			)
		]);

		// Create scene instances and store them in the map.
		this.scenes = new Map(
			Object.values(SceneKey).map((key) => {
				const scene = new Scene(key);

				// Add NPCs to the scene
				const npcs = scenesNpcs.get(key) ?? null;
				if (npcs && npcs.length > 0) {
					npcs.forEach((npc) => scene.addNpc(npc));
				}

				// Update scene settings
				const sceneSetting = scenesSettings.get(key) ?? null;
				if (sceneSetting) {
					scene.updateSettings(sceneSetting);
				}

				return [key as SceneKey, scene];
			})
		);
	}

	/**
	 * Generates a unique dialog full of messages.
	 */
	private generateUniqueDialog(): Dialog {
		// Create dialog instance
		const dialog = new Dialog();

		// Generate 2-4 sentences for the dialog
		const messageCount = faker.number.int({ min: 2, max: 4 });
		for (let i = 0; i < messageCount; i++) {
			// Add message to dialog
			dialog.addMessage(faker.lorem.sentence());
		}

		return dialog;
	}

	/**
	 * Sets up WebSocket event listeners for handling client connections.
	 */
	private setupSocketEvents() {
		this.io.on(SocketEvent.CONNECTION, (socket) => this.handleConnection(socket));
	}

	/**
	 * Handles a new player connection, validates input, and assigns a scene.
	 */
	private handleConnection(socket: Socket) {
		console.log(`New connection: ${socket.id}`);

		const username = this.sanitizeInput(socket.handshake.query.username as string);
		const modelId = parseInt(<string>socket.handshake.query.modelId) || 1;
		const sceneKey = (this.sanitizeInput(socket.handshake.query.sceneKey) as SceneKey) || SceneKey.FIRST_AREA;

		// Validate username and scene key.
		if (!username || !sceneKey) {
			socket.emit(SocketEvent.FAILED, { message: 'Invalid credentials' });
			socket.disconnect();
			return;
		}

		// Prevents new connections if the server is at full capacity.
		if (this.io.engine.clientsCount > this.MAX_PLAYERS) {
			socket.emit(SocketEvent.FAILED, { message: 'Server is full' });
			socket.disconnect();
			return;
		}

		// Assigns the player to the specified scene.
		const scene = this.scenes.get(sceneKey)!;
		const player = new Player(socket.id, username, modelId, sceneKey, new Vector3(0, 0.05, 0));
		scene.addPlayer(player);
		socket.join(sceneKey);

		// Sends initialization data to the player.
		socket.emit(SocketEvent.INIT, {
			id: socket.id,
			currentSceneKey: sceneKey,
			scenes: Array.from(this.scenes.values()).map((scene) => ({
				sceneKey: scene.sceneKey,
				settings: scene.settings,
				npcs: scene.npcs
			}))
		});

		// Sets up event listeners for player interactions.
		socket.on(SocketEvent.JOIN_SCENE, (data) => this.handleJoinScene(socket, player, data));
		socket.on(SocketEvent.CLIENT_UPDATE_PLAYER, (data) => this.handlePlayerUpdate(socket, player, data));
		socket.on(SocketEvent.SEND_MESSAGE, (data) => this.handleSendMessage(socket, data));
		socket.on(SocketEvent.TRIGGER_EMOTE, (data) => this.handleTriggerEmote(socket, data));
		socket.on(SocketEvent.FART, (data) => this.handleFart(socket, data));
		socket.on(SocketEvent.DISCONNECT, () => this.handleDisconnect(socket, player));
	}

	/**
	 * Handles player switching to a different scene.
	 */
	private handleJoinScene(socket: Socket, player: Player, data: any) {
		// Sanitize and retrieve the new scene key from the incoming data.
		const newSceneKey = this.sanitizeInput(data.sceneKey) as SceneKey;

		// Check if the new scene key is valid and exists in the scenes map.
		if (!newSceneKey || !this.scenes.has(newSceneKey)) {
			socket.emit(SocketEvent.FAILED, { message: 'Invalid scene' });
			return;
		}

		// Store the old scene key before switching.
		const oldSceneKey = player.sceneKey as SceneKey;

		// Remove the player from the old scene if it exists.
		if (this.scenes.has(oldSceneKey)) {
			const oldScene = this.scenes.get(oldSceneKey)!;

			// Remove player from the old scene.
			oldScene.removePlayer(socket.id);

			// Send the updated scene state to all players in the new scene, not just the newly joined player
			[...oldScene.players.values()].forEach((player) => {
				// Send state to each player with their own `socket.id`
				this.io.to(player.id).emit(SocketEvent.SCENE_STATE, oldScene.getState(player.id));
			});

			// Remove the socket from the old scene's room.
			socket.leave(oldSceneKey);
		}

		// Retrieve the new scene from the scenes map.
		const newScene = this.scenes.get(newSceneKey)!;

		// Update the position and rotation of the player in the new scene to default (center)
		player.updatePositionAndRotation(new Vector3(), new Quaternion());

		// Add the player to the new scene and update their sceneKey.
		newScene.addPlayer(player);

		// Add the player to the new scene's socket room.
		socket.join(newSceneKey);

		// Update the player's scene reference.
		player.sceneKey = newSceneKey;

		// Send the updated scene state to all players in the new scene, not just the newly joined player
		[...newScene.players.values()].forEach((player) => {
			// Send state to each player with their own `socket.id`
			this.io.to(player.id).emit(SocketEvent.SCENE_STATE, newScene.getState(player.id));
		});
	}

	/**
	 * Handles player movement and quaternion updates.
	 */
	private handlePlayerUpdate(socket: Socket, player: Player, data: any) {
		// Check if the scene associated with the player exists
		if (!this.scenes.has(player.sceneKey as SceneKey)) {
			return;
		}

		// Convert websocket data
		const spawnPosition = new Vector3(...data.spawnPosition);
		const spawnRotation = new Quaternion(...data.spawnRotation);

		// Update player position and rotation
		player.updatePositionAndRotation(spawnPosition, spawnRotation);

		// Broadcast the updated player data to all clients in the same scene except the sender
		socket.broadcast.to(player.sceneKey).emit(SocketEvent.CLIENT_UPDATE_PLAYER, data);
	}

	/**
	 * Handles sending messages between players.
	 */
	private handleSendMessage(socket: Socket, data: any) {
		// Destructure the receiver's user ID and message from the incoming data
		const { receiverUserId, message } = data;

		// Validate that both receiverUserId and message exist; return if either is missing
		if (!receiverUserId || !message) {
			return;
		}

		// Send the message to the specified receiver user ID
		this.io.to(receiverUserId).emit(SocketEvent.SEND_MESSAGE, {
			senderUserId: socket.id, // Include sender's socket ID for identification
			message: this.sanitizeInput(message) // Sanitize message before sending to prevent injection attacks
		});
	}

	/**
	 * Handles player emote triggers.
	 */
	private handleTriggerEmote(socket: Socket, data: any) {
		// Broadcast the emote trigger event to all connected clients except the sender
		socket.broadcast.to(data.sceneKey).emit(SocketEvent.TRIGGER_EMOTE, {
			animationName: data.animationName, // Name of the emote animation to be played
			userId: data.avatarUserId // User ID of the player performing the emote
		});
	}

	/**
	 * Handles player fart.
	 */
	private handleFart(socket: Socket, data: any) {
		// Broadcast the fart event to all connected clients except the sender
		socket.broadcast.to(data.sceneKey).emit(SocketEvent.FART, {
			userId: data.userId // User ID of the player performing the fart
		});
	}

	/**
	 * Handles player disconnection.
	 */
	private handleDisconnect(socket: Socket, player: Player) {
		console.log(`Player disconnected: ${socket.id}`);

		// Retrieve the scene the player was in using their scene key
		const scene = this.scenes.get(player.sceneKey as SceneKey);

		// If the scene exists, remove the player from it and notify other players
		if (scene) {
			// Remove the player from the scene
			scene.removePlayer(socket.id);

			// Notify others in the same scene
			this.io.to(player.sceneKey).emit(SocketEvent.SCENE_STATE, scene.getState(socket.id));
		}
	}

	/**
	 * Sanitizes user input to prevent injection attacks.
	 */
	private sanitizeInput(input: any): string {
		// Ensure the input is a string; if not, return an empty string
		if (typeof input !== 'string') {
			return '';
		}

		// Replace HTML special characters to prevent potential XSS attacks
		return input
			.replace(/</g, '&lt;') // Replace '<' with '&lt;' to prevent HTML injection
			.replace(/>/g, '&gt;') // Replace '>' with '&gt;' to prevent HTML injection
			.trim(); // Remove leading and trailing whitespace
	}

	/**
	 * Convert degrees to a quaternion
	 */
	private degreesToQuaternion(degrees: number): Quaternion {
		const angleRad = (degrees * Math.PI) / 180;
		const halfAngle = angleRad / 2;

		// Return the quaternion
		return new Quaternion(0, Math.sin(halfAngle), 0, Math.cos(halfAngle));
	}
}
