import SEOAssessor from '../seoAssessor.js'
import IntroductionKeywordAssessment from '../../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLengthAssessment from '../../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../../assessments/seo/KeywordDensityAssessment.js'
import MetaDescriptionKeywordAssessment from '../../assessments/seo/MetaDescriptionKeywordAssessment.js'
import MetaDescriptionLengthAssessment from '../../assessments/seo/MetaDescriptionLengthAssessment.js'
import SubheadingsKeywordAssessment from '../../assessments/seo/SubHeadingsKeywordAssessment.js'
import TextCompetingLinksAssessment from '../../assessments/seo/TextCompetingLinksAssessment.js'
import FunctionWordsInKeyphraseAssessment from '../../assessments/seo/FunctionWordsInKeyphraseAssessment.js'
import ImageKeyphraseAssessment from '../../assessments/seo/KeyphraseInImagesAssessment.js'
import ImageCountAssessment from '../../assessments/seo/TextImagesAssessment.js'
import TextLengthAssessment from '../../assessments/seo/TextLengthAssessment.js'
import OutboundLinksAssessment from '../../assessments/seo/OutboundLinksAssessment.js'
import KeyphraseInSEOTitleAssessment from '../../assessments/seo/KeyphraseInSEOTitleAssessment.js'
import InternalLinksAssessment from '../../assessments/seo/InternalLinksAssessment.js'
import PageTitleWidthAssessment from '../../assessments/seo/PageTitleWidthAssessment.js'
import SlugKeywordAssessment from '../../assessments/seo/UrlKeywordAssessment.js'
import SingleH1Assessment from '../../assessments/seo/SingleH1Assessment.js'
import ImageAltTagsAssessment from '../../assessments/seo/ImageAltTagsAssessment.js'

/**
 * The StorePostsAndPagesSEOAssessor class is used for the SEO analysis for store posts and pages.
 */
export default class StorePostsAndPagesSEOAssessor extends SEOAssessor {
	/**
	 * Creates a new StorePostsAndPagesSEOAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'storePostsAndPagesSEOAssessor'

		this._assessments = [
			new IntroductionKeywordAssessment(),
			new KeyphraseLengthAssessment(),
			new KeyphraseDensityAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new MetaDescriptionLengthAssessment(),
			new SubheadingsKeywordAssessment(),
			new TextCompetingLinksAssessment(),
			new ImageKeyphraseAssessment(),
			new ImageCountAssessment(),
			new TextLengthAssessment(),
			new OutboundLinksAssessment(),
			new KeyphraseInSEOTitleAssessment(),
			new InternalLinksAssessment(),
			new PageTitleWidthAssessment({
				scores : {
					widthTooShort : 9
				}
			}, true),
			new SlugKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment(),
			new SingleH1Assessment(),
			new ImageAltTagsAssessment()
		]
	}
}