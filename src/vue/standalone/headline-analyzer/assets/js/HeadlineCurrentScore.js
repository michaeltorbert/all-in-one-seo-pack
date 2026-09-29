import {
	usePostEditorStore
} from '@/vue/stores'
import { headlineAnalyzerApplies } from '@/vue/utils/headlineAnalyzer'
import { fetchData } from './initAnalyzerData'

/**
 * Fetches the headline analysis for the current title and stores the result in the Post Editor store.
 *
 * NOTE: The gate belongs here rather than only at the call sites — the block editor
 * entry re-runs this on every title change, and the analysis language is a per-post
 * setting the user can change without reloading.
 *
 * @returns {Promise<void>}
 */
export async function HeadlineCurrentScore () {
	if (!headlineAnalyzerApplies()) {
		return
	}

	const postEditorStore = usePostEditorStore()
	const response        = await fetchData()

	if (!response?.data) {
		postEditorStore.updatePostHeadlineAnalyzerData({}, '')

		return
	}

	const headlineResult = JSON.parse(response.data[Object.keys(response.data)[0]])
	if (!headlineResult) {
		postEditorStore.updatePostHeadlineAnalyzerData({}, '')

		return
	}

	postEditorStore.updatePostHeadlineAnalyzerData(response.data, response.headline)
	postEditorStore.updateLatestScore(headlineResult.score)
}