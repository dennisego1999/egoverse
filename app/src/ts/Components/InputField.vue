<script setup lang="ts">
import { onMounted, ref } from 'vue';

// Define emits
defineEmits(['update:modelValue']);

// Define props
defineProps({
	modelValue: [String, Boolean],
	type: String,
	disabled: Boolean,
	required: {
		type: Boolean,
		default: false
	}
});

// Set variables
const input = ref(null);

// Life cycles
onMounted(() => {
	if (input.value.hasAttribute('autofocus')) {
		input.value.focus();
	}
});

// Define expose
defineExpose({ focus: () => input.value.focus() });
</script>

<template>
	<input
		ref="input"
		class="shadow-bottom-right h-10 min-h-10 rounded-md border-2 border-amber-100 bg-white text-ellipsis placeholder-black focus:ring-cyan-600 focus:outline-none lg:rounded-lg"
		:class="{
			'p-4': type === 'file',
			'opacity-25': disabled,
			'px-2 text-black focus:border-cyan-600': type !== 'checkbox',
			'cursor-pointer text-cyan-600': type === 'checkbox'
		}"
		:value="type !== 'file' ? modelValue : null"
		:checked="type === 'checkbox' ? modelValue : false"
		:type="type"
		:disabled="disabled"
		:required="required"
		@input="$emit('update:modelValue', type !== 'checkbox' ? $event.target.value : !!input.checked)"
	/>
</template>
