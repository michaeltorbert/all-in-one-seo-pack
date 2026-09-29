/**
 * Checks if a keyphrase already exists as either the focus keyphrase or an additional keyphrase.
 *
 * @since 5.0.0
 *
 * @param {Object} postEditorStore              Post editor Pinia store instance.
 * @param {string} keyphrase                    Keyphrase to check.
 * @param {Object} [options]                    Options object.
 * @param {number} [options.excludeAdditionalIndex=-1] Index to exclude from the additional check (for updates).
 * @returns {boolean}                           True if keyphrase already exists.
 */
export const keyphraseExists = (postEditorStore, keyphrase, { excludeAdditionalIndex = -1 } = {}) => {
	if (!keyphrase) {
		return false
	}

	const normalizedKeyphrase = keyphrase.toLowerCase()

	// Check focus keyphrase (the column stores the plain string).
	const focusWord = postEditorStore.currentPost?.focus_keyword || ''
	if (focusWord.toLowerCase() === normalizedKeyphrase) {
		return true
	}

	// Check additional keyphrases.
	const additional = postEditorStore.currentPost?.additional_keywords
	if (!additional) {
		return false
	}

	return additional.some((k, i) => i !== excludeAdditionalIndex && k.word.toLowerCase() === normalizedKeyphrase)
}