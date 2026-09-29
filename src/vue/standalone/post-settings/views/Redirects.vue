<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarRedirects from './sidebar/Redirects'
import MetaboxRedirects from './metabox/Redirects'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxRedirects
			}

			return SidebarRedirects
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarRedirects,
		MetaboxRedirects
	},
	props : {
		parentComponentContext : String
	}
}
</script>