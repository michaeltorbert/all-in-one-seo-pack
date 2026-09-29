import ProductContentAssessor from '../ProductContentAssessor.js'
import SubheadingDistributionTooLongAssessment from '../../../assessments/readability/SubheadingsDistributionTooLong.js'
import SentenceLengthInTextAssessment from '../../../assessments/readability/SentenceLengthInTextAssessment.js'

/**
 * The ProductContentAssessor class is used for the readability analysis for cornerstone products.
 */
export default class ProductCornerstoneContentAssessor extends ProductContentAssessor {
	/**
	 * Creates a new ProductContentAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'productCornerstoneContentAssessor'

		this.addAssessment('subheadingsTooLong', new SubheadingDistributionTooLongAssessment({
			parameters         : { slightlyTooMany: 250, farTooMany: 300, recommendedMaximumLength: 250 },
			cornerstoneContent : true
		}))
		this.addAssessment('textSentenceLength', new SentenceLengthInTextAssessment({
			slightlyTooMany : 15,
			farTooMany      : 20
		}, true, true))
	}
}