import { createRegexFromArray, getClauses } from '@/app/tru-seo/languageProcessing'

import Clause from '@/app/tru-seo/languages/en/values/EnglishClause'
import auxiliaries from '@/app/tru-seo/languages/en/config/internal/passiveVoiceAuxiliaries.js'
import stopwords from '@/app/tru-seo/languages/en/config/stopWords.js'
import { includes } from 'lodash-es'
import stripSpaces from '@/app/tru-seo/languageProcessing/helpers/sanitize/stripSpaces'
import { getIndicesByWordList as getIndicesOfList } from '@/app/tru-seo/languageProcessing/helpers/word/indices'

const options = {
	Clause,
	stopwords,
	auxiliaries   : auxiliaries,
	ingExclusions : [ 'king', 'cling', 'ring', 'being', 'thing', 'something', 'anything' ],
	regexes       : {
		auxiliaryRegex       : createRegexFromArray(auxiliaries),
		stopCharacterRegex   : /([:,]|('ll)|('ve))(?=[ \n\r\t'"+\-»«‹›<>])/ig,
		verbEndingInIngRegex : /\w+ing(?=$|[ \n\r\t.,'()"+\-;!?:/»«‹›<>])/ig
	},
	otherStopWordIndices : []
}

/**
 * Gets active verbs (ending in ing) to determine sentence breakers in English.
 *
 * @param {string} sentence The sentence to get the active verbs from.
 *
 * @returns {Array} The array with valid matches.
 */
const getVerbsEndingInIngIndices = function (sentence) {
	// Matches the sentences with words ending in ing.
	let matches = sentence.match(options.regexes.verbEndingInIngRegex) || [] // NOSONAR: regex has /ig; .filter requires all match strings (S6594).
	// Filters out words ending in -ing that aren't verbs.
	matches = matches.filter(match => !includes(options.ingExclusions, stripSpaces(match)))
	return getIndicesOfList(matches, sentence)
}

/**
 * Gets the clauses from a sentence by determining sentence breakers.
 *
 * @param {string} sentence The sentence to split up in clauses.
 *
 * @returns {Array} The array with all clauses that have an auxiliary.
 */
export default function getEnglishClauses (sentence) {
	options.otherStopWordIndices = getVerbsEndingInIngIndices(sentence)
	return getClauses(sentence, options)
}