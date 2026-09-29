// These are sentence terminators, that never should be in the middle of a word.
const sentenceTerminators = /[.?!:;,]/g

/**
 * Replaces sentence terminators from the text.
 *
 * @param {string} text The text to remove the terminators from.
 *
 * @returns {string} The sanitized text.
 */
export default function (text) {
	return text.replace(sentenceTerminators, '')
}