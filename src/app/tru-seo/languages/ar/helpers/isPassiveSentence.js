import getPassiveVerbs from '../config/internal/passiveVerbsWithLongVowel'
import { getWords } from '@/app/tru-seo/languageProcessing'

/**
 * Checks the passed sentence to see if it contains Arabic passive verb-forms.
 *
 * @param {string} sentence     The sentence to match against.
 *
 * @returns {boolean} Whether the sentence contains Arabic passive voice.
 */
export default function isPassiveSentence (sentence) {
	const arabicPrepositionalPrefix =  'و'
	const words = getWords(sentence)
	const passiveVerbs = []

	for (let word of words) {
		// Check if the word starts with prefix و
		if (word.startsWith(arabicPrepositionalPrefix)) {
			word = word.slice(1)
		}
		let wordWithDamma = -1
		// Check if the first character has a damma or if the word is in the list of Arabic passive verbs
		if (2 <= word.length) {
			wordWithDamma = word[1].search('\u064F')
		}
		if (-1 !== wordWithDamma || getPassiveVerbs.includes(word)) {
			passiveVerbs.push(word)
		}
	}

	return 0 !== passiveVerbs.length
}