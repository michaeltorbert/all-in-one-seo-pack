/** @module stringProcessing/matchTextWithArray */

import matchTextWithWord from './matchTextWithWord'
import { uniq as unique } from 'lodash-es'

/**
 * Matches strings from an array against a given text.
 *
 * @param {string}      text                    The text to match.
 * @param {Array}       array                   The array with strings to match.
 * @param {string}      locale                  The locale of the text to get transliterations.
 * @param {Function}    matchWordCustomHelper   The language-specific helper function to match word in text.
 *
 * @returns {Object} An array with all matches of the text, the number of the matches, and the lowest number of positions of the matches.
 */
export default function (text, array, locale, matchWordCustomHelper) {
	let count = 0,
	 matches = [],
	 positions = []

	unique(array).forEach(function (wordToMatch) {
		const occurrence = matchTextWithWord(text, wordToMatch, locale, matchWordCustomHelper)
		count += occurrence.count
		matches = matches.concat(occurrence.matches)
		positions.push(occurrence.position)
	})

	// Filtered out negative number, i.e. -1.
	positions = positions.filter(position => 0 <= position)

	return {
		count    : count,
		matches  : matches,
		position : 0 === positions.length ? -1 : Math.min(...positions)
	}
}