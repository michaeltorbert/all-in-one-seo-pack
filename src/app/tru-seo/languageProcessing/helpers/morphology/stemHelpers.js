/**
 * Checks whether the word starts with one of the words in a given list and ends in one of the suffixes
 * in a given suffixes list. If so, deletes the suffix.
 *
 * @param {string[]}    list  The list of words to check against.
 * @param {string[]}    suffixes    The suffixes that needs to be deleted.
 * @param {string}      word        The word to check.
 * @returns {string}	The stemmed word.
 */
export function removeSuffixesFromFullForm (list, suffixes, word) {
	for (const listItem of list) {
		if (word.startsWith(listItem)) {
			const suffixRetrieved = word.substring(listItem.length)
			for (const candidateSuffix of suffixes) {
				if (candidateSuffix === suffixRetrieved) {
					return word.slice(0, -suffixRetrieved.length)
				}
			}
		}
	}
}

/**
 * Checks whether the word is in a given list of exceptions and if so, deletes a given suffix.
 *
 * @param {string[]}    exceptions  The exception list.
 * @param {string}      suffix      The suffix that needs to be deleted.
 * @param {string}      word        The word to check.
 *
 * @returns {string} The stemmed word.
 */
export function removeSuffixFromFullForm (exceptions, suffix, word) {
	for (const exception of exceptions) {
		if (word.endsWith(exception)) {
			return word.slice(0, -suffix.length)
		}
	}
}