<template>
	<div class="aioseo-headline-begin-end-words">
		<div
			v-if="beginningWords"
			class="aioseo-headline-begin-end-words__col"
		>
			<div class="aioseo-headline-begin-end-words__label">{{ strings.beginningWords }}</div>
			<div class="aioseo-headline-begin-end-words__value">{{ beginningWords }}</div>
		</div>

		<div
			v-if="endingWords"
			class="aioseo-headline-begin-end-words__col"
		>
			<div class="aioseo-headline-begin-end-words__label">{{ strings.endingWords }}</div>
			<div class="aioseo-headline-begin-end-words__value">{{ endingWords }}</div>
		</div>

		<p
			v-if="!hideGuideline"
			class="aioseo-headline-begin-end-words__guideline"
		>
			{{ strings.guideline }}
		</p>
	</div>
</template>

<script setup>
import { computed } from 'vue'

import { decodeHtml } from '@/vue/standalone/headline-analyzer/assets/js/functions'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	words : {
		type    : Array,
		default : () => []
	},
	hideGuideline : {
		type    : Boolean,
		default : false
	}
})

const strings = {
	beginningWords : __('Beginning Words', td),
	endingWords    : __('Ending Words', td),
	guideline      : __('Most readers only look at the first and last 3 words of a headline before deciding whether to click.', td)
}

const beginningWords = computed(() => decodeHtml(props.words.slice(0, 3).join(' ')))

// Last 3 words once there are enough to not overlap the beginning; for 4-5 word
// headlines, everything after the first 3; nothing for 3 words or fewer.
const endingWords = computed(() => {
	if (6 <= props.words.length) {
		return decodeHtml(props.words.slice(-3).join(' '))
	}

	if (3 < props.words.length) {
		return decodeHtml(props.words.slice(3).join(' '))
	}

	return ''
})
</script>

<style lang="scss">
.aioseo-headline-begin-end-words {
	&__label {
		font-weight: $font-bold;
		color: $black2;
		margin-bottom: 4px;
	}

	&__value {
		color: #434960;
		margin-bottom: 12px;
	}

	&__guideline {
		margin: 0;
		color: #434960;
	}
}
</style>