import { values } from '@/app/tru-seo/languageProcessing'

import getParticiples from '../helpers/internal/getParticiples'
import nonPassivesInVaAndVe from '../config/internal/nonPassivesInVaAndVe'
const { Clause } = values

/**
 * Creates a Clause object for the Hungarian language.
 */
class HungarianClause extends Clause {
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
		const foundParticiples = this.getParticiples().filter(participle => !nonPassivesInVaAndVe.includes(participle))

		this.setPassive(0 < foundParticiples.length)
	}
}

export default HungarianClause