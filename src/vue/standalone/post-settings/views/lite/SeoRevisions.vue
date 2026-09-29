<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarSeoRevisions from './sidebar/SeoRevisions'
import MetaboxSeoRevisions from './metabox/SeoRevisions'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxSeoRevisions
			}

			return SidebarSeoRevisions
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarSeoRevisions,
		MetaboxSeoRevisions
	},
	props : {
		parentComponentContext : String
	}
}
</script>