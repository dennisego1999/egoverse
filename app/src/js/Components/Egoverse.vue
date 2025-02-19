<script setup lang="ts">
import { SceneKey } from '../Enums/SceneKey';
import { EventService } from '../Services/EventService.ts';
import { ChatRoomScene } from '../Classes/ChatRoomScene';
import { CustomEventKey } from '../Enums/CustomEventKey.ts';
import { LandingAreaScene } from '../Classes/LandingAreaScene';
import { MeetingRoomScene } from '../Classes/MeetingRoomScene';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ExperienceManager from '../Classes/ExperienceManager.ts';
import PrimaryButton from './PrimaryButton.vue';
import Loader from './Loader.vue';

// Set variables
const isReady = ref<boolean>(false);
const canvas = ref<HTMLCanvasElement | null>(null);

// Define functions
function transitionToScene(sceneKey: SceneKey): void {
	ExperienceManager.instance.setActiveScene(sceneKey);
}

function setReadyState(): void {
	// Set ready state
	isReady.value = true;
}

// Lifecycle hooks
onMounted(() => {
	if (canvas.value) {
		// Initialize the experience manager
		ExperienceManager.instance.init(canvas.value);

		// Add all scenes to ThreeManager
		ExperienceManager.instance.addScene(SceneKey.LANDING_AREA, new LandingAreaScene(canvas.value, SceneKey.LANDING_AREA));
		ExperienceManager.instance.addScene(SceneKey.MEETING_ROOM, new MeetingRoomScene(canvas.value, SceneKey.MEETING_ROOM));
		ExperienceManager.instance.addScene(SceneKey.CHAT_ROOM, new ChatRoomScene(canvas.value, SceneKey.CHAT_ROOM));

		// Initially set the default active scene
		ExperienceManager.instance.setActiveScene(SceneKey.LANDING_AREA);

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
  <div class="absolute top-5 left-5 z-10 flex justify-center items-center gap-2">
    <Loader v-if="!isReady"/>

    <PrimaryButton
        @click="transitionToScene(SceneKey.LANDING_AREA)"
        class="px-4 py-2 bg-green-500 text-white rounded-lg"
        :disabled="ExperienceManager.instance.isTransitioning.value || ExperienceManager.instance.activeScene?.sceneKey === SceneKey.LANDING_AREA"
    >
      Landing Area
    </PrimaryButton>

    <PrimaryButton
        @click="transitionToScene(SceneKey.MEETING_ROOM)"
        :disabled="ExperienceManager.instance.isTransitioning.value || ExperienceManager.instance.activeScene?.sceneKey === SceneKey.MEETING_ROOM"
        class="px-4 py-2 bg-red-500 text-white rounded-lg"
    >
      Meeting Room
    </PrimaryButton>

    <PrimaryButton
        @click="transitionToScene(SceneKey.CHAT_ROOM)"
        :disabled="ExperienceManager.instance.isTransitioning.value || ExperienceManager.instance.activeScene?.sceneKey === SceneKey.CHAT_ROOM"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
      Chat Room
    </PrimaryButton>
  </div>

  <canvas ref="canvas" class="h-full w-full"/>
</template>
