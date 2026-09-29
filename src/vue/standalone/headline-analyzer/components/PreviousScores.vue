<template>
	<accordion
		v-if="previousScores.length"
		:title="strings.previousScores"
		componentClass="aioseo-headline-analyzer-panel-previous-scores"
	>
		<div class="aioseo-headline-analyzer-panel-first-block">
			<ul class="aioseo-headline-analyzer-previous-scores">
				<li
					v-for="item in previousScores"
					:key="item.headline"
					@click.stop="selectHeadline(item.headline)"
				>
					<span class="aioseo-headline-analyzer-score" :class="classOnScore(item.score)">{{ item.score || 'N/A' }}</span>
					<span class="aioseo-headline-analyzer-score-text">{{ decodeHtml(item.headline) }}</span>
				</li>
			</ul>
		</div>
	</accordion>
</template>

<script setup>
import { computed } from 'vue'

import { usePostEditorStore } from '@/vue/stores'
import { useHeadlineAnalyzer } from '@/vue/composables/HeadlineAnalyzer'
import { decodeHtml } from '../assets/js/functions'
import { __ } from '@/vue/plugins/translations'

import Accordion from './partials/Accordion'

const td = import.meta.env.VITE_TEXTDOMAIN

const postEditorStore    = usePostEditorStore()
const { selectHeadline } = useHeadlineAnalyzer()

const strings = {
	previousScores : __('Previous Scores', td)
}

// Every headline scored this session, newest first, minus the one the headline
// editor above is already showing — a previewed headline while the field is
// edited, otherwise the applied post title.
const previousScores = computed(() => {
	const analyzer = postEditorStore.currentPost?.headlineAnalyzer
	const shown    = decodeHtml(analyzer?.newData?.headline || analyzer?.headline || '')

	return (analyzer?.previousHeadlines || [])
		.filter(item => decodeHtml(item.headline) !== shown)
		.reverse()
})

const classOnScore = (score) => {
	if (!score) {
		return 'gray-bg'
	}

	return 40 > score
		? 'red-bg'
		: 70 > score
			? 'orange-bg'
			: 'green-bg'
}
</script>