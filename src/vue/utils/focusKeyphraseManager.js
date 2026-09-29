import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { keyphraseExists } from '@/vue/utils/keyphraseUtils'

/**
 * Adds a focus keyphrase from the input field.
 *
 * @param {Object}   options                  Options object.
 * @param {Object}   options.postEditorStore  Post editor Pinia store instance.
 * @param {Object}   options.truSeo           TruSEO instance.
 * @param {string}   options.screenContext    Screen context for finding the input.
 * @param {Function} options.onSuccess        Callback when keyphrase is added successfully.
 * @returns {boolean}                         True if keyphrase was added, false otherwise.
 */
export const addFocusKeyphrase = ({ postEditorStore, truSeo, screenContext, onSuccess }) => {
	const keyphraseInputComponent = document.getElementsByClassName(`add-focus-keyphrase-${screenContext}-input`)
	const keyphraseInput          = keyphraseInputComponent[0].querySelector('.medium')
	const keyphraseInputValue     = keyphraseInput?.value.trim()

	if (keyphraseInputValue) {
		if (keyphraseExists(postEditorStore, keyphraseInputValue)) {
			return false
		}

		postEditorStore.currentPost.focus_keyword = keyphraseInputValue
		postEditorStore.currentPost.truseo = {
			...(postEditorStore.currentPost.truseo || {}),
			focus_keyword : { score: 0, items: null }
		}
		// Keep the old keyphrase for backward compatibility
		postEditorStore.currentPost.keyphrases.focus = {
			keyphrase : keyphraseInputValue,
			score     : 0,
			analysis  : {}
		}
		postEditorStore.currentPost.loading.focus = true

		keyphraseInput.value = ''
		keyphraseInput.blur()

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
	}

	if (onSuccess) {
		onSuccess(keyphraseInputValue)
	}

	return true
}

/**
 * Updates the focus keyphrase value.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {Object}   options.truSeo          TruSEO instance.
 * @param {string}   options.value           New keyphrase value.
 * @param {Function} options.onSuccess       Callback when keyphrase is updated successfully.
 * @returns {void}
 */
export const updateFocusKeyphrase = ({ postEditorStore, truSeo, value, onSuccess }) => {
	if (keyphraseExists(postEditorStore, value)) {
		return
	}

	postEditorStore.currentPost.focus_keyword = value
	// Keep the old keyphrase for backward compatibility
	postEditorStore.currentPost.keyphrases.focus.keyphrase = value
	postEditorStore.currentPost.loading.focus = true

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
		onSuccess(value)
	}
}

/**
 * Deletes the focus keyphrase.
 *
 * @param {Object}   options                 Options object.
 * @param {Object}   options.postEditorStore Post editor Pinia store instance.
 * @param {Object}   options.truSeo          TruSEO instance.
 * @param {Function} options.onSuccess       Callback when keyphrase is deleted successfully.
 * @returns {void}
 */
export const deleteFocusKeyphrase = ({ postEditorStore, truSeo, onSuccess }) => {
	postEditorStore.currentPost.focus_keyword = ''
	if (postEditorStore.currentPost.truseo) {
		postEditorStore.currentPost.truseo = {
			...postEditorStore.currentPost.truseo,
			focus_keyword : null
		}
	}
	// Keep the old keyphrase for backward compatibility
	postEditorStore.currentPost.keyphrases.focus.keyphrase = ''
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