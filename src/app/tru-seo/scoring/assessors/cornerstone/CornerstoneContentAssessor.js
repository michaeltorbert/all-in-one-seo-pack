import ContentAssessor from '../contentAssessor'
import { getAssessment } from '../../AssessmentRegistry'
import SentenceLengthInText from '../../assessments/readability/SentenceLengthInTextAssessment.js'
import SubheadingDistributionTooLong from '../../assessments/readability/SubheadingsDistributionTooLong.js'

/**
 * Cornerstone-specific readability assessment options.
 *
 * @since 5.0.0
 */
const CORNERSTONE_OPTIONS = {
	subheadingDistribution : {
		parameters         : { slightlyTooMany: 250, farTooMany: 300, recommendedMaximumLength: 250 },
		cornerstoneContent : true
	},
	sentenceLength : { slightlyTooMany: 20, farTooMany: 25 }
}

/**
 * The CornerStoneContentAssessor class is used for the readability analysis on cornerstone content.
 */
export default class CornerstoneContentAssessor extends ContentAssessor {
	/**
	 * Creates a new CornerStoneContentAssessor instance.
	 * Uses the AssessmentRegistry to cache and reuse assessment instances.
	 *
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'cornerstoneContentAssessor'

		// Use cached assessment instances via AssessmentRegistry.
		this.addAssessment('subheadingsTooLong', getAssessment(SubheadingDistributionTooLong, CORNERSTONE_OPTIONS.subheadingDistribution))
		this.addAssessment('textSentenceLength', getAssessment(SentenceLengthInText, CORNERSTONE_OPTIONS.sentenceLength))
	}
}