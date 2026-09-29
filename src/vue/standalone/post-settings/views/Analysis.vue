<template>
	<component
		:is="currentComponent"
		:disabled="disabled"
		:parentComponentContext="parentComponentContext"
		@changeTab="newTab => $emit('changeTab', newTab)"
	/>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

import SidebarAnalysis from './sidebar/Analysis'
import MetaboxAnalysis from './metabox/Analysis'

defineEmits([ 'changeTab' ])

const props = defineProps({
	disabled : {
		type : Boolean,
		default () {
			return false
		}
	},
	parentComponentContext : String
})

const screenContext = computed(() => {
	return getCurrentInstance().root.data.screenContext
})

const currentComponent = computed(() => {
	// Load metabox component if in metabox context OR if modal is opened
	if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
		return MetaboxAnalysis
	}

	return SidebarAnalysis
})
</script>