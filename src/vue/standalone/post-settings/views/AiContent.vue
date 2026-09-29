<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarAiContent from './sidebar/AiContent'
import MetaboxAiContent from './metabox/AiContent'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxAiContent
			}

			return SidebarAiContent
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarAiContent,
		MetaboxAiContent
	},
	props : {
		parentComponentContext : String
	}
}
</script>

<style lang="scss">
.aioseo-app.aioseo-post-settings .aioseo-ai-content-standalone {
	.settings-name .name {
		flex-direction: column;
		align-items: flex-start;
		margin-bottom: 10px;
	}

	> .aioseo-blur {
		min-height: 650px;
	}

	.aioseo-cta .aioseo-ai-credit-counter {
		> .counter-container-wrapper {
			justify-content: center;
		}
	}
}
</style>