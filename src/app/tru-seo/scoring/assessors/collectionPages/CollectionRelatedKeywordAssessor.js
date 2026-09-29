import RelatedKeywordAssessor from '../relatedKeywordAssessor'
import IntroductionKeywordAssessment from '../../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLengthAssessment from '../../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../../assessments/seo/KeywordDensityAssessment.js'
import MetaDescriptionKeywordAssessment from '../../assessments/seo/MetaDescriptionKeywordAssessment.js'
import FunctionWordsInKeyphraseAssessment from '../../assessments/seo/FunctionWordsInKeyphraseAssessment.js'

/**
 * The CollectionRelatedKeywordAssessor class is used for the related keyword analysis for collections.
 */
export default class CollectionRelatedKeywordAssessor extends RelatedKeywordAssessor {
	/**
	 * Creates a new CollectionRelatedKeywordAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'collectionRelatedKeywordAssessor'

		this._assessments = [
			new IntroductionKeywordAssessment(),
			new KeyphraseLengthAssessment({
				isRelatedKeyphrase : true
			}),
			new KeyphraseDensityAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment()
		]
	}
}