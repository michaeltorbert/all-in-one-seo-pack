import { getWords } from '@/app/tru-seo/languageProcessing'

import nonPassives from '../config/internal/nonPassiveVerbsStartingDi'
const passivePrefix = 'di'

/**
 * Checks the passed sentence to see if it contains Indonesian passive verb-forms.
 *
 * @param {string} sentence     The sentence to match against.
 *
 * @returns {boolean} Whether the sentence contains Indonesian passive voice.
 */
export default function isPassiveSentence (sentence) {
	const words = getWords(sentence.toLowerCase())
	let matchedPassives = words.filter(word => (4 < word.length))
	matchedPassives = matchedPassives.filter(word => (word.startsWith(passivePrefix)))
	if (0 === matchedPassives.length) {
		return false
	}

	// Check exception list.
	for (const nonPassive of nonPassives) {
		matchedPassives = matchedPassives.filter(word => (!word.startsWith(nonPassive)))
	}

	// Check direct precedence exceptions.
	matchedPassives = matchedPassives.filter(function (matchedPassive) {
		let matchedPassivesShouldStay = true
		const passiveIndex = words.indexOf(matchedPassive)
		const wordPrecedingPassive = words[passiveIndex - 1]
		if ('untuk' === wordPrecedingPassive) {
			matchedPassivesShouldStay = false
		}
		return matchedPassivesShouldStay
	})

	return 0 !== matchedPassives.length
}