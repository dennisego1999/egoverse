<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

// Define emits
const emit = defineEmits<{
	(e: 'click'): void;
}>();

// Define props
defineProps<{
	disabled?: boolean;
	downloadFile?: boolean;
	downloadName?: string;
	method?: string;
	href?: string;
	submit?: boolean;
}>();
</script>

<template>
	<a
		v-if="href && downloadFile"
		:class="[
			'grid cursor-pointer place-content-center rounded-md border border-transparent bg-cyan-600 px-3 py-2 text-xl font-medium text-white shadow-xl transition-colors transition-opacity duration-300 hover:opacity-75 focus:border-white focus:ring-1 focus:ring-white focus:outline-none',
			$attrs['class'],
			{ 'pointer-events-none opacity-30': disabled }
		]"
		:href="href"
		:download="downloadName"
		@click="emit('click')"
	>
		<slot />
	</a>

	<button
		v-else
		:class="[
			'grid cursor-pointer place-content-center rounded-md border border-transparent bg-cyan-600 px-3 py-2 text-xl font-medium text-white shadow-xl transition-colors transition-opacity duration-300 hover:opacity-75 focus:border-white focus:ring-1 focus:ring-white focus:outline-none',
			$attrs['class'],
			{ 'pointer-events-none opacity-30': disabled }
		]"
		@click="emit('click')"
	>
		<input v-if="submit" type="text" class="hidden" />

		<slot />
	</button>
</template>
