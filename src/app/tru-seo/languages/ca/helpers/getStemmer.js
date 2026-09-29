import { baseStemmer } from '@/app/tru-seo/languageProcessing'

/**
 * Returns the stemmer for a researcher.
 *
 * @returns {Function} The stemmer.
 */
export default function getStemmer () {
	return baseStemmer
}