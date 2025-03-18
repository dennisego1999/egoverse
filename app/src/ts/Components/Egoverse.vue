<script setup lang="ts">
import { SceneKey } from '../Enums/SceneKey';
import { CameraPov } from '../Enums/CameraPov.ts';
import { KeyboardKey } from '../Enums/KeyboardKey.ts';
import { SocketEvent } from '../Enums/SocketEvent.ts';
import { EventService } from '../Services/EventService.ts';
import { useAvatarStore } from '../Stores/AvatarStore.ts';
import { CustomEventKey } from '../Enums/CustomEventKey.ts';
import { ExperienceSocket } from '../Classes/ExperienceSocket.ts';
import { ISocketMessageData } from '../Interfaces/ISocketMessageData.ts';
import { ComponentPublicInstance, onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';
import ExperienceManager from '../Classes/ExperienceManager.ts';
import PrimaryButton from './PrimaryButton.vue';
import Loader from './Loader.vue';
import EmoteSelector from './EmoteSelector.vue';
import KeyboardIcon from './Icons/KeyboardIcon.vue';
import KeybindingsModal from './KeybindingsModal.vue';
import ChatList from './ChatList.vue';
import ChatModal from './ChatModal.vue';
import VolumeIcon from './Icons/VolumeIcon.vue';

// Avatar store
const { username, modelId } = useAvatarStore();

// Set variables
const audio: Ref<HTMLAudioElement | null> = ref(null);
const bgAudio: Ref<HTMLAudioElement | null> = ref(null);
const isBgAudioMuted: Ref<boolean> = ref(true);
const chats: Ref<Record<string, Array<{ message: string; isCurrentPlayer: boolean }>>> = ref({});
const selectedChatUserId: Ref<string | null> = ref(null);
const isChatModalVisible: Ref<boolean> = ref(false);
const isReady: Ref<boolean> = ref(false);
const isEmoteSelectorVisible: Ref<boolean> = ref(false);
const isKeyBindingsModalVisible: Ref<boolean> = ref(false);
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const areaButtons: Ref<Record<SceneKey, HTMLElement>> = ref({} as Record<SceneKey, HTMLElement>);
const keyBindingsData: Ref<Array<{ instruction: string; labels: Array<string>; isCombination: boolean }>> = ref([
	{ instruction: 'Move forward', labels: ['Z', 'Arrow Up'], isCombination: false },
	{ instruction: 'Move backwards', labels: ['S', 'Arrow Down'], isCombination: false },
	{ instruction: 'Move left', labels: ['Q', 'Arrow Left'], isCombination: false },
	{ instruction: 'Move left', labels: ['D', 'Arrow Right'], isCombination: false },
	{ instruction: 'Sprint', labels: ['SHIFT', 'Any movement key'], isCombination: true },
	{ instruction: 'Jump', labels: ['SPACE'], isCombination: true },
	{ instruction: 'Toggle key bindings modal', labels: ['SHIFT', '?'], isCombination: true },
	{ instruction: 'Toggle emote selection', labels: ['T'], isCombination: true },
	{ instruction: 'Toggle camera pov', labels: ['V'], isCombination: true },
	{ instruction: 'Fart', labels: ['F'], isCombination: true }
]);
const keysPressed: { [key in KeyboardKey]: boolean } = {} as {
	[key in KeyboardKey]: boolean;
};

// Define functions
function transitionToScene(sceneKey: SceneKey): void {
	if (areaButtons.value[sceneKey]) {
		// Blur focus button
		areaButtons.value[sceneKey].blur();
	}

	ExperienceManager.instance.setActiveScene(sceneKey);
}

function setReadyState(): void {
	// Set ready state
	isReady.value = true;
}

function playAudio(src: string | undefined) {
	if (!audio.value || !src) {
		return;
	}

	// Set src
	audio.value.src = src;

	// Unmute
	audio.value.muted = false;

	// Reset current time
	audio.value.currentTime = 0;

	// Set audio level
	audio.value.volume = 0.4;

	// Load the audio
	audio.value.load();

	// Play
	audio.value.play();
}

function submitMessage(message: string) {
	if (!ExperienceManager.instance.activeScene) {
		return;
	}

	let visitorId: string | null;

	if (ExperienceManager.instance.selectedPlayer.value) {
		// Get visitor id to send message to via websockets by retrieving it from visitors list/object (keys are the visitor id's)
		visitorId =
			Object.keys(ExperienceManager.instance.activeScene.players).find((key) => {
				return (
					ExperienceManager.instance.activeScene?.players[key]?.model?.uuid ===
					ExperienceManager.instance.selectedPlayer.value?.model?.uuid
				);
			}) ?? null;
	} else {
		// User has not selected an player and opened the chat via the UI => use the ref
		visitorId = selectedChatUserId.value;
	}

	if (visitorId) {
		// Populate first
		if (!Array.isArray(chats.value[visitorId])) {
			chats.value[visitorId] = [];
		}

		// Add your message to the chat if it exists with the target visitor
		chats.value[visitorId]?.push({
			message: message,
			isCurrentPlayer: true
		});

		// Send message to visitor via websocket event
		ExperienceSocket.emit(SocketEvent.SEND_MESSAGE, {
			receiverUserId: visitorId,
			senderUserId: ExperienceManager.instance.userId,
			message: message
		});
	}
}

function openChatModal(visitorId: string) {
	// Set refs
	selectedChatUserId.value = visitorId;
	isChatModalVisible.value = true;
}

function closeChatModal() {
	isChatModalVisible.value = false;
	selectedChatUserId.value = null;
	ExperienceManager.instance.selectedPlayer.value = null;
}

async function onKeyDown(event: KeyboardEvent) {
	// Save pressed key
	keysPressed[event.code as KeyboardKey] = true;

	if (keysPressed[KeyboardKey.KeyF]) {
		// Trigger fart
		await ExperienceManager.instance.activeScene!.currentPlayer!.fart();

		// Sync fart with other players
		ExperienceSocket.emit(SocketEvent.FART, {
			userId: ExperienceManager.instance.userId,
			sceneKey: ExperienceManager.instance.activeScene?.sceneKey
		});

		return;
	}

	if (keysPressed[KeyboardKey.KeyT]) {
		// Set ref
		isEmoteSelectorVisible.value = !isEmoteSelectorVisible.value;

		return;
	}

	if (keysPressed[KeyboardKey.KeyV] && ExperienceManager.instance.activeScene) {
		// Get target pov
		const targetPov =
			ExperienceManager.instance.activeScene.currentCameraPov === CameraPov.THIRD_PERSON
				? CameraPov.FIRST_PERSON
				: CameraPov.THIRD_PERSON;

		// Toggle camera pov
		ExperienceManager.instance.activeScene.setCameraPov(targetPov);

		return;
	}

	if (keysPressed[KeyboardKey.ShiftLeft] && keysPressed[KeyboardKey.KeyM]) {
		// Set ref
		isKeyBindingsModalVisible.value = !isKeyBindingsModalVisible.value;

		return;
	}
}

function onKeyUp(event: KeyboardEvent) {
	// Save pressed key
	keysPressed[event.code as KeyboardKey] = false;
}

function toggleBgMusic() {
	if (!bgAudio.value) {
		return;
	}

	// Toggle muted state
	bgAudio.value.muted = !bgAudio.value.muted;

	// Set ref for reactivity
	isBgAudioMuted.value = bgAudio.value.muted;

	// Play audio
	if (bgAudio.value.paused) {
		bgAudio.value.play();
	}

	// Pause audio
	if (bgAudio.value.muted) {
		bgAudio.value.pause();
	}
}

// Watch
watch(ExperienceManager.instance.selectedPlayer, (value) => {
	if (value && ExperienceManager.instance.activeScene) {
		// Get visitor id to send message to via websockets by retrieving it from visitors list/object (keys are the visitor id's)
		const visitorId = Object.keys(ExperienceManager.instance.activeScene.players).find((key) => {
			return ExperienceManager.instance.activeScene?.players[key]?.model?.uuid === value?.model?.uuid;
		});

		if (visitorId) {
			// Open chat modal
			openChatModal(visitorId);
		}
	}
});

watch(ExperienceManager.instance.incomingVisitorMessageData, (data: ISocketMessageData) => {
	if (data && data.senderUserId && data.message) {
		if (!chats.value[data.senderUserId]) {
			// Create array if not set yet
			chats.value[data.senderUserId] = [];
		}

		chats.value[data.senderUserId]?.push({
			message: data.message,
			isCurrentPlayer: false
		});
	}
});

watch(isChatModalVisible, (newValue, oldValue) => {
	if (newValue && newValue !== oldValue) {
		// Disable interactivity
		ExperienceManager.instance.setInteractiveState(false);

		return;
	}

	// Enable interactivity
	ExperienceManager.instance.setInteractiveState(true);
});

// Lifecycle hooks
onMounted(() => {
	if (canvas.value) {
		// Initialize the experience manager
		ExperienceManager.instance.init(canvas.value, username, modelId);

		// Listen for events
		EventService.listen(CustomEventKey.READY, setReadyState);
		EventService.listen(CustomEventKey.PLAY_AUDIO, playAudio);
		document.addEventListener('keydown', (event: KeyboardEvent) => onKeyDown(event));
		document.addEventListener('keyup', (event: KeyboardEvent) => onKeyUp(event));
	}
});

onBeforeUnmount(() => {
	if (ExperienceManager.instance) {
		ExperienceManager.instance.destroy();
	}

	// Remove listeners
	EventService.remove(CustomEventKey.READY, setReadyState);
	EventService.remove(CustomEventKey.PLAY_AUDIO, playAudio);
	document.removeEventListener('keydown', (event: KeyboardEvent) => onKeyDown(event));
	document.removeEventListener('keyup', (event: KeyboardEvent) => onKeyUp(event));
});
</script>

<template>
	<div class="fixed inset-0 bg-white">
		<div class="absolute top-5 right-5 z-10 flex items-center justify-center gap-2">
			<Loader v-if="!isReady" />

			<PrimaryButton
				:ref="(el) => (areaButtons[SceneKey.FIRST_AREA] = (el as ComponentPublicInstance).$el as HTMLElement)"
				@click="transitionToScene(SceneKey.FIRST_AREA)"
			>
				Altar
			</PrimaryButton>

			<PrimaryButton
				:ref="(el) => (areaButtons[SceneKey.SECOND_AREA] = (el as ComponentPublicInstance).$el as HTMLElement)"
				@click="transitionToScene(SceneKey.SECOND_AREA)"
			>
				Camping Site
			</PrimaryButton>

			<PrimaryButton
				:ref="(el) => (areaButtons[SceneKey.THIRD_AREA] = (el as ComponentPublicInstance).$el as HTMLElement)"
				@click="transitionToScene(SceneKey.THIRD_AREA)"
			>
				Incredibles Battle
			</PrimaryButton>
		</div>

		<ChatList :chats="chats" @open-chat-modal="openChatModal" />

		<ChatModal
			:show="isChatModalVisible"
			:selected-chat-user-id="selectedChatUserId"
			:chats="chats"
			@submit-message="submitMessage"
			@close="closeChatModal"
		/>

		<EmoteSelector :show="isEmoteSelectorVisible" @close="isEmoteSelectorVisible = false" />

		<KeybindingsModal
			:show="isKeyBindingsModalVisible"
			:data="keyBindingsData"
			@close="isKeyBindingsModalVisible = false"
		/>

		<div class="absolute right-2 bottom-2 z-10 flex items-center justify-between gap-2">
			<div class="cursor-pointer rounded-md bg-cyan-400 p-2 shadow-xl" @click="toggleBgMusic">
				<VolumeIcon :is-muted="isBgAudioMuted" class="h-8 w-8 text-white" />
			</div>

			<div class="cursor-pointer rounded-md bg-cyan-400 p-2 shadow-xl" @click="isKeyBindingsModalVisible = true">
				<KeyboardIcon class="h-8 w-8 text-white" />
			</div>
		</div>

		<canvas ref="canvas" class="h-full w-full" />

		<audio ref="audio" muted preload="auto" />

		<audio ref="bgAudio" muted preload="auto" loop src="/assets/audio/bg.mp3"></audio>
	</div>
</template>
