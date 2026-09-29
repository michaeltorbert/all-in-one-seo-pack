import Assessor from './assessor.js'
import { getAssessment } from '../AssessmentRegistry'
import IntroductionKeyword from '../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLength from '../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../assessments/seo/KeywordDensityAssessment.js'
import TextCompetingLinks from '../assessments/seo/TextCompetingLinksAssessment.js'
import FunctionWordsInKeyphrase from '../assessments/seo/FunctionWordsInKeyphraseAssessment'
import ImageKeyphrase from '../assessments/seo/KeyphraseInImagesAssessment'
import ValidOnlyResultsScoreAggregator from '../scoreAggregators/ValidOnlyResultsScoreAggregator'

/**
 * Keyphrase length options for related keyword assessor.
 *
 * @since 5.0.0
 */
const RELATED_KEYPHRASE_OPTIONS = { isRelatedKeyphrase: true }

/**
 * The relatedKeywordAssessor class is used for the related keyword analysis.
 */
export default class RelatedKeywordAssessor extends Assessor {
	/**
	 * Creates a new RelatedKeywordAssessor instance.
	 * Uses the AssessmentRegistry to cache and reuse assessment instances.
	 *
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'relatedKeywordAssessor'

		// Use cached assessment instances via AssessmentRegistry.
		this._assessments = [
			getAssessment(IntroductionKeyword),
			getAssessment(KeyphraseLength, RELATED_KEYPHRASE_OPTIONS),
			getAssessment(KeyphraseDensityAssessment),
			getAssessment(FunctionWordsInKeyphrase),
			getAssessment(TextCompetingLinks),
			getAssessment(ImageKeyphrase)
		]

		this._scoreAggregator = new ValidOnlyResultsScoreAggregator()
	}
}