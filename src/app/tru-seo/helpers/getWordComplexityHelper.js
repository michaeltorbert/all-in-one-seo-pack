import wordComplexityHelperGerman from '@/app/tru-seo/languages/de/helpers/checkIfWordIsComplex.js'
import wordComplexityHelperEnglish from '@/app/tru-seo/languages/en/helpers/checkIfWordIsComplex.js'
import wordComplexityHelperSpanish from '@/app/tru-seo/languages/es/helpers/checkIfWordIsComplex.js'
import wordComplexityHelperFrench from '@/app/tru-seo/languages/fr/helpers/checkIfWordIsComplex.js'

/**
 * Gets the word complexity assessment helper.
 *
 * @param {string} language The researcher language.
 * @returns {Function} The word complexity assessment's helper.
 */
export default function getWordComplexityHelper (language) {
	const helpers = {
		de : wordComplexityHelperGerman,
		en : wordComplexityHelperEnglish,
		es : wordComplexityHelperSpanish,
		fr : wordComplexityHelperFrench
	}

	return helpers[language]
}