import Assessor from './assessor'
import { getAssessment } from '../AssessmentRegistry'
import IntroductionKeywordAssessment from '../assessments/seo/IntroductionKeywordAssessment'
import KeyphraseLengthAssessment from '../assessments/seo/KeyphraseLengthAssessment'
import KeyphraseDensityAssessment from '../assessments/seo/KeywordDensityAssessment'
import MetaDescriptionKeywordAssessment from '../assessments/seo/MetaDescriptionKeywordAssessment'
import TextCompetingLinksAssessment from '../assessments/seo/TextCompetingLinksAssessment'
import KeyphraseInSEOTitleAssessment from '../assessments/seo/KeyphraseInSEOTitleAssessment'
import SlugKeywordAssessment from '../assessments/seo/UrlKeywordAssessment'
import SubheadingsKeyword from '../assessments/seo/SubHeadingsKeywordAssessment'
import ImageKeyphrase from '../assessments/seo/KeyphraseInImagesAssessment'
import FunctionWordsInKeyphrase from '../assessments/seo/FunctionWordsInKeyphraseAssessment'
import SEOScoreAggregator from '../scoreAggregators/SEOScoreAggregator'
import MetaDescriptionLength from '../assessments/seo/MetaDescriptionLengthAssessment'
import ImageCount from '../assessments/seo/TextImagesAssessment'
import TextLength from '../assessments/seo/TextLengthAssessment'
import OutboundLinks from '../assessments/seo/OutboundLinksAssessment'
import InternalLinksAssessment from '../assessments/seo/InternalLinksAssessment'
import TitleWidth from '../assessments/seo/PageTitleWidthAssessment'
import SingleH1Assessment from '../assessments/seo/SingleH1Assessment'
import ImageAltTagsAssessment from '../assessments/seo/ImageAltTagsAssessment'

/**
 * The SEOAssessor class is used for the general SEO analysis.
 */
export default class SEOAssessor extends Assessor {
	/**
	 * Creates a new SEOAssessor instance.
	 * Uses the AssessmentRegistry to cache and reuse assessment instances.
	 *
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'SEOAssessor'

		// Use cached assessment instances via AssessmentRegistry.
		this._assessments = [
			getAssessment(IntroductionKeywordAssessment),
			getAssessment(KeyphraseLengthAssessment),
			getAssessment(KeyphraseDensityAssessment),
			getAssessment(MetaDescriptionKeywordAssessment),
			getAssessment(MetaDescriptionLength),
			getAssessment(SubheadingsKeyword),
			getAssessment(TextCompetingLinksAssessment),
			getAssessment(ImageKeyphrase),
			getAssessment(ImageCount),
			getAssessment(TextLength),
			getAssessment(OutboundLinks),
			getAssessment(KeyphraseInSEOTitleAssessment),
			getAssessment(InternalLinksAssessment),
			getAssessment(TitleWidth),
			getAssessment(SlugKeywordAssessment),
			getAssessment(FunctionWordsInKeyphrase),
			getAssessment(SingleH1Assessment),
			getAssessment(ImageAltTagsAssessment)
		]

		this._scoreAggregator = new SEOScoreAggregator()
	}
}