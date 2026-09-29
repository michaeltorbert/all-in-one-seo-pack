<template>
	<div class="aioseo-ai-content-standalone aioseo-tab-content">
		<core-card
			slug="postSettingsAiContent"
			:noSlide="true"
			:hideHeader="true"
		>
			<ai-content-main
				:parent-component-context="props.parentComponentContext"
			/>

		</core-card>
	</div>
</template>

<script setup>
import AiContentMain from '../partials/ai-content/Main'
import CoreCard from '@/vue/components/common/core/Card'

const props = defineProps({
	parentComponentContext : String
})

</script>