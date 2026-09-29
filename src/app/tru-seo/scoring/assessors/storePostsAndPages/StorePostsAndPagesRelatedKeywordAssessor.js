import RelatedKeywordAssessor from '../relatedKeywordAssessor.js'
import IntroductionKeywordAssessment from '../../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLengthAssessment from '../../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../../assessments/seo/KeywordDensityAssessment.js'
import MetaDescriptionKeywordAssessment from '../../assessments/seo/MetaDescriptionKeywordAssessment.js'
import TextCompetingLinksAssessment from '../../assessments/seo/TextCompetingLinksAssessment.js'
import FunctionWordsInKeyphraseAssessment from '../../assessments/seo/FunctionWordsInKeyphraseAssessment.js'
import ImageKeyphraseAssessment from '../../assessments/seo/KeyphraseInImagesAssessment.js'

/**
 * The StorePostsAndPagesRelatedKeywordAssessor class is used for the related keyword analysis for store posts and pages.
 */
export default class StorePostsAndPagesRelatedKeywordAssessor extends RelatedKeywordAssessor {
	/**
	 * Creates a new StorePostsAndPagesRelatedKeywordAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'storePostsAndPagesRelatedKeywordAssessor'

		this._assessments = [
			new IntroductionKeywordAssessment(),
			new KeyphraseLengthAssessment({
				isRelatedKeyphrase : true
			}),
			new KeyphraseDensityAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment(),
			new TextCompetingLinksAssessment(),
			new ImageKeyphraseAssessment()
		]
	}
}