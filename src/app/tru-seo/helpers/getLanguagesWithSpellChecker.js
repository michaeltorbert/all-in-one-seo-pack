/**
 * Returns an array of languages that have Hunspell spell checker dictionaries.
 *
 * @since 5.0.0
 *
 * @returns {string[]} A list of language codes with spell checker support.
 */
export function getLanguagesWithSpellChecker () {
	// Persian (fa) ships a dictionary but its RTL/ZWNJ handling is unreliable, so
	// it is intentionally excluded here — it stays an analysis-only language.
	return [
		'ca', 'cs', 'de', 'el', 'en', 'es', 'fr',
		'he', 'hu', 'it', 'nb', 'nl', 'pl', 'pt', 'ru',
		'sk', 'sv', 'tr'
	]
}