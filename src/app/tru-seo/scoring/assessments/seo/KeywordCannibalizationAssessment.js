import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'
import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether other posts target the same focus keyphrase.
 *
 * @since 5.0.0
 */
export default class KeywordCannibalizationAssessment extends Assessment {
	/**
	 * Constructs a keyword cannibalization assessment.
	 *
	 * @since 5.0.0
	 *
	 * @param {Object} [config]        Potential additional config for the assessment.
	 * @param {Object} [config.scores] The scores to use for the assessment.
	 * @param {number} [config.scores.good] The score to return if no other posts target the same keyphrase.
	 * @param {number} [config.scores.bad]  The score to return if other posts target the same keyphrase.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		this.identifier = 'keywordCannibalization'
		this._config = {
			scores : {
				good : 9,
				bad  : 3
			},
			...config
		}
	}

	/**
	 * Executes the assessment and returns a result based on the cannibalization data.
	 *
	 * @since 5.0.0
	 *
	 * @param {Paper} paper The paper to use for the assessment.
	 *
	 * @returns {AssessmentResult} An assessment result with the score and formatted text.
	 */
	getResult (paper) {
		const assessmentResult = new AssessmentResult()
		const customData = paper.getCustomData()
		const cannibalizationData = customData?.keywordCannibalization

		if (!cannibalizationData) {
			return assessmentResult
		}

		const cannibalizingPosts = cannibalizationData.cannibalizingPosts || []

		// The check spans posts and terms — a category and a post competing for one keyword
		// cannibalize each other — so the copy commits to neither noun.
		if (0 === cannibalizingPosts.length) {
			assessmentResult.setScore(this._config.scores.good)
			assessmentResult.setTitle(__('Keyword cannibalization', td))
			assessmentResult.setText(__('No other content on your site targets this keyword.', td))
		} else {
			assessmentResult.setScore(this._config.scores.bad)
			assessmentResult.setTitle(__('Keyword cannibalization', td))

			const postTitles = cannibalizingPosts.map(p => `"${p.title}"`).join(', ')
			assessmentResult.setText(
				sprintf(
					/* translators: 1 - A comma-separated list of post and term titles. */
					__('This keyword is also targeted by: %1$s. Consider giving each a different keyword, or combining them into one.', td),
					postTitles
				)
			)
		}

		return assessmentResult
	}

	/**
	 * Checks whether the assessment is applicable.
	 *
	 * Only applicable when the paper has a keyword and cannibalization data is available.
	 *
	 * @since 5.0.0
	 *
	 * @param {Paper} paper The paper to check.
	 *
	 * @returns {boolean} Whether the assessment is applicable.
	 */
	isApplicable (paper) {
		if (!paper.hasKeyword()) {
			return false
		}

		const customData = paper.getCustomData()

		return !!customData?.keywordCannibalization
	}
}