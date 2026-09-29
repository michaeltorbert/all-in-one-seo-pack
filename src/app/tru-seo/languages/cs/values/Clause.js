import { values } from '@/app/tru-seo/languageProcessing'
import getParticiples from '../helpers/internal/getParticiples'
const { Clause } = values

/**
 * Creates a Clause object for the Czech language.
 */
class CzechClause extends Clause {
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
	 * Sets the clause passiveness to true if there is a participle present in the clause, otherwise sets it to false.
	 *
	 * @returns {void}
	 */
	checkParticiples () {
		this.setPassive(0 < this.getParticiples().length)
	}
}

export default CzechClause