import { forEach, includes } from 'lodash-es'
import { matchRegularParticiples, getWords } from '@/app/tru-seo/languageProcessing'

import irregularParticiples from '../../config/internal/passiveVoiceIrregulars'

/**
 * Creates participle array for the participles found in a clause.
 *
 * @param {string} clauseText The clause to find participles in
 *
 * @returns {Array} The list with participles.
 */
export default function getParticiples (clauseText) {
	const words = getWords(clauseText)
	const foundParticiples = []

	forEach(words, function (word) {
		const regex = [ /\w+ed($|[ \n\r\t.,'()"+\-;!?:/»«‹›<>])/ig ]
		if (0 !== matchRegularParticiples(word, regex).length || includes(irregularParticiples, word)) {
			foundParticiples.push(word)
		}
	})
	return foundParticiples
}