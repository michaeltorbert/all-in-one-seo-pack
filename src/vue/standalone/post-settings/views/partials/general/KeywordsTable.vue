<template>
	<div class="keywords-table-wrapper">
		<!-- Combined add + discover/upsell control. -->
		<div class="aioseo-keywords-add">
			<div class="aioseo-keywords-add__top">
				<span class="aioseo-keywords-add__label">{{ addLabel }}</span>
			</div>

			<div class="aioseo-keywords-add__row">
				<base-input
					v-model="newKeyword"
					class="aioseo-keywords-add__input"
					size="medium"
					:placeholder="inputPlaceholder"
					:disabled="disableAdditionalKeywords"
					@keydown.enter.prevent="addKeyword(newKeyword)"
				/>

				<base-button
					v-if="!disabledReason"
					type="blue"
					size="medium"
					class="aioseo-keywords-add__btn"
					@click="addKeyword(newKeyword)"
				>
					<svg-circle-plus
						width="14"
						height="14"
					/>
					{{ strings.addKeyword }}
				</base-button>

				<core-tooltip v-else>
					<span class="add-keyword-button">
						<base-button
							type="blue"
							size="medium"
							class="aioseo-keywords-add__btn"
							:disabled="true"
						>
							<svg-circle-plus
								width="14"
								height="14"
							/>
							{{ strings.addKeyword }}
						</base-button>
					</span>

					<template #tooltip>
						{{ disabledReason }}
					</template>
				</core-tooltip>
			</div>

			<!-- The secondary action only appears once at least one keyword exists. -->
			<discover-keywords @navigate="goToAdditionalKeyphrase" />
		</div>

		<div class="aioseo-keywords-divider" />

		<!-- Empty state: mocked rows behind the card give the panel height and hint at what a
		     keyword unlocks. Decorative only, so hidden from assistive tech. -->
		<div
			v-if="!keywords.length"
			class="aioseo-keywords-empty-wrapper"
		>
			<core-blur aria-hidden="true">
				<div class="aioseo-keywords-empty-preview">
					<div
						v-for="check in previewChecks"
						:key="check"
						class="aioseo-keywords-empty-preview__row"
					>
						<span class="aioseo-keywords-empty-preview__label">{{ check }}</span>
						<span class="aioseo-keywords-empty-preview__pill" />
					</div>
				</div>
			</core-blur>

			<div class="aioseo-keywords-empty">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M20.6 13.4l-6.2 6.2a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3.8 11V4.8A1 1 0 0 1 4.8 3.8H11a2 2 0 0 1 1.4.6l8.2 8.2a2 2 0 0 1 0 2.8z" />
					<circle
						cx="8"
						cy="8"
						r="1.3"
					/>
				</svg>

				<strong>{{ strings.emptyTitle }}</strong>
				<span>{{ isTerm ? strings.emptyDescTerm : strings.emptyDesc }}</span>
			</div>
		</div>

		<!-- Keyword table. -->
		<template v-else>
			<div class="aioseo-keywords-list-scroll">
				<table class="aioseo-keywords-list">
					<thead>
						<tr>
							<th class="col-keyword">{{ strings.keywords }}</th>
							<th class="col-score">{{ strings.score }}</th>
							<th class="col-impr">{{ strings.improvements }}</th>
							<th class="col-act">{{ strings.actions }}</th>
						</tr>
					</thead>

					<tbody>
						<template
							v-for="keyword in paginatedKeywords"
							:key="keyword.id"
						>
							<tr
								class="krow"
								:class="{
									'is-focus'   : keyword.isFocus && 1 < keywords.length,
									'has-detail' : keyword.hasItems
								}"
							>
								<td class="col-keyword">
									<div class="kw-cell">
										<core-tooltip
											:type="keyword.isFocus ? '' : 'action'"
											class="kw-focus"
										>
											<button
												type="button"
												class="kw-radio"
												:class="{ on: keyword.isFocus }"
												@click.stop="onFocusClick(keyword)"
											/>

											<template #tooltip>
												{{ keyword.isFocus ? (isTerm ? strings.focusKeywordTerm : strings.focusKeyword) : strings.assignAsFocus }}
											</template>
										</core-tooltip>

										<input
											v-if="editingId === keyword.id"
											:ref="setEditInput"
											class="kw-name-input"
											:value="keyword.word"
											@click.stop
											@blur="commitEdit(keyword, $event)"
											@keydown.enter="pressEnter"
										/>

										<span
											v-else
											class="kw-name"
											:title="strings.editKeyword"
											@click="startEdit(keyword)"
										>{{ keyword.word }}</span>
									</div>
								</td>

								<td class="col-score">
									<span
										class="kw-score"
										:class="scoreClass(keyword.score)"
									>{{ keyword.score }}</span>
								</td>

								<td class="col-impr">
									<span class="kw-impr">{{ improvementCount(keyword) }}</span>
								</td>

								<td class="col-act">
									<div class="kw-acts">
										<core-tooltip
											type="action"
											offset="-40px,0"
										>
											<a
												href="#"
												class="iact"
												@click.prevent.exact="keywordRankTrackerStore.toggleModal({ modal: 'modalOpenPostEdit', open: true })"
											>
												<svg-statistics
													width="16"
													height="16"
												/>
											</a>

											<template #tooltip>
												{{ strings.openKeywordPerformanceTracker }}
											</template>
										</core-tooltip>

										<core-tooltip type="action">
											<a
												href="#"
												class="iact"
												@click.prevent="startEdit(keyword)"
											>
												<svg-pencil />
											</a>

											<template #tooltip>
												{{ strings.editKeyword }}
											</template>
										</core-tooltip>

										<core-tooltip type="action">
											<a
												href="#"
												class="iact danger"
												@click.prevent="doDelete(keyword)"
											>
												<svg-trash />
											</a>

											<template #tooltip>
												{{ strings.removeKeyword }}
											</template>
										</core-tooltip>

										<!-- expandedId is armed before the analysis produces items, so the
											expanded style needs the same gate as the disabled state. -->
										<button
											type="button"
											class="iact caret"
											:class="{ up: expandedId === keyword.id && keyword.hasItems }"
											:disabled="!keyword.hasItems"
											@click="toggleExpand(keyword)"
										>
											<svg-caret />
										</button>
									</div>
								</td>
							</tr>

							<!-- Always rendered so the panel can slide shut; the slide drops its
								content once closed. -->
							<tr
								v-if="keyword.hasItems"
								class="krow-detail"
							>
								<td colspan="4">
									<transition-slide
										:active="expandedId === keyword.id"
										:duration="300"
									>
										<metabox-analysis-detail :analysisItems="keyword.items" />
									</transition-slide>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>

			<div
				v-if="1 < totalPages"
				class="aioseo-keywords-pager"
			>
				<span class="range">{{ rangeLabel }}</span>

				<div class="pages">
					<button
						type="button"
						class="pg pg-arrow"
						:disabled="1 === currentPage"
						@click="changePage(currentPage - 1)"
					>
						<svg-caret class="prev" />
					</button>

					<button
						v-for="page in totalPages"
						:key="page"
						type="button"
						class="pg"
						:class="{ active: page === currentPage }"
						@click="changePage(page)"
					>{{ page }}</button>

					<button
						type="button"
						class="pg pg-arrow"
						:disabled="currentPage === totalPages"
						@click="changePage(currentPage + 1)"
					>
						<svg-caret class="next" />
					</button>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import {
	useLicenseStore,
	usePostEditorStore,
	useKeywordRankTrackerStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { isBadResult } from '@/app/tru-seo/scoring/interpreters'
import { useKeywords } from '@/vue/standalone/post-settings/composables/Keywords'
import { useKeywordsPagination } from '@/vue/standalone/post-settings/composables/KeywordsPagination'

import BaseButton from '@/vue/components/common/base/Button'
import BaseInput from '@/vue/components/common/base/Input'
import CoreBlur from '@/vue/components/common/core/Blur'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import DiscoverKeywords from './DiscoverKeywords'
import MetaboxAnalysisDetail from './MetaboxAnalysisDetail'
import SvgCaret from '@/vue/components/common/svg/Caret'
import SvgCirclePlus from '@/vue/components/common/svg/circle/Plus'
import SvgStatistics from '@/vue/components/common/svg/Statistics'
import SvgPencil from '@/vue/components/common/svg/Pencil'
import SvgTrash from '@/vue/components/common/svg/Trash'
import TransitionSlide from '@/vue/components/common/transition/Slide'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const licenseStore = useLicenseStore()
const postEditorStore = usePostEditorStore()
const keywordRankTrackerStore = useKeywordRankTrackerStore()

const truSeo = { value: null }
const keywordsComposable = useKeywords(truSeo)

// Hardcoded rather than read from the analysis: they sit behind a 3px blur, so real results would
// only add reactivity and flicker for something nobody can read.
const previewChecks = [
	__('Keyword density', td),
	__('Keyword in SEO title', td),
	__('Keyword in introduction', td),
	__('Keyword in slug', td)
]

const isTerm = computed(() => 'term' === postEditorStore.currentPost.context)

const newKeyword = ref('')
const editingId = ref(null)
const editInputEl = ref(null)
const expandedId = ref(null)
const deleting = ref(false)

const strings = {
	addKeyword                    : __('Add Keyword', td),
	addFocusLabel                 : __('Add a focus keyword', td),
	addAdditionalLabel            : __('Add an additional keyword', td),
	focusPlaceholder              : __('e.g. best running shoes for beginners', td),
	additionalPlaceholder         : __('Add another keyword to target', td),
	proPlaceholder                : __('Additional keywords are a Pro feature', td),
	keywords                      : __('Keywords', td),
	score                         : __('Score', td),
	improvements                  : __('Improvements', td),
	actions                       : __('Actions', td),
	focusKeyword                  : __('Your focus keyword. This is the primary keyword that you want to rank for with this post.', td),
	focusKeywordTerm              : __('Your focus keyword. This is the primary keyword that you want to rank for with this term.', td),
	assignAsFocus                 : __('Assign as Focus Keyword', td),
	editKeyword                   : __('Edit Keyword', td),
	removeKeyword                 : __('Remove Keyword', td),
	openKeywordPerformanceTracker : __('Open Keyword Performance Tracker', td),
	emptyTitle                    : __('No keywords yet', td),
	emptyDesc                     : __('Add your first keyword above to see how well this post targets it.', td),
	emptyDescTerm                 : __('Add your first keyword above to see how well this term targets it.', td),
	additionalKeywordsPro         : __('Additional keywords are a PRO feature.', td),
	maxAmountReached              : sprintf(
		// Translators: 1 - Number of maximum keywords.
		__('You have reached the maximum of %1$s additional keywords.', td),
		postEditorStore.currentPost.maxAdditionalKeyphrases
	)
}

const keywords = computed(() => keywordsComposable.keywords.value)

const {
	currentPage,
	totalPages,
	paginatedKeywords,
	rangeLabel,
	goToPage,
	goToLastPage,
	goToKeyword
} = useKeywordsPagination(keywords)

const isAdditionalKeywordsAvailable = computed(() => keywordsComposable.isAdditionalKeywordsAvailable.value)

const disableAdditionalKeywords = computed(() => keywordsComposable.disableAdditionalKeywords.value)

// Explains why the Add button is disabled; empty while it's enabled.
const disabledReason = computed(() => {
	if (!disableAdditionalKeywords.value) {
		return ''
	}

	if (licenseStore.isUnlicensed) {
		return strings.additionalKeywordsPro
	}

	return strings.maxAmountReached
})

const addLabel = computed(() => keywords.value.length ? strings.addAdditionalLabel : strings.addFocusLabel)

const inputPlaceholder = computed(() => {
	if (disableAdditionalKeywords.value && !isAdditionalKeywordsAvailable.value) {
		return strings.proPlaceholder
	}

	return keywords.value.length ? strings.additionalPlaceholder : strings.focusPlaceholder
})

const changePage = (page) => {
	// Collapse any open analysis row when moving between pages.
	if (goToPage(page)) {
		expandedId.value = null
	}
}

const improvementCount = (keyword) => {
	return Object.values(keyword?.items || {}).filter(item => item.title && isBadResult(item.score)).length
}

const scoreClass = (score) => {
	if (79 < score) return 'score-green'
	if (49 < score) return 'score-orange'
	if (0 < score) return 'score-red'

	return 'score-none'
}

const onFocusClick = (keyword) => {
	if (keyword.isFocus) {
		return
	}

	keywordsComposable.assignAsFocus(keyword)
}

const doDelete = async (keyword) => {
	deleting.value = true
	keywordsComposable.deleteKeyword(keyword)
	deleting.value = false
}

const toggleExpand = (keyword) => {
	if (!keyword?.hasItems) {
		return
	}

	expandedId.value = expandedId.value === keyword.id ? null : keyword.id
}

const addKeyword = (keyword) => {
	if (disableAdditionalKeywords.value) {
		return
	}

	const previousIds = new Set(keywords.value.map(k => k.id))

	keywordsComposable.addKeyword(keyword)
	newKeyword.value = ''

	// Jump to the page holding the new keyword and auto-expand it; its analysis
	// row opens once the re-run populates the keyword's items. The composable
	// rejects blank input and over-limit adds, so page only when one actually lands.
	nextTick(() => {
		const added = keywords.value.find(k => !previousIds.has(k.id))
		if (!added) {
			return
		}

		goToLastPage()
		expandedId.value = added.id
	})
}

// A single ref works because only the row being edited renders the input.
const setEditInput = (el) => {
	if (el) {
		editInputEl.value = el
	}
}

const startEdit = (keyword) => {
	editingId.value = keyword.id
	nextTick(() => {
		editInputEl.value?.focus()
		editInputEl.value?.select()
	})
}

// Empty/duplicate/unchanged values are handled by updateKeyword (empty removes it).
const commitEdit = (keyword, event) => {
	const value = event.target?.value.trim()
	editingId.value = null
	keywordsComposable.updateKeyword(keyword, value)
}

const pressEnter = (event) => {
	event.preventDefault()
	// Blur commits the value through commitEdit (also the leave-focus path).
	event.target.blur()
}

const goToAdditionalKeyphrase = (keyphrase) => {
	const needle  = keyphrase?.toLowerCase()
	const keyword = keywords.value.find(k => k.word.toLowerCase() === needle)
	if (!keyword) {
		return
	}

	goToKeyword(keyword)

	nextTick(() => {
		if (keyword.hasItems) {
			expandedId.value = keyword.id
		}
	})
}

onMounted(async () => {
	// Open the focus keyword by default. Arming this before the analysis produces
	// items is safe; the detail row is gated on hasItems and slides open with it.
	const focusKeyword = keywords.value.find(keyword => keyword.isFocus)
	if (focusKeyword) {
		expandedId.value = focusKeyword.id
	}

	truSeo.value = await getTruSeoInstance()

	// Initialize loading states
	if (postEditorStore.truseoData?.additionalKeywords) {
		postEditorStore.truseoData.additionalKeywords.forEach((_keyphrase, index) => {
			if ('undefined' === typeof postEditorStore.currentPost.loading.additional[index]) {
				postEditorStore.currentPost.loading.additional[index] = false
			}
		})
	}
})
</script>

<style lang="scss">
.keywords-table-wrapper {
	.aioseo-keywords-add {
		&__top {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: 12px;
			margin-bottom: 10px;
		}

		&__label {
			font-size: 13.5px;
			font-weight: 700;
			color: $black;
		}

		&__row {
			display: flex;
			gap: 10px;
			align-items: flex-start;
		}

		&__input {
			flex: 1 1 auto;
			min-width: 0;
		}

		&__btn {
			flex-shrink: 0;
			white-space: nowrap;

			svg {
				margin-right: 6px;
			}
		}

		.add-keyword-button {
			display: inline-flex;

			// A disabled <button> swallows hover events, so let them fall
			// through to this wrapper — that's what the tooltip listens on.
			.aioseo-button:disabled {
				pointer-events: none;
			}
		}

		.aioseo-discover-keywords {
			margin-top: 14px;
		}
	}

	.aioseo-keywords-divider {
		height: 1px;
		background: $border;
		margin: 18px 0 2px;
	}

	.aioseo-keywords-empty-wrapper {
		position: relative;
	}

	.aioseo-keywords-empty-preview {
		padding: 4px 0;

		&__row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 13px 4px;
			border-bottom: 1px solid $border;

			&:last-child {
				border-bottom: 0;
			}
		}

		&__label {
			font-size: 13px;
			color: $black;
		}

		&__pill {
			width: 46px;
			height: 14px;
			border-radius: 7px;
			background: $placeholder-color;
		}
	}

	.aioseo-keywords-empty-wrapper .aioseo-keywords-empty {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: calc(100% - 24px);
		max-width: 360px;
		background: #fff;
		border: 1px solid $border;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		padding: 22px 20px;
	}

	.aioseo-keywords-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 34px 20px;
		color: #64676e;

		svg {
			width: 26px;
			height: 26px;
			color: $placeholder-color;
		}

		strong {
			font-size: 13.5px;
			color: $black;
		}

		span {
			font-size: 12.5px;
			max-width: 44ch;
		}
	}

	.aioseo-keywords-list-scroll {
		overflow-x: auto;
	}

	.aioseo-keywords-list {
		width: 100%;
		border-collapse: collapse;
		min-width: 520px;

		thead th {
			font-size: 11px;
			font-weight: 700;
			letter-spacing: .05em;
			text-transform: uppercase;
			color: $placeholder-color;
			text-align: left;
			padding: 14px 10px 10px;
			border-bottom: 1px solid $border;
			white-space: nowrap;

			&.col-score {
				width: 96px;
			}

			&.col-impr {
				width: 140px;
			}

			&.col-act {
				width: 170px;
			}
		}

		tbody td {
			padding: 0 10px;
			border-bottom: 1px solid $border;
			font-size: 14px;
			vertical-align: middle;
		}

		.krow {
			height: 56px;

			&.is-focus {
				background: rgba($blue, .035);
			}

			// The panel row is always present, so its border would double up with this
			// one. Let it own the separator instead — it keeps the same spot whether the
			// panel is open, closed or mid-slide.
			&.has-detail td {
				border-bottom: 0;
			}
		}

		.kw-cell {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.kw-focus {
			display: inline-flex;
			flex-shrink: 0;
			margin: 0;
		}

		.kw-radio {
			appearance: none;
			box-sizing: border-box;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			border: 2px solid $input-border;
			background: none !important;
			padding: 0 !important;
			flex-shrink: 0;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;

			&:hover {
				border-color: $blue;
			}

			&.on {
				border-color: $blue !important;
				cursor: default;

				&::after {
					content: "";
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background: $blue;
				}
			}
		}

		.kw-name {
			font-size: 14px;
			color: $black;
			cursor: text;

			&:hover {
				text-decoration: underline dotted;
				text-underline-offset: 2px;
			}
		}

		.kw-name-input {
			flex: 1 1 auto;
			min-width: 0;
			padding: 4px 8px;
			border: 1px solid $input-border;
			border-radius: 3px;
			font-size: 14px;
		}

		.kw-score {
			font-size: 14px;
			font-weight: 700;

			&.score-green { color: $green; }

			&.score-orange { color: $orange; }

			&.score-red { color: $red; }

			&.score-none { color: $placeholder-color; }
		}

		.kw-impr {
			font-size: 14px;
			color: $black;
		}

		.kw-acts {
			display: flex;
			align-items: center;
			justify-content: flex-start;
			gap: 6px;

			> .aioseo-tooltip {
				margin: 0;
			}

			.iact {
				width: 30px;
				height: 30px;
				border-radius: 6px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				color: $placeholder-color;
				text-decoration: none;
				cursor: pointer;
				border: 1px solid transparent;
				background: none;

				&:hover {
					background: $box-background;
					color: $black;
				}

				&.danger:hover {
					color: $red;
				}

				&[disabled] {
					opacity: .4;
					cursor: default;

					&:hover {
						background: none;
						color: $placeholder-color;
					}
				}

				svg {
					width: 16px;
					height: 16px;
					color: inherit;
				}
			}

			.caret {
				border-color: $input-border;
				background: $white;
				width: 34px;

				&:hover:not([disabled]) {
					border-color: $blue2;
					background: $white;
					color: $blue2;

					// Needed to outrank `.caret.up svg`, which pins the icon white for the
					// expanded state's blue fill that hover replaces with a white one.
					svg {
						color: $blue2;
					}
				}

				svg {
					width: 18px;
					height: 18px;
					transition: transform .2s ease;
				}

				&.up {
					background: $blue;
					border-color: $blue;

					svg {
						transform: rotate(180deg);
						color: #fff;
					}
				}
			}
		}

		.krow-detail {
			td {
				padding: 0;
				background: $white;
			}

			.aioseo-analysis-detail {
				padding: 12px 8px;
			}
		}
	}

	.aioseo-keywords-pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding: 14px 2px 2px;

		.range {
			font-size: 12.5px;
			color: $placeholder-color;
		}

		.pages {
			display: flex;
			align-items: center;
			gap: 4px;
		}

		.pg {
			min-width: 30px;
			height: 30px;
			padding: 0 8px;
			border-radius: 6px;
			border: 1px solid $input-border;
			background: $white;
			color: $black;
			font-size: 13px;
			font-weight: 600;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;

			&:hover:not([disabled]):not(.active) {
				border-color: $blue;
				color: $blue;
			}

			&.active {
				background: $blue;
				border-color: $blue;
				color: $white;
				cursor: default;
			}

			&[disabled] {
				opacity: .4;
				cursor: default;
			}

			svg {
				width: 14px;
				height: 14px;

				&.prev { transform: rotate(90deg); }

				&.next { transform: rotate(-90deg); }
			}
		}
	}
}
</style>