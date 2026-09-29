import { __ } from '@/vue/plugins/translations'
import AssessmentResult from '../../../values/AssessmentResult'
import Assessment from '../assessment'
import merge from 'lodash-es/merge'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether there is enough text in the paper.
 */
export default class TextPresenceAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config The configuration to use.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				bad  : 3,
				good : 9
			}
		}

		this.identifier = 'textPresence'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Assesses that the paper has at least a little bit of content.
	 *
	 * @param {Paper} paper The paper to assess.
	 *
	 * @returns {AssessmentResult} The result of this assessment.
	 */
	getResult (paper) {
		const assessmentResult = new AssessmentResult()

		if (!this.hasEnoughContentForAssessment(paper)) {
			assessmentResult.setTitle(__('Not enough content', td))
			assessmentResult.setText(__(
				'Your post is too short for a full analysis. Add at least a few paragraphs to get useful recommendations.',
				td
			))

			assessmentResult.setScore(this._config.scores.bad)
			return assessmentResult
		}

		assessmentResult.setTitle(__('Content length', td))
		assessmentResult.setText(__(
			'Your post has enough content to analyze.',
			td
		))
		assessmentResult.setScore(this._config.scores.good)
		return assessmentResult
	}
}