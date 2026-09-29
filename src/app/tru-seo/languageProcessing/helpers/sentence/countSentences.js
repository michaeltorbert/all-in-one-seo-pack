/** @module stringProcessing/countSentences */

import getSentences from './getSentences.js'

/**
 * Counts the number of sentences in a given string.
 *
 * @param {string}      text                The text used to count sentences.
 * @param {Function}    memoizedTokenizer   The memoized sentence tokenizer.
 *
 * @returns {number} The number of sentences in the text.
 */
export default function (text, memoizedTokenizer) {
	return getSentences(text, memoizedTokenizer).length
}