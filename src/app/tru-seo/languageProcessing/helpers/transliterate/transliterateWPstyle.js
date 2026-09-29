import transliterationsMap from '../../../config/transliterationsWPstyle.js'

/**
 * Replaces all special characters from the text based on the transliterations map specific for WP.
 *
 * @param {string} text     The text to remove special characters from.
 * @param {string} locale   The locale.
 *
 * @returns {string} The text with all special characters replaced.
 */
export default function (text, locale) {
	const map = transliterationsMap(locale)
	for (let i = map.length - 1; 0 <= i; i--) {
		text = text.replace(
			map[i].letter,
			map[i].alternative
		)
	}
	return text
}