import { computed, ref } from 'vue'

import { usePostEditorStore } from '@/vue/stores'
import { isClassicEditor, isClassicNoEditor } from '@/vue/utils/context'
import { headlineAnalyzerApplies } from '@/vue/utils/headlineAnalyzer'
import { HeadlineCurrentScore } from '@/vue/standalone/headline-analyzer/assets/js/HeadlineCurrentScore'
import { debounceContext } from '@/vue/standalone/headline-analyzer/assets/js/initAnalyzerData'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

// Shared open-state for the in-sidebar Headline Analyzer panel, which now renders
// on top of the AIOSEO settings sidebar instead of its own WP plugin sidebar.
const headlineAnalyzerOpen = ref(false)

// The sidebar's "Previous Scores" list and the headline editor sit in separate
// component trees, so a pick from the list is published here for the editor to
// load. A fresh object per pick, so picking the same headline twice still notifies.
const headlineSelection = ref(null)

// Single source of truth for the Word Balance verdict and per-category colors so
// the metabox card and the sidebar panel can't drift apart. Power words are a
// soft goal ("at least one"), so a zero count is orange (needs improvement), not
// red like the other categories.
export const getHeadlineWordBalance = (result = {}) => {
	const classes = {
		common    : 0 === result.commonWordsPercentage ? 'red' : 0.2 > result.commonWordsPercentage ? 'orange' : 'green',
		uncommon  : 0 === result.uncommonWordsPercentage ? 'red' : 0.1 > result.uncommonWordsPercentage ? 'orange' : 'green',
		emotional : 0 === result.emotionalWordsPercentage ? 'red' : 0.1 > result.emotionalWordsPercentage ? 'orange' : 'green',
		power     : result.powerWords?.length ? 'green' : 'orange'
	}

	const allGood = Object.values(classes).every(value => 'green' === value)

	return {
		classes,
		verdict      : allGood ? __('All good', td) : __('Needs improvement', td),
		verdictClass : allGood ? 'green' : 'orange'
	}
}

// The metabox tab and the sidebar section both mount the Content Analysis card,
// so guard the initial fetch to run only once across whichever mounts first.
let scoreRequested = false

export const useHeadlineAnalyzer = () => {
	const postEditorStore = usePostEditorStore()

	const headlineAnalyzerEnabled = computed(() => headlineAnalyzerApplies())

	const headlineScore = computed(() => {
		const analyzer = postEditorStore.currentPost?.headlineAnalyzer

		return analyzer?.headline ? (analyzer.latestScore ?? null) : null
	})

	const getHeadlineScoreClass = (score) => {
		if (40 > score) {
			return 'score--red'
		}

		if (70 > score) {
			return 'score--orange'
		}

		return 'score--green'
	}

	// The score lives in the shared Post Editor store but is only populated once
	// the analysis runs. Trigger it so the tab/section have data without the user
	// opening the Headline Analyzer sidebar first.
	//
	// In the block editor, title-change updates come from the analyzer's own
	// wp.data subscription (headline-analyzer/main.js). That entry only loads on
	// enqueue_block_editor_assets, so the Classic editor gets an equivalent
	// listener on the native title field here instead.
	const ensureHeadlineScore = () => {
		if (scoreRequested || !headlineAnalyzerEnabled.value) {
			return
		}

		scoreRequested = true

		HeadlineCurrentScore()

		if (!isClassicEditor() && !isClassicNoEditor()) {
			return
		}

		const titleInput = document.querySelector('#post input#title')
		if (!titleInput) {
			return
		}

		titleInput.addEventListener('input', () => {
			debounceContext(() => {
				if (postEditorStore.currentPost?.headlineAnalyzer?.newData) {
					postEditorStore.toggleShowNewHeadlineAnalyzerPreview(false)
				}

				if (postEditorStore.currentPost?.headlineAnalyzer?.showNewData) {
					postEditorStore.toggleShowNewHeadlineAnalyzerData(false)
				}

				HeadlineCurrentScore()
			}, 2000)
		})
	}

	const openHeadlineAnalyzer = () => {
		headlineAnalyzerOpen.value = true
	}

	const closeHeadlineAnalyzer = () => {
		headlineAnalyzerOpen.value = false
	}

	const selectHeadline = (headline) => {
		headlineSelection.value = { headline }
	}

	return {
		ensureHeadlineScore,
		getHeadlineScoreClass,
		headlineAnalyzerEnabled,
		headlineScore,
		headlineAnalyzerOpen,
		headlineSelection,
		openHeadlineAnalyzer,
		closeHeadlineAnalyzer,
		selectHeadline
	}
}