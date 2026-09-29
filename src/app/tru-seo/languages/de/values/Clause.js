import { includes, map } from 'lodash-es'
import { indices, values } from '@/app/tru-seo/languageProcessing'

import getParticiples from '../helpers/internal/getParticiples'
import exceptionsParticiplesActive from '../config/internal/exceptionsParticiplesActive.js'
import { participleLike as participleLikeAuxiliaries } from '../config/internal/passiveVoiceAuxiliaries.js'
const { getIndicesByWord, getIndicesByWordList } = indices
const { Clause } = values

const exceptionsRegex =
	/\S+(apparat|arbeit|dienst|haft|halt|keit|kraft|not|pflicht|schaft|schrift|tät|wert|zeit)($|[ \n\r\t.,'()"+-;!?:/»«‹›<>])/ig

/**
 * Creates a Clause object for the German language.
 */
class GermanClause extends Clause {
	/**
	 * Constructor.
	 *
	 * @param {string} clauseText   The text of the clause.
	 * @param {Array} auxiliaries   The auxiliaries.
	 *
	 * @constructor
	 */
	constructor (clauseText, auxiliaries) {
		super(clauseText, auxiliaries)
		this._participles = getParticiples(this.getClauseText())
		this.checkParticiples()
	}

	/**
	 * Checks if any exceptions are applicable to this participle that would result in the clause not being passive.
	 * If no exceptions are found, the clause is passive.
	 *
	 * @returns {void}
	 */
	checkParticiples () {
		const foundParticiples = this.getParticiples().filter(participle => {
			return !this.hasNounSuffix(participle) &&
			!includes(exceptionsParticiplesActive, participle) &&
			!this.hasHabenSeinException(participle) &&
			!includes(participleLikeAuxiliaries, participle)
		})

		this.setPassive(0 < foundParticiples.length)
	}

	/**
	 * Checks whether a found participle ends in a noun suffix.
	 * If a word ends in a noun suffix from the exceptionsRegex, it isn't a participle.
	 *
	 * @param {string} participle   The participle to check.
	 *
	 * @returns {boolean} Returns true if it ends in a noun suffix, otherwise returns false.
	 */
	hasNounSuffix (participle) {
		return null !== participle.match(exceptionsRegex)
	}

	/**
	 * Checks whether a participle is followed by 'haben' or 'sein'.
	 * If a participle is followed by one of these, the clause is not passive.
	 *
	 * @param {string} participle   The participle to check.
	 *
	 * @returns {boolean} Returns true if it is an exception, otherwise returns false.
	 */
	hasHabenSeinException (participle) {
		const participleIndices = getIndicesByWord(participle, this.getClauseText())
		let habenSeinIndices = getIndicesByWordList([ 'haben', 'sein' ], this.getClauseText())

		// Don't check further if there is no participle or no haben/sein.
		if (0 === participleIndices.length || 0 === habenSeinIndices.length) {
			return false
		}

		habenSeinIndices = map(habenSeinIndices, 'index')
		const currentParticiple = participleIndices[0]
		return includes(habenSeinIndices, currentParticiple.index + currentParticiple.match.length + 1)
	}
}

export default GermanClause