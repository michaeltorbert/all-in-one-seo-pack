import ContentAssessor from '../contentAssessor.js'
import SubheadingDistributionTooLongAssessment from '../../assessments/readability/SubheadingsDistributionTooLong.js'
import ParagraphTooLongAssessment from '../../assessments/readability/ParagraphTooLongAssessment.js'
import SentenceLengthInTextAssessment from '../../assessments/readability/SentenceLengthInTextAssessment.js'
import TransitionWordsAssessment from '../../assessments/readability/TransitionWordsAssessment.js'
import PassiveVoiceAssessment from '../../assessments/readability/PassiveVoiceAssessment.js'
import TextPresenceAssessment from '../../assessments/readability/TextPresenceAssessment.js'
import SentenceBeginningsAssessment from '../../assessments/readability/SentenceBeginningsAssessment.js'

/**
 * The StorePostsAndPagesContentAssessor class is used for the readability analysis for store posts and pages.
 */
export default class StorePostsAndPagesContentAssessor extends ContentAssessor {
	/**
	 * Creates a new StorePostsAndPagesContentAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'storePostsAndPagesContentAssessor'

		this._assessments = [
			new SubheadingDistributionTooLongAssessment(),
			new ParagraphTooLongAssessment(),
			new SentenceLengthInTextAssessment(),
			new TransitionWordsAssessment(),
			new PassiveVoiceAssessment(),
			new TextPresenceAssessment(),
			new SentenceBeginningsAssessment()
		]
	}
}