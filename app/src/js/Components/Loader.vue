<script setup lang="ts">
import PulseLoader from './PulseLoader.vue';
</script>

<template>
	<div class="fixed z-50 inset-0 flex h-[100dvh] w-screen items-center justify-center bg-blue-500">
    <PulseLoader class="h-20 w-20 text-white" />
	</div>
</template>