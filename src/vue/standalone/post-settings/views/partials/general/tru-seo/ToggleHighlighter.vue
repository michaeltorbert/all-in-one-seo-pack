<template>
	<label
		v-if="truSeoHighlighterStore.enabled && truSeoHighlighterStore.highlightingEnabled"
		class="tru-seo-toggle-highlighter"
		:class="{ 'tru-seo-toggle-highlighter--disabled': !truSeoHighlighterStore.allowHighlighting }"
	>
		<input
			type="checkbox"
			class="tru-seo-toggle-highlighter__input"
			:checked="isChecked"
			:disabled="!truSeoHighlighterStore.allowHighlighting"
			@change.stop="onToggle()"
		/>

		<span
			class="tru-seo-toggle-highlighter__box"
			:style="isChecked
				? { backgroundColor: assessmentColor, borderColor: assessmentColor }
				: { borderColor: assessmentColor }"
		>
			<svg-checkmark
				v-if="isChecked"
				width="10"
				height="10"
			/>
		</span>
	</label>
</template>

<script setup>
import { computed } from 'vue'

import {
	useTruSeoHighlighterStore
} from '@/vue/stores'

import { getAssessmentAccentColor } from '@/vue/plugins/tru-seo/helpers/assessmentColors'
import SvgCheckmark from '@/vue/components/common/svg/Checkmark'

const props = defineProps({
	analyzer : String
})

const truSeoHighlighterStore = useTruSeoHighlighterStore()

const isChecked = computed(() => {
	return truSeoHighlighterStore.highlightAnalyzers.includes(props.analyzer)
})

const assessmentColor = computed(() => {
	return getAssessmentAccentColor(props.analyzer)
})

const onToggle = () => {
	truSeoHighlighterStore.toggleHighlightAnalyzer(props.analyzer)
}
</script>

<style lang="scss">
.tru-seo-toggle-highlighter {
	cursor: pointer;
	display: inline-flex;
	flex-shrink: 0;

	&--disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	&__input {
		height: 0;
		opacity: 0;
		position: absolute;
		width: 0;

		&:disabled + .tru-seo-toggle-highlighter__box {
			cursor: not-allowed;
		}
	}

	&__box {
		align-items: center;
		background-color: transparent;
		border: 1.5px solid;
		border-radius: 3px;
		cursor: pointer;
		display: inline-flex;
		height: 16px;
		justify-content: center;
		width: 16px;

		svg {
			color: #fff;
		}
	}
}
</style>