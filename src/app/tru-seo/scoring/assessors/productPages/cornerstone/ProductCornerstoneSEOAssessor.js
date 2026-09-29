import ProductSEOAssessor from '../ProductSEOAssessor.js'
import MetaDescriptionLengthAssessment from '../../../assessments/seo/MetaDescriptionLengthAssessment.js'
import TextLengthAssessment from '../../../assessments/seo/TextLengthAssessment.js'
import SlugKeywordAssessment from '../../../assessments/seo/UrlKeywordAssessment.js'
import ImageKeyphraseAssessment from '../../../assessments/seo/KeyphraseInImagesAssessment.js'
import SubHeadingsKeywordAssessment from '../../../assessments/seo/SubHeadingsKeywordAssessment'

/**
 * The ProductCornerstoneSEOAssessor class is used for the SEO analysis for cornerstone products.
 */
export default class ProductCornerstoneSEOAssessor extends ProductSEOAssessor {
	/**
	 * Creates a new ProductCornerstoneSEOAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'productCornerstoneSEOAssessor'

		this.addAssessment('metaDescriptionLength', new MetaDescriptionLengthAssessment({
			scores :	{ tooLong: 3, tooShort: 3 }
		}))
		this.addAssessment('textLength', new TextLengthAssessment({
			recommendedMinimum   : 400,
			slightlyBelowMinimum : 300,
			belowMinimum         : 200,
			scores               : { belowMinimum: -20, farBelowMinimum: -20 },
			cornerstoneContent   : true,
			customContentType    : this.type
		}))
		this.addAssessment('slugKeyword', new SlugKeywordAssessment({
			scores : { okay: 3 }
		}))
		this.addAssessment('imageKeyphrase', new ImageKeyphraseAssessment({
			scores : { withAltNonKeyword: 3, noAlt: 3 }
		}))
		this.addAssessment('subheadingsKeyword', new SubHeadingsKeywordAssessment({
			cornerstoneContent : true,
			parameters         : { recommendedMaximumLength: 250 }
		}))
	}
}