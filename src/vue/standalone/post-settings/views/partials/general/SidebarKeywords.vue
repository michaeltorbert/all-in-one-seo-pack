<template>
	<div class="sidebar-keywords">
		<div class="sidebar-keywords-input">
			<base-input
				v-model="newKeyword"
				size="small"
				:placeholder="strings.enterKeyword"
				:disabled="disableAdditionalKeywords"
				@keydown.enter.prevent="addKeyword(newKeyword)"
			/>

			<base-button
				v-if="!disabledReason"
				type="blue"
				size="small"
				@click="addKeyword(newKeyword)"
			>
				<svg-circle-plus width="14" height="14" />
				{{ strings.addKeyword }}
			</base-button>

			<core-tooltip v-else>
				<span class="add-keyword-button">
					<base-button
						type="blue"
						size="small"
						:disabled="true"
					>
						<svg-circle-plus width="14" height="14" />
						{{ strings.addKeyword }}
					</base-button>
				</span>

				<template #tooltip>
					{{ disabledReason }}
				</template>
			</core-tooltip>
		</div>

		<discover-keywords @navigate="onNavigate" />

		<div
			v-if="0 < keywords.length"
			class="sidebar-keywords-list"
		>
			<core-keyword
				v-for="keyword in paginatedKeywords"
				:key="keyword.id"
				:keyword="keyword"
				:displayItems="keywordActiveId === keyword.id"
				@deleted="onDeleted"
				@toggleItems="toggleItems"
				@setFocus="onSetFocus"
				@updated="onUpdated"
			/>
		</div>

		<!-- Compact pager: the panel is too narrow for the metabox's numbered pages. -->
		<div
			v-if="1 < totalPages"
			class="sidebar-keywords-pager"
		>
			<button
				type="button"
				class="sidebar-keywords-pager__btn sidebar-keywords-pager__btn--prev"
				:disabled="1 === currentPage"
				@click="changePage(currentPage - 1)"
			>
				<svg-caret />
			</button>

			<span class="sidebar-keywords-pager__range">{{ rangeLabel }}</span>

			<button
				type="button"
				class="sidebar-keywords-pager__btn sidebar-keywords-pager__btn--next"
				:disabled="currentPage === totalPages"
				@click="changePage(currentPage + 1)"
			>
				<svg-caret />
			</button>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

import { useLicenseStore, usePostEditorStore } from '@/vue/stores'
import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { useKeywords } from '@/vue/standalone/post-settings/composables/Keywords'
import { useKeywordsPagination } from '@/vue/standalone/post-settings/composables/KeywordsPagination'

import CoreKeyword from '@/vue/components/common/core/Keyword'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import DiscoverKeywords from './DiscoverKeywords'
import SvgCaret from '@/vue/components/common/svg/Caret'
import SvgCirclePlus from '@/vue/components/common/svg/circle/Plus'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const licenseStore = useLicenseStore()
const postEditorStore = usePostEditorStore()

const truSeo = ref(null)
const keywordActiveId = ref(null)
const newKeyword = ref('')

const {
	keywords,
	addKeyword: addKeywordComposable,
	deleteKeyword,
	assignAsFocus,
	updateKeyword,
	disableAdditionalKeywords: disableAdditionalKeywordsComposable
} = useKeywords(truSeo)

const {
	currentPage,
	totalPages,
	paginatedKeywords,
	rangeLabel,
	goToPage,
	goToLastPage,
	goToKeyword
} = useKeywordsPagination(keywords)

const changePage = (page) => {
	// Collapse any open analysis list when moving between pages.
	if (goToPage(page)) {
		keywordActiveId.value = null
	}
}

const disableAdditionalKeywords = computed(() => {
	return disableAdditionalKeywordsComposable.value
})

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

onMounted(async () => {
	truSeo.value = await getTruSeoInstance()
})

const strings = {
	enterKeyword          : __('Enter Keyword', td),
	addKeyword            : __('Add', td),
	delete                : __('Delete', td),
	additionalKeywordsPro : __('Additional keywords are a PRO feature.', td),
	maxAmountReached      : sprintf(
		// Translators: 1 - Number of maximum keywords.
		__('You have reached the maximum of %1$s additional keywords.', td),
		postEditorStore.currentPost.maxAdditionalKeyphrases
	)
}

const toggleItems = (id) => {
	if (keywordActiveId.value === id) {
		keywordActiveId.value = null
		return
	}

	keywordActiveId.value = id
}

// Called by the sidebar Analysis view when the pre-publish panel deep-links to
// the focus keyword, so its analysis items open without the user expanding it.
const expandFocusKeyword = () => {
	const focus = keywords.value.find(keyword => keyword.isFocus)
	if (focus?.hasItems) {
		goToKeyword(focus)
		keywordActiveId.value = focus.id
	}
}

defineExpose({ expandFocusKeyword })

const onDeleted = (keywordId) => {
	const keyword = keywords.value.find(k => k.id === keywordId)
	if (!keyword) {
		return
	}

	newKeyword.value = ''
	deleteKeyword(keyword)
}

const onSetFocus = (keywordId) => {
	const keyword = keywords.value.find(k => k.id === keywordId)
	if (keyword) {
		assignAsFocus(keyword)
	}
}

// Expand the keyword the user clicked from inside the Semrush modal.
const onNavigate = (word) => {
	const needle  = word?.toLowerCase()
	const keyword = keywords.value.find(k => k.word.toLowerCase() === needle)
	if (keyword?.hasItems) {
		goToKeyword(keyword)
		keywordActiveId.value = keyword.id
	}
}

const onUpdated = ({ id, word }) => {
	const keyword = keywords.value.find(k => k.id === id)
	if (keyword) {
		updateKeyword(keyword, word)
	}
}

const addKeyword = (keyword) => {
	if (disableAdditionalKeywords.value) {
		return
	}

	const previousIds = new Set(keywords.value.map(k => k.id))

	addKeywordComposable(keyword)
	newKeyword.value = ''

	const added = keywords.value.find(k => !previousIds.has(k.id))
	if (added) {
		// A new keyword always lands last, so follow it onto the final page.
		goToLastPage()
		keywordActiveId.value = added.id
	}
}
</script>

<style lang="scss">
.sidebar-keywords {
	display: flex;
	flex-direction: column;
	gap: 20px;

	&-input {
		display: flex;
		align-items: center;
		gap: 8px;

		> *:first-child {
			flex: 1 1 auto;
			min-width: 0;
		}

		.aioseo-input-container input {
			min-height: 32px;
		}

		.aioseo-tooltip {
			margin: 0;
			flex-shrink: 0;
		}

		.add-keyword-button {
			display: inline-flex;

			// A disabled <button> swallows hover events, so let them fall
			// through to this wrapper — that's what the tooltip listens on.
			.aioseo-button:disabled {
				pointer-events: none;
			}
		}

		.aioseo-button {
			width: auto;
			flex-shrink: 0;
			gap: 4px;
			white-space: nowrap;
		}
	}

	&-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	&-pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;

		&__range {
			font-size: 12px;
			line-height: 1.3;
			color: $placeholder-color;
		}

		&__btn {
			// This panel also renders on the front-end, where page builder themes style
			// bare buttons, so every visual property has to be restated here. The
			// !important guards match .aioseo-keyword-caret: Divi/Extra global button
			// rules otherwise paint a fill, inflate the box via padding and recolor the arrow.
			appearance: none;
			box-sizing: border-box;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			width: 28px;
			height: 28px;
			min-height: 0;
			margin: 0;
			padding: 0 !important;
			border: 1px solid $input-border !important;
			border-radius: 6px;
			background: $white !important;
			box-shadow: none;
			// Matches the row carets rather than the metabox pager's near-black.
			color: $placeholder-color !important;
			text-transform: none;
			cursor: pointer;

			&:hover:not([disabled]) {
				border-color: $blue !important;
				color: $blue !important;
			}

			&[disabled] {
				opacity: .4;
				cursor: default;
			}

			svg {
				// The caret glyph fills only the middle third of its viewBox, so it needs
				// the same 20px as the row carets to read as an arrow at this size.
				width: 20px !important;
				height: 20px !important;
				color: inherit;
			}

			&--prev svg {
				transform: rotate(90deg);
			}

			&--next svg {
				transform: rotate(-90deg);
			}
		}
	}
}
</style>