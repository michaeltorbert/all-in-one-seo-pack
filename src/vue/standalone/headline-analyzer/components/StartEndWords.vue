<template>
	<accordion
		:title="textPanelTitle"
		:componentClass="'aioseo-headline-analyzer-panel-beginning-ending-words'"
	>
		<div class="aioseo-headline-analyzer-panel-first-block">
			<begin-end-words :words="words" />
		</div>
	</accordion>
</template>

<script>
import Accordion from './partials/Accordion'
import BeginEndWords from '@/vue/components/common/core/headline/BeginEndWords'
import { usePostEditorStore } from '@/vue/stores'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	components : {
		Accordion,
		BeginEndWords
	},
	data () {
		return {
			textPanelTitle  : __('Beginning & Ending Words', td),
			postEditorStore : usePostEditorStore()
		}
	},
	computed : {
		currentResult () {
			if (this.postEditorStore.currentPost.headlineAnalyzer?.showNewData) {
				return this.postEditorStore.newHeadlineAnaylzerData.newResult
			}
			const currentResult = this.postEditorStore.currentPost.headlineAnalyzer?.data[Object.keys(this.postEditorStore.currentPost.headlineAnalyzer.data)?.[0]] || null
			return currentResult ? JSON.parse(currentResult) : {}
		},
		words () {
			return this.currentResult.result?.originalExplodedHeadline ? this.currentResult.result.originalExplodedHeadline : []
		}
	}
}
</script>