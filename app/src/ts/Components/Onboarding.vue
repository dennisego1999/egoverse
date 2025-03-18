<script setup lang="ts">
import { ref } from 'vue';
import { useAvatarStore } from '../Stores/AvatarStore.ts';
import AvatarOption from './AvatarOption.vue';
import PrimaryButton from './PrimaryButton.vue';
import TextInputField from './TextInputField.vue';

// Define emits
const emit = defineEmits<{
	(e: 'next'): void;
}>();

// Store
const avatarStore = useAvatarStore();

// Set variables
const step = ref(1);

// Define functions
function handleAvatarSelection(id: number) {
	// Select player
	avatarStore.selectAvatar(id);

	// Move to the next step
	step.value = 2;
}
</script>

<template>
	<div class="relative flex h-full w-full items-stretch justify-center overflow-hidden rounded-4xl bg-cyan-400">
		<Transition name="fade-scale" mode="out-in" appear>
			<div v-if="step === 1" class="flex flex-col items-center justify-center gap-12">
				<span class="text-8xl font-bold text-amber-100">
					{{ 'Choose your avatar!' }}
				</span>

				<div class="flex flex-wrap items-center justify-center gap-2">
					<AvatarOption
						v-for="(option, index) in avatarStore.avatars"
						:key="`option-${index + 1}`"
						:asset="option.asset"
						:name="option.name"
						class="cursor-pointer"
						@click="handleAvatarSelection(option.id)"
					/>
				</div>
			</div>

			<div v-else class="flex flex-col items-center justify-center gap-12">
				<span class="text-8xl font-bold text-amber-100">
					{{ 'Enter your username' }}
				</span>

				<form class="flex w-full flex-col items-start justify-center gap-4" @submit.prevent="emit('next')">
					<TextInputField v-model="avatarStore.username" type="text" placeholder="Type username here" class="" />

					<PrimaryButton type="submit"> Confirm </PrimaryButton>
				</form>
			</div>
		</Transition>
	</div>
</template>
