import ContentAssessor from '../contentAssessor.js'
import SubheadingDistributionTooLongAssessment from '../../assessments/readability/SubheadingsDistributionTooLong.js'
import ParagraphTooLongAssessment from '../../assessments/readability/ParagraphTooLongAssessment.js'
import SentenceLengthInTextAssessment from '../../assessments/readability/SentenceLengthInTextAssessment.js'
import TransitionWordsAssessment from '../../assessments/readability/TransitionWordsAssessment.js'
import PassiveVoiceAssessment from '../../assessments/readability/PassiveVoiceAssessment.js'
import TextPresenceAssessment from '../../assessments/readability/TextPresenceAssessment.js'

/**
 * The ProductContentAssessor class is used for the readability analysis for products.
 */
export default class ProductContentAssessor extends ContentAssessor {
	/**
	 * Creates a new ProductContentAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'productContentAssessor'

		this._assessments = [
			new SubheadingDistributionTooLongAssessment(),
			new ParagraphTooLongAssessment({
				parameters : {
					recommendedLength        : 70,
					maximumRecommendedLength : 100
				}
			}, true),
			new SentenceLengthInTextAssessment({
				slightlyTooMany : 20,
				farTooMany      : 25
			}, false, true),
			new TransitionWordsAssessment(),
			new PassiveVoiceAssessment(),
			new TextPresenceAssessment()
		]
	}
}