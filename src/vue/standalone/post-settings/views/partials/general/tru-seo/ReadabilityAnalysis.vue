<template>
	<div class="readability-analysis">
		<div class="readability-description">
			<p>
				{{ strings.readabilityDescription }}

				<core-tooltip
					class="readability-description__tooltip"
				>
					<svg-circle-question-mark width="14" />

					<template #tooltip>
						<span class="readability-bands">
							<span class="readability-bands__title">{{ tooltipStrings.title }}</span>

							<span
								v-for="band in readabilityBands"
								:key="band.range"
								class="readability-bands__row"
							>
								<span class="readability-bands__range">{{ band.range }}</span>
								<span class="readability-bands__label">{{ band.label }}</span>
							</span>
						</span>
					</template>
				</core-tooltip>
			</p>

			<hr class="readability-description__divider" />
		</div>

		<transition mode="out-in">
			<metaboxAnalysisDetail
				v-if="postEditorStore.truseoData?.truseo?.general"
				:analysisItems="postEditorStore.truseoData?.truseo?.general?.[initTab]"
				:tab="initTab"
			/>
		</transition>
	</div>
</template>

<script setup>
import { usePostEditorStore } from '@/vue/stores'

import { __ } from '@/vue/plugins/translations'
import { useTruSeoScore } from '@/vue/composables/TruSeoScore'

import CoreTooltip from '@/vue/components/common/core/Tooltip'
import metaboxAnalysisDetail from '../MetaboxAnalysisDetail'
import SvgCircleQuestionMark from '@/vue/components/common/svg/circle/QuestionMark'

const td = import.meta.env.VITE_TEXTDOMAIN

const postEditorStore = usePostEditorStore()

const { strings } = useTruSeoScore()

const tooltipStrings = {
	title : __('How the score maps to readability:', td)
}

const readabilityBands = [
	{ range: '90–100', label: __('Very easy — 5th grade', td) },
	{ range: '80–89', label: __('Easy — 6th grade', td) },
	{ range: '70–79', label: __('Fairly easy — 7th grade', td) },
	{ range: '60–69', label: __('Standard — 8th–9th grade', td) },
	{ range: '50–59', label: __('Fairly difficult — 10th–12th grade', td) },
	{ range: '30–49', label: __('Difficult — college', td) },
	{ range: '0–29', label: __('Very difficult — college graduate', td) }
]

const initTab = 'readability'
</script>

<style lang="scss">
.readability-analysis-card {
	.content {
		padding: 0 !important;
	}

	.readability-description {
		margin-top: 20px;
		padding: 0 20px;

		p {
			color: $black;
			font-size: 14px;
			line-height: 22px;
			margin: 0;
		}

		&__divider {
			width: 100%;
			margin-top: 20px;
			background: $gray;
			height: 1px;
		}

		&__tooltip {
			display: inline-flex;
			margin: 0 0 0 2px;
			vertical-align: middle;
			color: #8c8f9a;

			svg {
				color: inherit;
			}
		}
	}
}

// Rendered inside the tooltip, which teleports to the body-level popper portal,
// so this can't be nested under `.readability-analysis-card`.
.readability-bands {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 220px;
	padding: 2px;
	text-align: left;

	&__title {
		font-weight: 700;
		margin-bottom: 2px;
	}

	&__row {
		display: flex;
		gap: 10px;
	}

	&__range {
		flex: 0 0 52px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	&__label {
		flex: 1;
	}
}
</style>