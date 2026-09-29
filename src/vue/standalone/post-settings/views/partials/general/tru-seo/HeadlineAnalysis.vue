<template>
	<div
		class="aioseo-headline-analysis"
		:class="{ 'aioseo-headline-analysis--compact': compact }"
	>
		<template v-if="hasHeadline">
			<div class="aioseo-headline-analysis__editor">
				<div class="aioseo-headline-analysis__label-row">
					<span class="aioseo-headline-analysis__label">{{ strings.headline }}</span>

					<div
						v-if="compact"
						class="aioseo-headline-analysis__badge aioseo-headline-analysis__badge--outside"
					>
						<span
							v-if="analyzing"
							class="aioseo-headline-analysis__spinner"
						/>

						<template v-else-if="null !== displayScore">
							<span
								class="aioseo-headline-analysis__score"
								:class="getHeadlineScoreClass(displayScore)"
							>{{ displayScore }}</span>

							<span
								v-if="0 !== scoreDiff"
								class="aioseo-headline-analysis__diff"
								:class="0 < scoreDiff ? 'is-up' : 'is-down'"
							>{{ 0 < scoreDiff ? '+' : '−' }}{{ Math.abs(scoreDiff) }}</span>
						</template>
					</div>
				</div>

				<div class="aioseo-headline-analysis__field">
					<base-input
						v-model="editedHeadline"
						type="text"
						size="medium"
						:placeholder="strings.placeholder"
					/>

					<div
						v-if="!compact"
						class="aioseo-headline-analysis__badge"
					>
						<span
							v-if="analyzing"
							class="aioseo-headline-analysis__spinner"
						/>

						<template v-else-if="null !== displayScore">
							<span
								class="aioseo-headline-analysis__score"
								:class="getHeadlineScoreClass(displayScore)"
							>{{ displayScore }}</span>

							<span
								v-if="0 !== scoreDiff"
								class="aioseo-headline-analysis__diff"
								:class="0 < scoreDiff ? 'is-up' : 'is-down'"
							>{{ 0 < scoreDiff ? '+' : '−' }}{{ Math.abs(scoreDiff) }}</span>
						</template>
					</div>
				</div>

				<div class="aioseo-headline-analysis__actions">
					<span class="aioseo-headline-analysis__hint">{{ hint }}</span>

					<div
						v-if="isEdited"
						class="aioseo-headline-analysis__buttons"
					>
						<base-button
							type="gray"
							size="small"
							@click="resetHeadline"
						>
							{{ strings.reset }}
						</base-button>

						<base-button
							type="blue"
							size="small"
							:disabled="analyzing"
							@click="applyHeadline"
						>
							{{ strings.apply }}
						</base-button>
					</div>
				</div>

				<div
					v-if="analyzeError"
					class="aioseo-headline-analysis__error"
					role="alert"
				>
					{{ analyzeError }}
				</div>
			</div>

			<template v-if="!compact && displayResult">
				<hr class="aioseo-headline-analysis__divider" />

				<div class="aioseo-headline-analysis__breakdown">
					<span class="aioseo-headline-analysis__label">{{ strings.breakdown }}</span>

					<core-headline-result :result="displayResult">
						<template #word-balance-extra>
							<div class="aioseo-headline-analysis__begin-end">
								<span class="aioseo-headline-analysis__label aioseo-headline-analysis__begin-end-heading">
									{{ strings.beginEndWords }}

									<core-tooltip>
										<svg-circle-question-mark />

										<template #tooltip>
											{{ strings.beginEndGuideline }}
										</template>
									</core-tooltip>
								</span>

								<core-headline-begin-end-words
									:words="displayResult.originalExplodedHeadline || []"
									hide-guideline
								/>
							</div>
						</template>
					</core-headline-result>
				</div>
			</template>
		</template>

		<p
			v-else
			class="aioseo-headline-analyzer-empty-title-warning"
		>
			{{ strings.emptyTitleWarning }}
		</p>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

import { usePostEditorStore } from '@/vue/stores'
import { useHeadlineAnalyzer } from '@/vue/composables/HeadlineAnalyzer'
import { fetchData } from '@/vue/standalone/headline-analyzer/assets/js/initAnalyzerData'
import { decodeHtml } from '@/vue/standalone/headline-analyzer/assets/js/functions'
import { getPostEditedTitle, setPostEditedTitle } from '@/vue/utils/postData/postTitle'
import { createDebounce } from '@/vue/utils/debounce'
import { __, sprintf } from '@/vue/plugins/translations'

import BaseButton from '@/vue/components/common/base/Button'
import BaseInput from '@/vue/components/common/base/Input'
import CoreHeadlineResult from '@/vue/components/common/core/headline/Result'
import CoreHeadlineBeginEndWords from '@/vue/components/common/core/headline/BeginEndWords'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import SvgCircleQuestionMark from '@/vue/components/common/svg/circle/QuestionMark'

const td = import.meta.env.VITE_TEXTDOMAIN

// compact hides the breakdown + begin/end words (editor + score only), for
// surfaces that render their own analysis detail below the editor.
defineProps({
	compact : {
		type    : Boolean,
		default : false
	}
})

const postEditorStore                              = usePostEditorStore()
const { getHeadlineScoreClass, headlineSelection } = useHeadlineAnalyzer()

const strings = {
	headline          : __('Headline', td),
	placeholder       : __('Write a headline…', td),
	apply             : __('Apply', td),
	reset             : __('Reset', td),
	breakdown         : __('Breakdown', td),
	beginEndWords     : __('Beginning & Ending Words', td),
	beginEndGuideline : __('Most readers only look at the first and last 3 words of a headline before deciding whether to click.', td),
	scoring           : __('Scoring…', td),
	editHint          : __('Edit the headline to preview a new score and compare.', td),
	analyzeFailed     : __('Couldn\'t score that headline. Please try again.', td),
	emptyTitleWarning : __('Write your post title to see the analyzer data. This Headline Analyzer tool enables you to write irresistible SEO headlines that drive traffic, shares, and rank better in search results.', td)
}

// Seed from the editor's current title so a titled post shows the field right
// away, before the async score fetch resolves (avoids an empty-state flash).
const editedHeadline = ref(decodeHtml(getPostEditedTitle() || ''))
const liveResult     = ref(null)
const analyzing      = ref(false)
const analyzeError   = ref('')

// The applied title's analysis, stored keyed by headline with a JSON-string
// value — parsed the same way HeadlineCurrentScore does to get { score, result }.
const parsed = computed(() => {
	const analyzer = postEditorStore.currentPost?.headlineAnalyzer
	if (!analyzer?.headline || !analyzer?.data) {
		return null
	}

	const keys = Object.keys(analyzer.data)
	if (!keys.length || !analyzer.data[keys[0]]) {
		return null
	}

	return JSON.parse(analyzer.data[keys[0]])
})

const appliedTitle = computed(() => decodeHtml(postEditorStore.currentPost?.headlineAnalyzer?.headline || ''))
const appliedScore = computed(() => parsed.value?.score ?? null)
const hasHeadline  = computed(() => '' !== appliedTitle.value || '' !== editedHeadline.value.trim())

const isEdited = computed(() => {
	const value = editedHeadline.value.trim()

	return '' !== value && value !== appliedTitle.value
})

// Show the live result while editing, otherwise the applied title's stored result.
const displayResult = computed(() => (isEdited.value && liveResult.value ? liveResult.value.result : parsed.value?.result) ?? null)
const displayScore  = computed(() => (isEdited.value && liveResult.value ? liveResult.value.score : parsed.value?.score) ?? null)

const scoreDiff = computed(() => {
	if (!isEdited.value || !liveResult.value || null === appliedScore.value) {
		return 0
	}

	return liveResult.value.score - appliedScore.value
})

const hint = computed(() => {
	if (analyzing.value) {
		return strings.scoring
	}

	if (isEdited.value && liveResult.value && null !== appliedScore.value) {
		return sprintf(
			// Translators: 1 - The current post title, 2 - Its headline score.
			__('Edited from “%1$s” (%2$d).', td),
			appliedTitle.value,
			appliedScore.value
		)
	}

	return strings.editHint
})

// Cache scored headlines so retyping a value already seen (or toggling back to
// it) reuses the result instead of hitting the API again.
const resultCache = new Map()

// Every headline scored this session is recorded on the store, so a value picked
// from "Previous Scores" resolves from there even though this component never
// scored it. Stored headlines can be entity-encoded; the field's value isn't.
const getKnownResult = (headline) => {
	if (resultCache.has(headline)) {
		return resultCache.get(headline)
	}

	const recorded = postEditorStore.currentPost?.headlineAnalyzer?.previousHeadlines
		?.find(item => decodeHtml(item.headline) === headline)

	return recorded?.result || null
}

// Re-score the edited headline against the API. Guards against a stale response
// overwriting a newer edit, and never touches the stored/applied score.
const analyzeEdited = async () => {
	const headline = editedHeadline.value.trim()
	if (!headline || headline === appliedTitle.value) {
		liveResult.value = null
		analyzing.value  = false

		return
	}

	const known = getKnownResult(headline)
	if (known) {
		liveResult.value = known
		analyzing.value  = false

		return
	}

	analyzing.value = true

	try {
		const response = await fetchData(headline)

		if (headline !== editedHeadline.value.trim()) {
			return
		}

		if (response?.data) {
			const result = JSON.parse(response.data[Object.keys(response.data)[0]])
			resultCache.set(headline, result)
			liveResult.value = result
		} else {
			analyzeError.value = response?.error || strings.analyzeFailed
			liveResult.value   = null
		}
	} catch (error) {
		analyzeError.value = strings.analyzeFailed
		liveResult.value   = null
	} finally {
		if (headline === editedHeadline.value.trim()) {
			analyzing.value = false
		}
	}
}

const debouncedAnalyze = createDebounce(analyzeEdited, 900)

watch(editedHeadline, () => {
	analyzeError.value = ''

	if (!isEdited.value) {
		liveResult.value = null
		analyzing.value  = false

		return
	}

	// An already-scored headline — retyped, or picked from "Previous Scores" — has
	// nothing to wait for, so skip the debounce and the spinner.
	const known = getKnownResult(editedHeadline.value.trim())
	if (known) {
		debouncedAnalyze.cancel()

		liveResult.value = known
		analyzing.value  = false

		return
	}

	analyzing.value = true
	debouncedAnalyze()
})

// Loading a headline picked from "Previous Scores" into the field is what makes it
// reusable: the score, breakdown and Apply button all key off this value.
watch(headlineSelection, (selection) => {
	if (selection?.headline) {
		editedHeadline.value = decodeHtml(selection.headline)
	}
})

// Mirror the live preview into the shared store so the Headline Analyzer sidebar
// reflects the same edited headline (single source of truth). Cleared when the
// edit is reverted or applied, so both surfaces settle on the applied score
// together. Fires only when the previewed result changes, not on every keystroke.
watch([ isEdited, liveResult ], () => {
	if (isEdited.value && liveResult.value) {
		const headline = editedHeadline.value.trim()

		// Having a score is what earns a headline a place in "Previous Scores";
		// recording it only on apply would hide every headline the user just tried.
		postEditorStore.recordAnalyzedHeadline(headline, liveResult.value)
		postEditorStore.setNewHeadlineAnalyzerPreview({ [headline]: JSON.stringify(liveResult.value) }, headline)

		return
	}

	postEditorStore.clearNewHeadlineAnalyzerPreview()
})

// Seed the field from the applied title, and keep it in sync when the title
// changes elsewhere — but only while the field is untouched, so an in-progress
// edit is never clobbered.
watch(appliedTitle, (title, previous) => {
	if (editedHeadline.value === (previous || '') || '' === editedHeadline.value) {
		editedHeadline.value = title
		liveResult.value     = null
		analyzeError.value   = ''
	}
}, { immediate: true })

const resetHeadline = () => {
	editedHeadline.value = appliedTitle.value
}

const applyHeadline = () => {
	const headline = editedHeadline.value.trim()
	if (!headline || !isEdited.value) {
		return
	}

	setPostEditedTitle(headline)

	// Settle the applied state immediately with the score we already have —
	// applying (unlike trying) is a real commit, so writing it to the store is
	// correct. The title-change subscription re-confirms it a moment later.
	//
	// Looked up by headline rather than read off liveResult: a click that lands
	// before the in-flight score arrives would otherwise store the previously
	// scored headline's result against this one.
	const result = getKnownResult(headline)
	if (result) {
		postEditorStore.updatePostHeadlineAnalyzerData({ [headline]: JSON.stringify(result) }, headline)
		postEditorStore.updateLatestScore(result.score)
	}
}
</script>

<style lang="scss">
.aioseo-headline-analysis {
	&__editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 600px;
	}

	&__divider {
		height: 1px;
		background-color: $border;
		border: 0;
		margin: 24px 0 20px;
	}

	&__breakdown {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	&__begin-end {
		display: flex;
		flex-direction: column;
		flex: 1 0 100%;
		gap: 12px;
		margin: 16px -20px 0;
		padding: 16px 20px 0;
		border-top: 1px solid $gray;

		.aioseo-headline-begin-end-words {
			display: flex;
			gap: 48px;
		}

		.aioseo-headline-begin-end-words__value {
			margin-bottom: 0;
		}
	}

	&__begin-end-heading {
		display: inline-flex;
		align-items: center;
		gap: 6px;

		.aioseo-tooltip {
			margin: 0;
		}

		svg {
			width: 14px;
			height: 14px;
			color: $placeholder-color;
		}
	}

	&__label {
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 11px;
		font-weight: $font-bold;
		color: $placeholder-color;
	}

	&__label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	&__field {
		position: relative;

		.aioseo-input {
			margin: 0;

			input {
				padding-right: 92px;
				font-weight: $font-bold;
			}
		}
	}

	&__badge {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		pointer-events: none;
	}

	// Sidebar: the score sits in the label row, so the input keeps full width.
	&__badge--outside {
		position: static;
		transform: none;
	}

	&--compact &__field .aioseo-input input {
		padding-right: 12px;
	}

	&__score {
		font-size: 18px;
		font-weight: $font-bold;
		font-variant-numeric: tabular-nums;
		line-height: 1;

		&.score--red {
			color: $red;
		}

		&.score--orange {
			color: $orange;
		}

		&.score--green {
			color: $green;
		}
	}

	&__diff {
		display: inline-flex;
		align-items: center;
		font-size: 12px;
		font-weight: $font-bold;
		font-variant-numeric: tabular-nums;
		padding: 2px 8px;
		border-radius: 20px;

		&.is-up {
			color: $green;
			background-color: rgba(0, 170, 99, 0.12);
		}

		&.is-down {
			color: $red;
			background-color: rgba(223, 42, 74, 0.1);
		}
	}

	&__spinner {
		width: 16px;
		height: 16px;
		border: 2px solid $border;
		border-top-color: $black2;
		border-radius: 50%;
		animation: aioseo-headline-spin 0.8s linear infinite;
	}

	&__actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	&__buttons {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	&__hint {
		font-size: 12px;
		color: $placeholder-color;
		line-height: 1.4;
	}

	&__error {
		background-color: rgba(223, 42, 74, 0.08);
		border-radius: 4px;
		color: $red;
		font-size: $font-sm;
		padding: 8px 12px;
	}

	// Group the four metric boxes under one frame with inset dividers between the
	// quadrants, rather than four separate bordered cards. Scoped to this tab so
	// the shared SEO Analyzer page keeps its per-box borders.
	.aioseo-headline-result {
		gap: 0;

		.box--large {
			margin-bottom: 20px;
			border-radius: 8px;
		}

		> .box:nth-child(n+2) {
			position: relative;
			border: 0;
		}

		> .box:nth-child(2) {
			border-top: 1px solid $border;
			border-left: 1px solid $border;
			border-top-left-radius: 8px;
		}

		> .box:nth-child(3) {
			border-top: 1px solid $border;
			border-right: 1px solid $border;
			border-top-right-radius: 8px;
		}

		> .box:nth-child(4) {
			border-bottom: 1px solid $border;
			border-left: 1px solid $border;
			border-bottom-left-radius: 8px;
		}

		> .box:nth-child(5) {
			border-bottom: 1px solid $border;
			border-right: 1px solid $border;
			border-bottom-right-radius: 8px;
		}

		// Inset vertical divider between the columns.
		> .box:nth-child(2)::after,
		> .box:nth-child(4)::after {
			content: '';
			position: absolute;
			right: 0;
			width: 1px;
			background-color: $border;
		}

		> .box:nth-child(2)::after {
			top: 16px;
			bottom: 0;
		}

		> .box:nth-child(4)::after {
			top: 0;
			bottom: 16px;
		}

		// Inset horizontal divider between the rows.
		> .box:nth-child(2)::before,
		> .box:nth-child(3)::before {
			content: '';
			position: absolute;
			bottom: 0;
			height: 1px;
			background-color: $border;
		}

		> .box:nth-child(2)::before {
			left: 16px;
			right: 0;
		}

		> .box:nth-child(3)::before {
			left: 0;
			right: 16px;
		}
	}
}

@keyframes aioseo-headline-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>