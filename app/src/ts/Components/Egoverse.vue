<script setup lang="ts">
import { SceneKey } from '../Enums/SceneKey';
import { AvatarType } from '../Enums/AvatarType.ts';
import { SocketEvent } from '../Enums/SocketEvent.ts';
import { EventService } from '../Services/EventService.ts';
import { ChatRoomScene } from '../Classes/ChatRoomScene';
import { useAvatarStore } from '../Stores/AvatarStore.ts';
import { CustomEventKey } from '../Enums/CustomEventKey.ts';
import { LandingAreaScene } from '../Classes/LandingAreaScene';
import { MeetingRoomScene } from '../Classes/MeetingRoomScene';
import { ExperienceSocket } from '../Classes/ExperienceSocket.ts';
import { ISocketMessageData } from '../Interfaces/ISocketMessageData.ts';
import { onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';
import ExperienceManager from '../Classes/ExperienceManager.ts';
import PrimaryButton from './PrimaryButton.vue';
import Loader from './Loader.vue';
import Modal from './Modal.vue';
import InputField from './InputField.vue';

// Avatar store
const { username, selectedAvatarId } = useAvatarStore();

// Set variables
const chats: Ref<Record<string, Array<{ messages: string; avatarType: string }>>> = ref({});
const currentPlayerMessage: Ref<string> = ref('');
const selectedChatUserId: Ref<string | null> = ref(null);
const isChatModalVisible: Ref<boolean> = ref(false);
const isReady: Ref<boolean> = ref(false);
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const areaButtons: Ref<Record<SceneKey, HTMLElement>> = ref({} as Record<SceneKey, HTMLElement>);

// Define functions
function transitionToScene(sceneKey: SceneKey): void {
	if(areaButtons.value[sceneKey]) {
		// Blur focus button
		areaButtons.value[sceneKey].blur();
	}

	ExperienceManager.instance.setActiveScene(sceneKey);
}

function setReadyState(): void {
	// Set ready state
	isReady.value = true;
}

function submitMessage() {
	if (!ExperienceManager.instance.activeScene) {
		return;
	}

	let visitorId: string | null;

	if(ExperienceManager.instance.selectedAvatar.value) {
		// Get visitor id to send message to via websockets by retrieving it from visitors list/object (keys are the visitor id's)
		visitorId = Object.keys(ExperienceManager.instance.activeScene.visitorAvatars).find(key => {
			return ExperienceManager.instance.activeScene?.visitorAvatars[key]?.model.uuid === ExperienceManager.instance.selectedAvatar.value.model.uuid;
		}) ?? null;
	} else {
		// User has not selected an avatar and openend the chat via the UI => use the ref
		visitorId = selectedChatUserId.value;
	}

	if (visitorId) {
		// Populate first
		if(!chats.value[visitorId]) {
			chats.value[visitorId] = [];
		}

		// Add your message to the chat if it exists with the target visitor
		chats.value[visitorId].push({
			message: currentPlayerMessage.value,
			avatarType: AvatarType.CURRENT_PLAYER
		});

		// Send message to visitor via websocket event
		ExperienceSocket.emit(SocketEvent.SEND_MESSAGE, {
			receiverUserId: visitorId,
			senderUserId: ExperienceManager.instance.userId,
			message: currentPlayerMessage.value
		});
	}

	// Clear type message
	currentPlayerMessage.value = null;

	// Reset hovered avatar
	ExperienceManager.instance.selectedAvatar.value = null;
}

function openChatModal(visitorId: string) {
	// Set refs
	selectedChatUserId.value = visitorId;
	isChatModalVisible.value = true;
}

function closeChatModal() {
	isChatModalVisible.value = false;
	selectedChatUserId.value = null;
}

// Watch
watch(ExperienceManager.instance.selectedAvatar, value => {
	if(!!value) {
		// Get visitor id to send message to via websockets by retrieving it from visitors list/object (keys are the visitor id's)
		const visitorId = Object.keys(ExperienceManager.instance.activeScene.visitorAvatars).find(key => {
			return ExperienceManager.instance.activeScene.visitorAvatars[key].model.uuid === value.model.uuid;
		});

		// Open chat modal
		openChatModal(visitorId);
	}
});

watch(ExperienceManager.instance.incomingVisitorMessageData, (data: ISocketMessageData) => {
	if (data) {
		if (!chats.value[data.senderUserId]) {
			// Create array if not set yet
			chats.value[data.senderUserId] = [];
		}

		chats.value[data.senderUserId].push({
			message: data.message,
			avatarType: AvatarType.VISITOR
		});
	}
});

watch(isChatModalVisible, (newValue, oldValue) => {
	if(newValue && newValue !== oldValue) {
		// Disable interactivity
		ExperienceManager.instance.setInteractiveState(false);

		return;
	}

	// Enable interactivity
	ExperienceManager.instance.setInteractiveState(true);
})

// Lifecycle hooks
onMounted(() => {
	if (canvas.value) {
		// Initialize the experience manager
		ExperienceManager.instance.init(canvas.value, username, selectedAvatarId);

		// Add all scenes to ThreeManager
		ExperienceManager.instance.addScene(SceneKey.LANDING_AREA, new LandingAreaScene(canvas.value, SceneKey.LANDING_AREA));
		ExperienceManager.instance.addScene(SceneKey.MEETING_ROOM, new MeetingRoomScene(canvas.value, SceneKey.MEETING_ROOM));
		ExperienceManager.instance.addScene(SceneKey.CHAT_ROOM, new ChatRoomScene(canvas.value, SceneKey.CHAT_ROOM));

		// Listen for ready event
		EventService.listen(CustomEventKey.READY, setReadyState);
	}
});

onBeforeUnmount(() => {
	if (ExperienceManager.instance) {
		ExperienceManager.instance.destroy();
	}

	// Remove listeners
	EventService.remove(CustomEventKey.READY, setReadyState);
});
</script>

<template>
  <div class="relative">
    <!-- Loader for initialization -->
    <div class="absolute top-5 left-5 z-10 flex justify-center items-center gap-2">
      <Loader v-if="!isReady"/>

      <!-- Scene navigation buttons -->
      <PrimaryButton
          @click="transitionToScene(SceneKey.LANDING_AREA)"
          ref="areaButtons[SceneKey.LANDING_AREA]"
          class="px-4 py-2 bg-green-500 text-white rounded-lg"
      >
        Landing Area
      </PrimaryButton>

      <PrimaryButton
          @click="transitionToScene(SceneKey.MEETING_ROOM)"
          ref="areaButtons[SceneKey.MEETING_ROOM]"
          class="px-4 py-2 bg-red-500 text-white rounded-lg"
      >
        Meeting Room
      </PrimaryButton>

      <PrimaryButton
          @click="transitionToScene(SceneKey.CHAT_ROOM)"
          ref="areaButtons[SceneKey.CHAT_ROOM]"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        Chat Room
      </PrimaryButton>
    </div>

    <!-- Chat list -->
    <Transition name="fade" mode="out-in" appear>
      <div v-if="Object.keys(chats).length > 0" class="absolute bottom-2 left-2 z-10 flex flex-col gap-4 bg-white p-2 rounded-md">
        <div v-for="(chat, visitorId) in chats" :key="visitorId" class="flex flex-col gap-2 bg-yellow-400 p-2 text-white">
          <h3 class="text-lg font-bold text-center">{{ visitorId }}</h3>

          <div
              v-for="(message, index) in chat.messages"
              :key="`message-${index}`"
              :class="{
            'bg-blue-400 text-white': chat.avatarType === AvatarType.VISITOR,
            'bg-green-400 text-white': chat.avatarType === AvatarType.CURRENT_PLAYER
          }"
              class="p-3 rounded-lg max-w-xs mx-auto"
          >
            {{ message }}
          </div>

          <PrimaryButton @click="openChatModal(visitorId)">
            View Chat
          </PrimaryButton>
        </div>
      </div>

      <div v-else class="absolute bottom-2 left-2 z-10 flex flex-col gap-4 bg-white p-2 rounded-md">
        No chats...
      </div>
    </Transition>

    <!-- Chat Modal -->
    <Modal :show="isChatModalVisible" max-width="md" @close="closeChatModal">
      <div class="flex flex-col gap-4 w-full">
        <h2 class="text-2xl font-semibold">Chat with {{ selectedChatUserId }}</h2>

        <Transition name="fade" mode="out-in" appear>
          <TransitionGroup
              v-if="chats[selectedChatUserId] && chats[selectedChatUserId].length > 0"
              name="list"
              tag="ul"
              class="flex flex-col gap-2"
          >
            <li
                v-for="(chat, index) in chats[selectedChatUserId] || []"
                :key="`chat-${index}`"
                :class="{
                'bg-blue-400 text-white text-left': chat.avatarType === AvatarType.VISITOR,
                'bg-green-400 text-white text-right': chat.avatarType === AvatarType.CURRENT_PLAYER
              }"
                class="p-3 rounded-lg"
            >
              {{ chat.message }}
            </li>
          </TransitionGroup>

          <span v-else>No messages...</span>
        </Transition>

        <form @submit.prevent="submitMessage" class="flex flex-col gap-2">
          <InputField v-model="currentPlayerMessage" placeholder="Type message here" type="text" class="w-full" />

          <PrimaryButton type="submit">
            Submit
          </PrimaryButton>
        </form>
      </div>
    </Modal>

    <!-- 3D Canvas -->
    <canvas ref="canvas" class="h-full w-full"/>
  </div>
</template>
