import { stripFullTags as stripTags } from './stripHTMLTags.js'
import { unifyAllSpaces } from './unifyWhitespace'
import { memoizeStringFn } from '../cache/StringCache'

/**
 * Internal sanitization function.
 *
 * @param {string} text The text to be sanitized.
 * @returns {string} The sanitized text.
 */
function sanitizeStringInternal (text) {
	// Unify whitespaces and non-breaking spaces.
	text = unifyAllSpaces(text)
	// Strip the tags and multiple spaces.
	text = stripTags(text)

	return text
}

/**
 * Sanitizes the text before we use the text for the analysis.
 * Uses memoization to cache results for repeated calls with the same input.
 *
 * @since 5.0.0
 * @param {string} text The text to be sanitized.
 * @returns {string} The sanitized text.
 */
const sanitizeString = memoizeStringFn(sanitizeStringInternal, 50)

export default sanitizeString