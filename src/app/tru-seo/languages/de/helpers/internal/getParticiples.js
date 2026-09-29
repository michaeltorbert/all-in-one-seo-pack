import { forEach } from 'lodash-es'
import { getWords } from '@/app/tru-seo/languageProcessing'

import regexFunctionFactory from '../../config/internal/passiveVoiceRegex.js'
import irregularParticiples from '../../config/internal/passiveVoiceIrregulars.js'
const regexFunction = regexFunctionFactory()

const verbsBeginningWithErVerEntBeZerHerUber = regexFunction.verbsBeginningWithErVerEntBeZerHerUber
const verbsBeginningWithGe = regexFunction.verbsBeginningWithGe
const verbsWithGeInMiddle = regexFunction.verbsWithGeInMiddle
const verbsWithErVerEntBeZerHerUberInMiddle = regexFunction.verbsWithErVerEntBeZerHerUberInMiddle
const verbsEndingWithIert = regexFunction.verbsEndingWithIert

/**
 * Creates German participles array for the participles found in a clause.
 *
 * @param {string} clauseText The clause to finds participles in.
 *
 * @returns {Array} The array with the German participles found.
 */
export default function (clauseText) {
	const words = getWords(clauseText)

	const foundParticiples = []

	forEach(words, function (word) {
		if (0 !== verbsBeginningWithGe(word).length ||
			0 !== verbsWithGeInMiddle(word).length ||
			0 !== verbsBeginningWithErVerEntBeZerHerUber(word).length ||
			0 !== verbsWithErVerEntBeZerHerUberInMiddle(word).length ||
			0 !== verbsEndingWithIert(word).length ||
			irregularParticiples.includes(word)
		) {
			foundParticiples.push(word)
		}
	})
	return foundParticiples
}