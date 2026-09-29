<template>
	<div class="aioseo-tab-content aioseo-post-advanced sidebar">
		<advanced-main
			parent-component-context="sidebar"
			@changeTab="newTab => $emit('changeTab', newTab)"
		/>
	</div>
</template>

<script setup>
import AdvancedMain from '../partials/advanced/Main'

defineEmits([ 'changeTab' ])
</script>