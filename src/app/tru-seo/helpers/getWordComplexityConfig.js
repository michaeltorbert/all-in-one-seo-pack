import wordComplexityConfigEnglish from '@/app/tru-seo/languages/en/config/wordComplexity.js'
import wordComplexityConfigGerman from '@/app/tru-seo/languages/de/config/wordComplexity.js'
import wordComplexityConfigSpanish from '@/app/tru-seo/languages/es/config/wordComplexity.js'
import wordComplexityConfigFrench from '@/app/tru-seo/languages/fr/config/wordComplexity.js'

/**
 * Gets the word complexity assessment's config.
 *
 * @param {string} language The researcher language.
 * @returns {Function} The word complexity assessment's config.
 */
export default function getWordComplexityConfig (language) {
	const configs = {
		de : wordComplexityConfigGerman,
		en : wordComplexityConfigEnglish,
		es : wordComplexityConfigSpanish,
		fr : wordComplexityConfigFrench
	}
	return configs[language]
}