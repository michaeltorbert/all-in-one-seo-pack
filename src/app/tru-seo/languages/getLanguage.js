/**
 * The function getting the language part of the locale.
 *
 * @param {string} locale The locale.
 * @returns {string} The language part of the locale.
 */
export default function getLanguage (locale) {
	return locale.split('_')[0]
}