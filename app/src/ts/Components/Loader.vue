<script setup lang="ts">
import PulseLoader from './PulseLoader.vue';
</script>

<template>
	<div class="absolute inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center bg-amber-100">
		<PulseLoader class="h-20 w-20 text-cyan-400" />
	</div>
</template>
