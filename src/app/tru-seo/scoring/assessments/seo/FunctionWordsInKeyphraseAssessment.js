import { __, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Assessment to check whether the keyphrase/keyword only contains function words.
 */
class FunctionWordsInKeyphraseAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 * @param {number} [config.scores.onlyFunctionWords] The score to return if the keyword contains only function words.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				onlyFunctionWords : 0,
				good              : 9
			}
		}

		this.identifier = 'functionWordsInKeyphrase'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Runs the functionWordsInKeyphrase researcher, based on this returns an assessment result with score.
	 *
	 * @param {Paper} 		paper 		The paper to use for the assessment.
	 * @param {Researcher} 	researcher 	The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	getResult (paper, researcher) {
		this._functionWordsInKeyphrase = researcher.getResearch('functionWordsInKeyphrase')
		this._keyword = paper.getKeyword()

		const calculatedScore = this.calculateResult()

		const assessmentResult = new AssessmentResult()
		assessmentResult.setScore(calculatedScore.score)
		assessmentResult.setTitle(calculatedScore.resultTitle)
		assessmentResult.setText(calculatedScore.resultText)
		assessmentResult.setHasJumps(calculatedScore.hasJumps)

		return assessmentResult
	}

	calculateResult () {
		if (this._functionWordsInKeyphrase) {
			return {
				score       : this._config.scores.onlyFunctionWords,
				hasJumps    : true,
				resultTitle : __('Function words in keyword', td),
				resultText  : sprintf(
					/* translators: %1$s expands to the focus keyword of the article. */
					__(
						'Your keyword "%1$s" only consists of filler words like "the" or "and". Pick a more specific term someone might search for.',
						td
					),
					this._keyword
				)
			}
		}

		return {
			score       : this._config.scores.good,
			hasJumps    : false,
			resultTitle : __('Function words in keyword', td),
			resultText  : sprintf(
				/* translators: %1$s expands to the focus keyword of the article. */
				__(
					'Your keyword "%1$s" includes words people actually search for.',
					td
				),
				this._keyword
			)
		}
	}

	/**
	 * Checks if assessment is applicable to the paper.
	 *
	 * @param {Paper} 		paper 			The paper to be analyzed.
	 * @param {Researcher}  researcher  	The researcher object.
	 *
	 * @returns {boolean} Whether the paper has a keyword and the researcher has the relevant research.
	 */
	isApplicable (paper, researcher) {
		return paper.hasKeyword() && researcher.hasResearch('functionWordsInKeyphrase')
	}
}

export default FunctionWordsInKeyphraseAssessment