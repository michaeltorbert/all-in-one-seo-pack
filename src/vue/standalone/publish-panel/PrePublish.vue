<template>
	<div
		class="aioseo-pre-publish-panel"
		v-if="postEditorStore.currentPost.id"
	>
		<div
			v-if="showScore"
			class="aioseo-pre-publish-panel__hero"
		>
			<div class="aioseo-pre-publish-panel__gauge">
				<svg-seo-site-score
					:score="seoScore"
					:score-color="gaugeColor"
					:stroke-width="3"
				/>

				<span
					class="aioseo-pre-publish-panel__gauge-value"
					:class="'is-' + gaugeColor"
				>
					{{ gaugeLabel }}
				</span>
			</div>

			<div class="aioseo-pre-publish-panel__hero-meta">
				<span class="aioseo-pre-publish-panel__hero-title">{{ summaryText }}</span>

				<span
					v-if="focusKeyword"
					class="aioseo-pre-publish-panel__keyword"
				>
					{{ strings.focusKeyword }}: <strong>{{ focusKeyword }}</strong>
				</span>

				<span
					v-else
					class="aioseo-pre-publish-panel__keyword aioseo-pre-publish-panel__keyword--empty"
				>
					{{ strings.noFocusKeyword }}
				</span>
			</div>
		</div>

		<div
			v-else
			class="aioseo-pre-publish-panel__summary"
		>
			{{ summaryText }}
		</div>

		<base-button
			v-if="showOptimizeCta"
			class="aioseo-pre-publish-panel__optimize"
			type="blue"
			size="medium"
			:loading="truSeoHighlighterStore.optimizingPost"
			:disabled="truSeoHighlighterStore.optimizingPost"
			@click="truSeoHighlighterStore.openOptimizeModal()"
		>
			<svg-ai-content
				v-if="!truSeoHighlighterStore.optimizingPost"
				width="16"
				height="16"
			/>

			{{ strings.optimize }}
		</base-button>

		<div
			v-if="improvements.length"
			class="aioseo-pre-publish-panel__group"
		>
			<div class="aioseo-pre-publish-panel__group-title">{{ strings.improvements }}</div>

			<ul>
				<li
					v-for="check in improvements"
					:key="check.name"
					class="aioseo-pre-publish-panel__check"
					:class="{ 'is-clickable': canFix }"
					@click="openFix(check)"
				>
					<span class="aioseo-pre-publish-panel__check-icon" :class="check.type">
						<component :is="check.icon" />
					</span>

					<span class="aioseo-pre-publish-panel__check-body">
						<span class="aioseo-pre-publish-panel__check-label">{{ check.label }}</span>

						<span
							v-if="check.detail"
							class="aioseo-pre-publish-panel__check-detail"
						>
							{{ check.detail }}
						</span>
					</span>

					<span
						v-if="canFix"
						class="aioseo-pre-publish-panel__fix"
					>
						{{ strings.fix }} <span aria-hidden="true">&rarr;</span>
					</span>
				</li>
			</ul>
		</div>

		<div
			v-if="goodChecks.length"
			class="aioseo-pre-publish-panel__group"
		>
			<div class="aioseo-pre-publish-panel__group-title">{{ strings.good }}</div>

			<ul>
				<li
					v-for="check in goodChecks"
					:key="check.name"
					class="aioseo-pre-publish-panel__check"
				>
					<span class="aioseo-pre-publish-panel__check-icon success">
						<svg-circle-check />
					</span>

					<span class="aioseo-pre-publish-panel__check-body">
						<span class="aioseo-pre-publish-panel__check-label">{{ check.label }}</span>

						<span
							v-if="check.detail"
							class="aioseo-pre-publish-panel__check-detail"
						>
							{{ check.detail }}
						</span>
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

import {
	useOptionsStore,
	usePostEditorStore,
	useSettingsStore,
	useTruSeoHighlighterStore
} from '@/vue/stores'

import { __, _n, sprintf } from '@/vue/plugins/translations'
import { allowed } from '@/vue/utils/AIOSEO_VERSION'
import { isBadResult } from '@/app/tru-seo/scoring/interpreters'
import { isOptimizeSupported } from '@/vue/plugins/tru-seo/optimize-post/editorAdapter'
import { truSeoShouldAnalyze } from '@/vue/utils/postData/helpers'
import { versionCompare } from '@/vue/utils/helpers'

import { useImage } from '@/vue/composables/Image'
import { useTags } from '@/vue/composables/Tags'

import BaseButton from '@/vue/components/common/base/Button'
import SvgAiContent from '@/vue/components/common/svg/ai/AiContent'
import SvgCircleCheck from '@/vue/components/common/svg/circle/Check'
import SvgCircleClose from '@/vue/components/common/svg/circle/Close'
import SvgCircleExclamation from '@/vue/components/common/svg/circle/Exclamation'
import SvgSeoSiteScore from '@/vue/components/common/svg/seo-site-score/Index'

const td = import.meta.env.VITE_TEXTDOMAIN

const optionsStore           = useOptionsStore()
const postEditorStore        = usePostEditorStore()
const settingsStore          = useSettingsStore()
const truSeoHighlighterStore = useTruSeoHighlighterStore()

const { imageUrl, setImageUrl } = useImage()
const { parseTags }             = useTags({ separator: undefined })

const socialImage       = ref(null)
const optimizeSupported = ref(isOptimizeSupported())

const strings = {
	focusKeyword     : __('Focus Keyword', td),
	noFocusKeyword   : __('No focus keyword set', td),
	improvements     : __('Improvements', td),
	good             : __('Good', td),
	fix              : __('Fix', td),
	optimize         : __('Optimize with AI', td),
	allGood          : __('You\'re good to go!', td),
	needsImprovement : __('Your post needs improvement', td),
	visibility       : __('Visibility', td),
	basics           : __('Basics', td),
	readability      : __('Readability', td),
	social           : __('Social', td),
	indexable        : __('Can be indexed by search engines', td),
	notIndexable     : __('Blocked from search engines', td),
	noIssues         : __('No issues found', td),
	missingSocial    : __('Missing social markup', td),
	socialReady      : __('Ready to share', td)
}

const showScore = computed(() => allowed('aioseo_page_analysis') && truSeoShouldAnalyze())

const seoScore   = computed(() => Number.isInteger(postEditorStore.currentPost.seo_score) ? postEditorStore.currentPost.seo_score : 0)
const gaugeLabel = computed(() => 0 === seoScore.value ? 'N/A' : String(seoScore.value))
const gaugeColor = computed(() => 79 < seoScore.value ? 'green' : 49 < seoScore.value ? 'orange' : 'red')

const focusKeyword = computed(() => postEditorStore.truseoData?.focusKeyword || '')

const iconFor = (type) => {
	if ('error' === type) {
		return SvgCircleClose
	}

	if ('warning' === type) {
		return SvgCircleExclamation
	}

	return SvgCircleCheck
}

// The failing checks in a results group, ordered as the analyzer returned them.
const failingResults = (results) => {
	return Object.values(results || {}).filter(item => item?.title && isBadResult(item.score ?? 0))
}

const issuesDetail = (fails) => {
	if (!fails.length) {
		return strings.noIssues
	}

	return sprintf(
		// Translators: 1 - The number of improvements found.
		_n('%1$s improvement', '%1$s improvements', fails.length, td),
		fails.length
	)
}

const isNoindex = computed(() => {
	const postType = postEditorStore.currentPost.postType
	const postTypeOptions = optionsStore.dynamicOptions.searchAppearance.postTypes[postType]

	if (postEditorStore.currentPost.default) {
		return !!(
			postTypeOptions &&
			!postTypeOptions.advanced.robotsMeta.default &&
			postTypeOptions.advanced.robotsMeta.noindex
		)
	}

	return !!postEditorStore.currentPost.noindex
})

const socialEnabled = computed(() =>
	optionsStore.options.social.facebook.general.enable ||
	optionsStore.options.social.twitter.general.enable
)

const socialMarkupMissing = computed(() => {
	const socialTitle       = parseTags(postEditorStore.currentPost.og_title || postEditorStore.currentPost.title || postEditorStore.currentPost.tags.title).trim()
	const socialDescription = parseTags(postEditorStore.currentPost.og_description || postEditorStore.currentPost.description || postEditorStore.currentPost.tags.description).trim()

	return !socialTitle || !socialDescription || !socialImage.value
})

const focusKeywordCheck = () => {
	if (!focusKeyword.value) {
		return {
			name    : 'focusKeyphrase',
			label   : strings.focusKeyword,
			type    : 'warning',
			detail  : strings.noFocusKeyword,
			fixTab  : 'analysis',
			section : 'keywords'
		}
	}

	const fails = failingResults(postEditorStore.truseoData?.truseo?.focus_keyword?.items)

	return {
		name          : 'focusKeyphrase',
		label         : strings.focusKeyword,
		type          : fails.length ? 'warning' : 'success',
		detail        : issuesDetail(fails),
		fixTab        : 'analysis',
		section       : 'keywords',
		expandKeyword : true
	}
}

const checks = computed(() => {
	const list = []

	if (showScore.value) {
		list.push(focusKeywordCheck())
	}

	if (allowed('aioseo_page_advanced_settings')) {
		list.push({
			name   : 'visibility',
			label  : strings.visibility,
			type   : isNoindex.value ? 'error' : 'success',
			detail : isNoindex.value ? strings.notIndexable : strings.indexable,
			fixTab : 'advanced'
		})
	}

	if (showScore.value) {
		const basicFails = failingResults(postEditorStore.truseoData?.truseo?.general?.basic)
		list.push({
			name    : 'basics',
			label   : strings.basics,
			type    : basicFails.length ? 'warning' : 'success',
			detail  : issuesDetail(basicFails),
			fixTab  : 'analysis',
			section : 'basics'
		})

		const readabilityFails = failingResults(postEditorStore.truseoData?.truseo?.general?.readability)
		list.push({
			name    : 'readabilityAnalysis',
			label   : strings.readability,
			type    : readabilityFails.length ? 'warning' : 'success',
			detail  : issuesDetail(readabilityFails),
			fixTab  : 'analysis',
			section : 'readability'
		})
	}

	if (socialEnabled.value && allowed('aioseo_page_social_settings')) {
		list.push({
			name   : 'social',
			label  : strings.social,
			type   : socialMarkupMissing.value ? 'error' : 'success',
			detail : socialMarkupMissing.value ? strings.missingSocial : strings.socialReady,
			fixTab : 'general'
		})
	}

	return list.map(check => ({ ...check, icon: iconFor(check.type) }))
})

const improvements = computed(() => checks.value.filter(check => 'success' !== check.type))
const goodChecks   = computed(() => checks.value.filter(check => 'success' === check.type))

const summaryText = computed(() => improvements.value.length ? strings.needsImprovement : strings.allGood)

const showOptimizeCta = computed(() => showScore.value && optimizeSupported.value && allowed('aioseo_page_ai_content_settings'))

// The fix affordance only appears when the metabox is enabled for this post type,
// since that's where the AIOSEO sidebar tabs the fix jumps to are available.
const canFix = computed(() => {
	const postType = postEditorStore.currentPost.postType

	return !!optionsStore.dynamicOptions.searchAppearance.postTypes[postType]?.advanced?.showMetaBox
})

const openFix = (check) => {
	if (!canFix.value) {
		return
	}

	const { openGeneralSidebar }  = window.wp.data.dispatch('core/edit-post')
	const { closePublishSidebar } = window.wp.data.dispatch(
		versionCompare(window.aioseo.wpVersion, '6.6', '<')
			? 'core/edit-post'
			: 'core/editor'
	)

	closePublishSidebar()
	openGeneralSidebar('aioseo-post-settings-sidebar/aioseo-post-settings-sidebar')

	settingsStore.changeTabSettings({
		setting : 'mainSidebar',
		value   : {
			tab           : check.fixTab,
			section       : check.section,
			expandKeyword : check.expandKeyword
		}
	})
}

onMounted(async () => {
	await setImageUrl()
	socialImage.value = imageUrl.value

	window.aioseoBus.$on('updateSocialImagePreview', (param) => {
		socialImage.value = param.image
	})
})
</script>

<style lang="scss">
.aioseo-pre-publish-panel {
	margin: 8px 0 4px;

	&__hero {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 16px;
	}

	&__gauge {
		position: relative;
		width: 64px;
		height: 64px;
		flex-shrink: 0;

		.aioseo-seo-site-score {
			width: 100%;
			height: 100%;
		}
	}

	&__gauge-value {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: $font-bold;

		&.is-green {
			color: $green;
		}

		&.is-orange {
			color: $orange;
		}

		&.is-red {
			color: $red;
		}
	}

	&__hero-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	&__hero-title {
		font-size: 14px;
		font-weight: $font-bold;
		color: $black;
	}

	&__keyword {
		font-size: 12px;
		color: $black2;
		word-break: break-word;

		strong {
			font-weight: $font-bold;
		}

		&--empty {
			color: $placeholder-color;
		}
	}

	&__summary {
		font-size: 14px;
		font-weight: $font-bold;
		color: $black;
		margin-bottom: 16px;
	}

	&__optimize {
		width: 100%;
		margin-bottom: 16px;

		svg {
			margin-right: 6px;
		}
	}

	&__group {
		& + & {
			margin-top: 16px;
		}

		&-title {
			font-size: 11px;
			font-weight: $font-bold;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: $placeholder-color;
			margin-bottom: 8px;
		}

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}
	}

	&__check {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 6px;
		border-radius: 4px;
		line-height: normal;

		& + & {
			border-top: 1px solid $border;
		}

		&.is-clickable {
			cursor: pointer;

			&:hover {
				background: $background;

				.aioseo-pre-publish-panel__fix {
					color: $blue3;
				}
			}
		}
	}

	&__check-icon {
		flex-shrink: 0;
		line-height: 0;

		svg {
			width: 20px;
			height: 20px;
		}

		&.warning svg {
			color: $orange;
		}

		&.success svg {
			color: $green;
		}

		&.error svg {
			color: $red;
		}
	}

	&__check-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	&__check-label {
		font-size: 13px;
		font-weight: $font-bold;
		color: $black;
	}

	&__check-detail {
		font-size: 12px;
		color: $black2;
		word-break: break-word;
	}

	&__fix {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: $font-bold;
		color: $blue;
		white-space: nowrap;
	}
}
</style>