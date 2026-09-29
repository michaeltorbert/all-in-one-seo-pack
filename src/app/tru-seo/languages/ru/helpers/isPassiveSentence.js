import { areWordsInSentence } from '@/app/tru-seo/languageProcessing'

import getPassiveVerbs from '../config/internal/participlesShortenedList.js'

/**
 * Checks the passed sentence to see if it contains passive verbs.
 *
 * @param {string} sentence The sentence to match against.
 * @returns {boolean} Whether the sentence contains passive voice.
 */
export default function isPassiveSentence (sentence) {
	return areWordsInSentence(getPassiveVerbs, sentence)
}