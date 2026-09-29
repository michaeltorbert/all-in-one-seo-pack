import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { keyphraseExists } from '@/vue/utils/keyphraseUtils'
import { additionalKeywordLimitReached } from '@/vue/utils/postData/helpers'

/**
 * Gets keyphrase panel elements.
 *
 * @returns {HTMLCollection} Collection of keyphrase panel elements.
 */
const getKeyphrasePanels = () => {
	return document.getElementsByClassName('keyphrase-name')
}

/**
 * Ensures the additional keyphrases arrays are initialized.
 *
 * @param {Object} postEditorStore Post editor Pinia store instance.
 * @returns {void}
 */
const ensureAdditionalArrays = (postEditorStore) => {
	if (!postEditorStore.currentPost.keyphrases.additional) {
		postEditorStore.currentPost.keyphrases.additional = []
	}
	if (!postEditorStore.currentPost.additional_keywords) {
		postEditorStore.currentPost.additional_keywords = []
	}
}

/**
 * Checks if an additional keyphrase already exists.
 *
 * @param {Object} options                 Options object.
 * @param {Object} options.postEditorStore Post editor Pinia store instance.
 * @param {string} options.keyphrase       Keyphrase to check.
 * @returns {boolean}                      True if keyphrase exists, false otherwise.
 */
export const hasAdditionalKeyphrase = ({ postEditorStore, keyphrase }) => {
	const additional = postEditorStore.truseoData?.additionalKeywords

	return additional ? additional.filter(k => k.word.toLowerCase() === keyphrase).length : 0
}

/**
 * Gets an additional keyphrase object by keyphrase value.
 *
 * @param {Object} options                 Options object.
 * @param {Object} options.postEditorStore Post editor Pinia store instance.
 * @param {string} options.keyphrase       Keyphrase to find.
 * @returns {Object|undefined}             Keyphrase object or undefined if not found.
 */
export const getAdditionalKeyphrase = ({ postEditorStore, keyphrase }) => {
	const additional = postEditorStore.truseoData?.additionalKeywords

	return additional ? additional.find(k => k.word.toLowerCase() === keyphrase) : null
}

/**
 * Updates an additional keyphrase value.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {Object}   options.truSeo          TruSEO instance.
 * @param {number}   options.index           Index of the keyphrase to update.
 * @param {string}   options.value           New keyphrase value.
 * @param {Function} options.onSuccess       Callback when keyphrase is updated successfully.
 * @returns {void}
 */
export const updateAdditionalKeyphrase = ({ postEditorStore, truSeo, index, value, onSuccess }) => {
	if (keyphraseExists(postEditorStore, value, { excludeAdditionalIndex: index })) {
		return
	}

	postEditorStore.currentPost.additional_keywords[index].word = value
	postEditorStore.currentPost.additional_keywords[index].score = 0

	// Keep the old keyphrase for backward compatibility
	if (postEditorStore.currentPost.keyphrases?.additional?.[index]) {
		postEditorStore.currentPost.keyphrases.additional[index].keyphrase = value
		postEditorStore.currentPost.keyphrases.additional[index].score = 0
	}

	postEditorStore.currentPost.loading.additional[index] = true

	postEditorStore.isDirty = true

	setTimeout(async () => {
		try {
			const results = await truSeo?.runAnalysis({
				postId : postEditorStore.currentPost.id
			})

			if (results) {
				updateStoreWithResults(results)
			}
		} catch (error) {
			console.error('TruSEO analysis failed:', error)
		}
	}, 300)

	if (onSuccess) {
		onSuccess(index)
	}
}

/**
 * Deletes an additional keyphrase by index.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {Object}   options.truSeo          TruSEO instance.
 * @param {number}   options.index           Index of the keyphrase to delete.
 * @param {Function} options.onSuccess       Callback when keyphrase is deleted successfully.
 * @returns {void}
 */
export const deleteAdditionalKeyphraseByIndex = ({ postEditorStore, truSeo, index, onSuccess }) => {
	const additionalCopy = [ ...postEditorStore.currentPost.additional_keywords ]
	additionalCopy.splice(index, 1)
	postEditorStore.currentPost.additional_keywords = additionalCopy
	// Keep the old keyphrase for backward compatibility
	const additionalCopyOld = [ ...postEditorStore.currentPost.keyphrases.additional ]
	additionalCopyOld.splice(index, 1)
	postEditorStore.currentPost.keyphrases.additional = additionalCopyOld
	postEditorStore.isDirty = true

	setTimeout(async () => {
		try {
			const results = await truSeo?.runAnalysis({
				postId : postEditorStore.currentPost.id
			})

			if (results) {
				updateStoreWithResults(results)
			}
		} catch (error) {
			console.error('TruSEO analysis failed:', error)
		}
	}, 300)

	if (onSuccess) {
		onSuccess()
	}
}

/**
 * Adds an additional keyphrase from input.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {Object}   options.truSeo          TruSEO instance.
 * @param {string}   options.screenContext   Screen context for finding the input.
 * @param {Function} options.onSuccess       Callback when keyphrase is added. Receives index.
 * @returns {number|null}                    Index of added keyphrase or null if failed.
 */
export const addAdditionalKeyphraseFromInput = ({ postEditorStore, truSeo, screenContext, onSuccess }) => {
	const maxKeyphrases          = postEditorStore.currentPost.maxAdditionalKeyphrases
	const currentKeyphrasesCount = postEditorStore.currentPost.keyphrases?.additional?.length || 0

	if (additionalKeywordLimitReached(maxKeyphrases, currentKeyphrasesCount)) {
		return null
	}

	const keyphraseInputComponent = document.getElementsByClassName(`add-keyphrase-${screenContext}-input`)
	const keyphraseInput          = keyphraseInputComponent[0].querySelector('.medium')
	const keyphraseInputValue     = keyphraseInput?.value.trim()
	let actualIndex = null

	if (keyphraseInputValue) {
		if (keyphraseExists(postEditorStore, keyphraseInputValue)) {
			return null
		}

		ensureAdditionalArrays(postEditorStore)

		// Keep the old keyphrase for backward compatibility
		postEditorStore.currentPost.keyphrases.additional.push({
			keyphrase : keyphraseInputValue,
			score     : 0
		})
		const newKeyphraseIndex = postEditorStore.currentPost.additional_keywords.push({
			word  : keyphraseInputValue,
			score : 0
		})
		actualIndex    = newKeyphraseIndex - 1
		const keyphrasePanel = document.getElementsByClassName('keyphrase-name')

		postEditorStore.currentPost.loading.additional[actualIndex] = true
		keyphraseInput.value = ''
		keyphraseInput.blur()

		postEditorStore.isDirty = true
		keyphrasePanel[newKeyphraseIndex]?.click()

		setTimeout(async () => {
			try {
				const results = await truSeo?.runAnalysis({
					postId : postEditorStore.currentPost.id
				})

				if (results) {
					updateStoreWithResults(results)
				}
			} catch (error) {
				console.error('TruSEO analysis failed:', error)
			}
		}, 300)
	}

	if (onSuccess) {
		onSuccess(actualIndex)
	}

	return actualIndex
}

/**
 * Adds an additional keyphrase.
 *
 * @param {Object}   options                    Options object.
 * @param {Object}   options.postEditorStore    Post editor Pinia store instance.
 * @param {Object}   options.truSeo             TruSEO instance.
 * @param {string}   options.keyphrase          Keyphrase to add.
 * @param {Function} options.onStart            Callback when adding starts.
 * @param {Function} options.onSuccess          Callback when keyphrase is added. Receives keyphraseIndex.
 * @param {Function} options.onMaxReached       Callback when max keyphrases reached.
 * @param {Object}   options.nextTick           Vue's nextTick function.
 * @returns {Promise<number|null>}              Index of added keyphrase or null if failed.
 */
export const addAdditionalKeyphrase = async ({ postEditorStore, truSeo, keyphrase, onStart, onSuccess, onMaxReached, nextTick }) => {
	const maxKeyphrases          = postEditorStore.currentPost.maxAdditionalKeyphrases
	const currentKeyphrasesCount = postEditorStore.currentPost.keyphrases?.additional?.length || 0

	if (additionalKeywordLimitReached(maxKeyphrases, currentKeyphrasesCount)) {
		if (onMaxReached) {
			onMaxReached()
		}
		return null
	}

	if (keyphraseExists(postEditorStore, keyphrase)) {
		return null
	}

	if (onStart) {
		onStart()
	}

	ensureAdditionalArrays(postEditorStore)

	const { additional } = postEditorStore.currentPost.keyphrases
	const keyphraseIndex = additional.push({ keyphrase, score: 0 })
	const keyphrasePanel = getKeyphrasePanels()
	postEditorStore.currentPost.keyphrases.additional = additional
	postEditorStore.isDirty = true

	setTimeout(async () => {
		try {
			const results = await truSeo?.runAnalysis({
				postId : postEditorStore.currentPost.id
			})

			if (results) {
				updateStoreWithResults(results)
			}
		} catch (error) {
			console.error('TruSEO analysis failed:', error)
		}
	}, 300)

	if (nextTick) {
		await nextTick()
	}

	if (keyphrasePanel[keyphraseIndex]) {
		keyphrasePanel[keyphraseIndex].click()
	}

	if (onSuccess) {
		onSuccess(keyphraseIndex)
	}

	return keyphraseIndex
}

/**
 * Navigates to an additional keyphrase panel.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {string}   options.keyphrase       Keyphrase to navigate to.
 * @param {Function} options.onSuccess       Callback when navigation succeeds.
 * @param {Function} options.onNotFound      Callback when keyphrase not found.
 * @returns {boolean}                        True if navigation succeeded, false otherwise.
 */
export const navigateToAdditionalKeyphrase = ({ postEditorStore, keyphrase, onSuccess, onNotFound }) => {
	const { additional }  = postEditorStore.currentPost.keyphrases
	const keyphraseIndex  = additional.findIndex(k => k.keyphrase.toLowerCase() === keyphrase.toLowerCase())

	if (-1 === keyphraseIndex) {
		if (onNotFound) {
			onNotFound()
		}
		return false
	}

	const keyphrasePanel = getKeyphrasePanels()
	if (keyphrasePanel[keyphraseIndex + 1]) {
		keyphrasePanel[keyphraseIndex + 1].click()
	}

	if (onSuccess) {
		onSuccess(keyphraseIndex)
	}

	return true
}

/**
 * Removes an additional keyphrase.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {string}   options.keyphrase       Keyphrase to remove.
 * @param {Function} options.onStart         Callback when removal starts.
 * @param {Function} options.onSuccess       Callback when keyphrase is removed. Receives keyphraseIndex.
 * @param {Function} options.nextTick        Vue's nextTick function.
 * @returns {Promise<boolean>}               True if removal succeeded, false otherwise.
 */
export const removeAdditionalKeyphrase = async ({ postEditorStore, keyphrase, onStart, onSuccess, nextTick }) => {
	if (onStart) {
		onStart()
	}

	const additionalOld = postEditorStore.currentPost.keyphrases?.additional || []
	const additional    = postEditorStore.truseoData?.additionalKeywords || []

	const keyphraseIndex = additional ? additional.findIndex(k => k.word.toLowerCase() === keyphrase) : -1
	if (-1 !== keyphraseIndex) {
		// Keep the old keyphrase for backward compatibility
		additionalOld.splice(keyphraseIndex, 1)
		additional.splice(keyphraseIndex, 1)

		// Keep the old keyphrase for backward compatibility
		postEditorStore.currentPost.keyphrases.additional = additionalOld
		postEditorStore.truseoData.additionalKeywords = additional
		const keyphrasePanel = document.getElementsByClassName('keyphrase-name')
		if (keyphrasePanel[0]) {
			keyphrasePanel[0].click()
		}
	}

	if (nextTick) {
		await nextTick()
	}

	if (onSuccess) {
		onSuccess(keyphraseIndex)
	}

	return true
}