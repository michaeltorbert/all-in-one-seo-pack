<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
		@changeTab="newTab => $emit('changeTab', newTab)"
	/>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

import SidebarAdvanced from './sidebar/Advanced'
import MetaboxAdvanced from './metabox/Advanced'

defineEmits([ 'changeTab' ])

const props = defineProps({
	parentComponentContext : String
})

const screenContext = computed(() => {
	return getCurrentInstance().root.data.screenContext
})

const currentComponent = computed(() => {
	// Load metabox component if in metabox context OR if modal is opened
	if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
		return MetaboxAdvanced
	}

	return SidebarAdvanced
})
</script>