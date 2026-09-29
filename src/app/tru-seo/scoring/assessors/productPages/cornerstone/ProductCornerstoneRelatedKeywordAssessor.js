import ProductRelatedKeywordAssessor from '../ProductRelatedKeywordAssessor.js'
import ImageKeyphraseAssessment from '../../../assessments/seo/KeyphraseInImagesAssessment.js'

/**
 * The CollectionCornerstoneRelatedKeywordAssessor class is used for the related keyword analysis for cornerstone products.
 */
export default class ProductCornerstoneRelatedKeywordAssessor extends ProductRelatedKeywordAssessor {
	/**
	 * Creates a new ProductCornerstoneRelatedKeywordAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'productPageCornerstoneRelatedKeywordAssessor'

		this.addAssessment('imageKeyphrase', new ImageKeyphraseAssessment({
			scores : { withAltNonKeyword: 3, withAlt: 3, noAlt: 3 }
		}))
	}
}