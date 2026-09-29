import SEOAssessor from '../seoAssessor'
import IntroductionKeywordAssessment from '../../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLengthAssessment from '../../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../../assessments/seo/KeywordDensityAssessment.js'
import MetaDescriptionKeywordAssessment from '../../assessments/seo/MetaDescriptionKeywordAssessment.js'
import TextCompetingLinksAssessment from '../../assessments/seo/TextCompetingLinksAssessment.js'
import FunctionWordsInKeyphraseAssessment from '../../assessments/seo/FunctionWordsInKeyphraseAssessment.js'
import ImageKeyphraseAssessment from '../../assessments/seo/KeyphraseInImagesAssessment.js'
import MetaDescriptionLengthAssessment from '../../assessments/seo/MetaDescriptionLengthAssessment.js'
import SubheadingsKeywordAssessment from '../../assessments/seo/SubHeadingsKeywordAssessment.js'
import TextLengthAssessment from '../../assessments/seo/TextLengthAssessment.js'
import KeyphraseInSEOTitleAssessment from '../../assessments/seo/KeyphraseInSEOTitleAssessment.js'
import PageTitleWidthAssessment from '../../assessments/seo/PageTitleWidthAssessment.js'
import SlugKeywordAssessment from '../../assessments/seo/UrlKeywordAssessment.js'
import SingleH1Assessment from '../../assessments/seo/SingleH1Assessment.js'
import ImageCountAssessment from '../../assessments/seo/TextImagesAssessment.js'
import ImageAltTagsAssessment from '../../assessments/seo/ImageAltTagsAssessment.js'
import ProductIdentifiersAssessment from '../../assessments/seo/ProductIdentifiersAssessment.js'
import ProductSKUAssessment from '../../assessments/seo/ProductSKUAssessment.js'

/**
 * The ProductSEOAssessor class is used for the SEO analysis for products.
 */
export default class ProductSEOAssessor extends SEOAssessor {
	/**
	 * Creates a new ProductSEOAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'productSEOAssessor'

		this._assessments = [
			new IntroductionKeywordAssessment(),
			new KeyphraseLengthAssessment({
				parameters : {
					recommendedMinimum : 4,
					recommendedMaximum : 6,
					acceptableMaximum  : 8,
					acceptableMinimum  : 2
				}
			}, true),
			new KeyphraseDensityAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new MetaDescriptionLengthAssessment(),
			new SubheadingsKeywordAssessment(),
			new TextCompetingLinksAssessment(),
			new TextLengthAssessment({
				recommendedMinimum   : 200,
				slightlyBelowMinimum : 150,
				belowMinimum         : 100,
				veryFarBelowMinimum  : 50,
				customContentType    : this.type
			}),
			new KeyphraseInSEOTitleAssessment(),
			new PageTitleWidthAssessment({
				scores : {
					widthTooShort : 9
				}
			}, true),
			new SlugKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment(),
			new SingleH1Assessment(),
			new ImageCountAssessment({
				scores : {
					okay : 6
				},
				recommendedCount : 4
			}, options?.countVideos || false),
			new ImageKeyphraseAssessment(),
			new ImageAltTagsAssessment(),
			// assessVariants: every variation of a variable product needs its own identifier and
			// SKU. Left at the default false, variable products would be skipped entirely.
			new ProductIdentifiersAssessment({ assessVariants: true }),
			new ProductSKUAssessment({ assessVariants: true })
		]
	}
}