import { computed } from 'vue'

import {
	usePostEditorStore,
	useLicenseStore,
	useRootStore
} from '@/vue/stores'

import { cleanForSlug } from '@/vue/utils/cleanForSlug'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { hasAnalysisItems } from '@/app/tru-seo/helpers/resultsFilter'
import { additionalKeywordLimitReached } from '@/vue/utils/postData/helpers'

/**
 * Composable for managing keywords (focus and additional) in post editor
 *
 * @since 5.0.0
 * @param {Object} truSeoRef - Vue ref containing the TruSeo instance
 * @returns {Object} Keywords management functions and computed properties
 */
export const useKeywords = (truSeoRef) => {
	const postEditorStore = usePostEditorStore()
	const licenseStore = useLicenseStore()
	const rootStore = useRootStore()

	/**
	 * Computed property that returns all keywords (focus + additional) with normalized structure
	 *
	 * @since 5.0.0
	 * @returns {Array} Array of keyword objects with id, word, score, items, and isFocus properties
	 */
	const keywords = computed(() => {
		const keywordsList = []

		// Add focus keyword
		const focusWord     = postEditorStore.truseoData?.focusKeyword
		const focusAnalysis = postEditorStore.truseoData?.truseo?.focus_keyword
		if (focusWord) {
			keywordsList.push({
				id       : cleanForSlug(`focus-keyword-${focusWord}`),
				word     : focusWord,
				score    : focusAnalysis?.score || 0,
				items    : focusAnalysis?.items,
				hasItems : hasAnalysisItems(focusAnalysis?.items),
				isFocus  : true
			})
		}

		// Add additional keywords
		if (postEditorStore.truseoData?.additionalKeywords?.length && isAdditionalKeywordsAvailable.value) {
			postEditorStore.truseoData.additionalKeywords.forEach((keyword) => {
				keywordsList.push({
					id       : cleanForSlug(`additional-keyword-${keyword.word}`),
					word     : keyword.word,
					score    : keyword.score || 0,
					items    : keyword.items,
					hasItems : hasAnalysisItems(keyword.items),
					isFocus  : false
				})
			})
		}

		return keywordsList
	})

	/**
	 * Computed property that returns true if any of the additional keywords is loading
	 *
	 * @since 5.0.0
	 * @returns {boolean} True if any of the additional keywords is loading, false otherwise
	 */
	const keywordsIsLoading = computed(() => {
		return postEditorStore?.currentPost?.loading?.focus || postEditorStore?.currentPost?.loading?.additional?.some(loading => loading)
	})

	/**
	 * Computed property that returns true if the additional keywords are disabled
	 *
	 * @since 5.0.0
	 * @returns {boolean} True if the additional keywords are disabled, false otherwise
	 */
	const disableAdditionalKeywords = computed(() => {
		const additionalCount = postEditorStore.truseoData?.additionalKeywords?.length || 0
		return (1 <= keywords.value.length && licenseStore.isUnlicensed) ||
			(!licenseStore.isUnlicensed && additionalKeywordLimitReached(postEditorStore.currentPost.maxAdditionalKeyphrases, additionalCount))
	})

	/**
	 * Computed property that returns true if the additional keywords are available
	 *
	 * @since 5.0.0
	 * @returns {boolean} True if the additional keywords are available, false otherwise
	 */
	const isAdditionalKeywordsAvailable = computed(() => {
		return rootStore.isPro && licenseStore.license.isActive
	})

	/**
	 * Adds a new keyword to the post
	 * If no focus keyword exists, sets it as focus, otherwise adds as additional keyword
	 *
	 * @since 5.0.0
	 * @param {string} keyword - The keyword text to add
	 * @returns {void}
	 */
	const addKeyword = (keyword) => {
		keyword = keyword.trim()
		if (!keyword) {
			return
		}

		// If no focus keyword exists, add as focus
		if (!postEditorStore.truseoData?.focusKeyword) {
			postEditorStore.currentPost.loading.focus = true

			postEditorStore.currentPost.focus_keyword = keyword

			postEditorStore.currentPost.truseo = {
				...(postEditorStore.currentPost.truseo || {}),
				focus_keyword : { score: 0, items: null }
			}

			// Keep the old keyphrase for backward compatibility
			postEditorStore.currentPost.keyphrases.focus = {
				keyphrase : keyword,
				score     : 0,
				analysis  : {}
			}
		} else if (isAdditionalKeywordsAvailable.value) {
			// Add as additional keyword
			if (additionalKeywordLimitReached(postEditorStore.currentPost.maxAdditionalKeyphrases, postEditorStore.truseoData?.additionalKeywords?.length || 0)) {
				return
			}

			// additional_keywords defaults to null on a post that never had any, so initialize before pushing.
			if (!postEditorStore.currentPost.keyphrases.additional) {
				postEditorStore.currentPost.keyphrases.additional = []
			}

			if (!postEditorStore.currentPost.additional_keywords) {
				postEditorStore.currentPost.additional_keywords = []
			}

			// Keep the old keyphrase for backward compatibility
			postEditorStore.currentPost.keyphrases.additional.push({
				keyphrase : keyword,
				score     : 0
			})

			const newKeyphraseIndex = postEditorStore.currentPost.additional_keywords.push({
				word  : keyword,
				score : 0
			})

			const actualIndex = newKeyphraseIndex - 1
			postEditorStore.currentPost.loading.additional[actualIndex] = true
		}

		runAnalysis()
	}

	/**
	 * Deletes a keyword from the post
	 * Handles both focus and additional keywords
	 *
	 * @since 5.0.0
	 * @param {Object} keyword - The keyword object to delete (must have isFocus and word properties)
	 * @returns {void}
	 */
	const deleteKeyword = (keyword) => {
		if (!keyword) {
			return
		}

		if (keyword.isFocus) {
			// Promote the next keyword (first additional row) to focus so the post
			// isn't left focus-less while other keywords remain.
			const additional            = isAdditionalKeywordsAvailable.value ? (postEditorStore.truseoData?.additionalKeywords || []) : []
			const [ nextFocus, ...rest ] = additional

			if (nextFocus) {
				postEditorStore.currentPost.focus_keyword = nextFocus.word
				postEditorStore.currentPost.truseo = {
					...(postEditorStore.currentPost.truseo || {}),
					focus_keyword : { score: 0, items: null }
				}
				postEditorStore.currentPost.keyphrases.focus = {
					keyphrase : nextFocus.word,
					score     : 0,
					analysis  : {}
				}
				postEditorStore.currentPost.additional_keywords = rest.map(k => ({ word: k.word, score: k.score }))
				postEditorStore.currentPost.keyphrases.additional = rest.map(k => ({ keyphrase: k.word, score: k.score }))
			} else {
				postEditorStore.currentPost.focus_keyword = ''
				if (postEditorStore.currentPost.truseo) {
					postEditorStore.currentPost.truseo = {
						...postEditorStore.currentPost.truseo,
						focus_keyword : null
					}
				}
				postEditorStore.currentPost.keyphrases.focus = null
			}
		} else if (isAdditionalKeywordsAvailable.value) {
			const { word } = keyword
			const additionalKeywords = postEditorStore.truseoData?.additionalKeywords.filter(k => k.word !== word.trim())

			postEditorStore.currentPost.additional_keywords = additionalKeywords.map(k => ({ word: k.word, score: k.score }))
			postEditorStore.currentPost.keyphrases.additional = additionalKeywords.map(k => ({ keyphrase: k.word, score: k.score }))
		}

		runAnalysis()
	}

	/**
	 * Assigns an additional keyword as the new focus keyword
	 * The current focus keyword (if exists) is moved to additional keywords
	 *
	 * @since 5.0.0
	 * @param {Object} keyword - The keyword object to assign as focus
	 * @returns {void}
	 */
	const assignAsFocus = (keyword) => {
		if (!keyword || keyword.isFocus) {
			return
		}

		postEditorStore.currentPost.loading.focus = true

		// Move current focus keyword to additional keywords if it exists
		const currentFocusWord = postEditorStore.truseoData?.focusKeyword
		if (currentFocusWord) {
			// Keep the old keyphrase for backward compatibility
			postEditorStore.currentPost.keyphrases.additional.push({
				keyphrase : currentFocusWord,
				score     : 0
			})

			postEditorStore.currentPost.additional_keywords.push({
				word  : currentFocusWord,
				score : 0
			})
		}

		// Remove the keyword from additional keywords
		const additionalKeywords = postEditorStore.truseoData?.additionalKeywords?.filter(
			k => k.word.trim() !== keyword.word.trim()
		) || []

		postEditorStore.currentPost.additional_keywords = additionalKeywords.map(k => ({ word: k.word, score: k.score }))
		// Keep the old keyphrase for backward compatibility
		postEditorStore.currentPost.keyphrases.additional = additionalKeywords.map(k => ({ keyphrase: k.word, score: k.score }))

		// Set the keyword as new focus keyword
		postEditorStore.currentPost.focus_keyword = keyword.word
		postEditorStore.currentPost.truseo = {
			...(postEditorStore.currentPost.truseo || {}),
			focus_keyword : { score: 0, items: null }
		}

		// Keep the old keyphrase for backward compatibility
		postEditorStore.currentPost.keyphrases.focus = {
			keyphrase : keyword.word,
			score     : 0,
			analysis  : {}
		}

		runAnalysis()
	}

	/**
	 * Runs the TruSEO analysis
	 *
	 * @since 5.0.0
	 * @returns {void}
	 */
	const runAnalysis = () => {
		postEditorStore.isDirty = true

		setTimeout(async () => {
			try {
				const results = await truSeoRef?.value?.runAnalysis({
					postId   : postEditorStore.currentPost.id,
					postData : postEditorStore.currentPost
				})

				if (results) {
					updateStoreWithResults(results)
				}

				postEditorStore.currentPost.loading.focus = false
				postEditorStore.currentPost.loading.additional = postEditorStore.currentPost.loading.additional.map((_loading) => false) // eslint-disable-line no-unused-vars
			} catch (error) {
				console.error('TruSEO analysis failed:', error)
				postEditorStore.currentPost.loading.focus = false
				postEditorStore.currentPost.loading.additional = postEditorStore.currentPost.loading.additional.map((_loading) => false) // eslint-disable-line no-unused-vars
			}
		}, 300)
	}

	/**
	 * Renames an existing keyword (focus or additional) in place and re-runs analysis.
	 * An empty value removes the keyword; a value that duplicates another is ignored.
	 *
	 * @param {Object} keyword - The keyword object being edited (needs word + isFocus).
	 * @param {string} newWord - The new keyword text.
	 * @returns {void}
	 */
	const updateKeyword = (keyword, newWord) => {
		if (!keyword) {
			return
		}

		newWord = (newWord || '').trim()
		if (!newWord) {
			deleteKeyword(keyword)
			return
		}

		const oldWord = keyword.word.trim()
		if (newWord === oldWord) {
			return
		}

		// Renaming onto another existing keyword would collapse them into a duplicate.
		if (keywords.value.some(k => k.id !== keyword.id && k.word.trim().toLowerCase() === newWord.toLowerCase())) {
			return
		}

		if (keyword.isFocus) {
			postEditorStore.currentPost.loading.focus = true
			postEditorStore.currentPost.focus_keyword = newWord
			postEditorStore.currentPost.truseo = {
				...(postEditorStore.currentPost.truseo || {}),
				focus_keyword : { score: 0, items: null }
			}
			postEditorStore.currentPost.keyphrases.focus = {
				keyphrase : newWord,
				score     : 0,
				analysis  : {}
			}
		} else if (isAdditionalKeywordsAvailable.value) {
			const additional = postEditorStore.truseoData?.additionalKeywords || []
			const index      = additional.findIndex(k => k.word.trim() === oldWord)
			if (-1 === index) {
				return
			}

			postEditorStore.currentPost.loading.additional[index] = true
			postEditorStore.currentPost.additional_keywords = additional.map((k, i) => (i === index ? { word: newWord, score: 0 } : { word: k.word, score: k.score }))
			postEditorStore.currentPost.keyphrases.additional = additional.map((k, i) => (i === index ? { keyphrase: newWord, score: 0 } : { keyphrase: k.word, score: k.score }))
		} else {
			return
		}

		runAnalysis()
	}

	return {
		keywords,
		keywordsIsLoading,
		disableAdditionalKeywords,
		isAdditionalKeywordsAvailable,
		addKeyword,
		deleteKeyword,
		assignAsFocus,
		updateKeyword
	}
}