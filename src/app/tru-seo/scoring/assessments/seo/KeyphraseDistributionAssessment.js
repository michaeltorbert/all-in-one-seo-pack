import { __ } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Represents an assessment that returns a score based on the largest percentage of text in which no keyphrase occurs.
 */
class KeyphraseDistributionAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] 							The configuration to use.
	 * @param {Object} [config.scores] 						The scores to use.
	 * @param {Object} [config.parameters] 					The parameters to use.
	 * @param {number} [config.parameters.maxGoodDistractionPercentage]
	 *      The maximum distraction percentage allowed to receive a GOOD result.
	 *      The percentage represents the largest portion of text without the keyphrase.
	 * @param {number} [config.parameters.maxAcceptableDistractionPercentage]
	 *      The maximum distraction percentage allowed to receive an OKAY result.
	 * @param {Object} [config.scores]                		The scores to use.
	 * @param {number} [config.scores.good]             	The score to return if keyword occurrences are evenly distributed.
	 * @param {number} [config.scores.okay]             	The score to return if keyword occurrences are somewhat unevenly distributed.
	 * @param {number} [config.scores.bad]              	The score to return if there is way too much text between keyword occurrences.
	 * @param {number} [config.scores.noKeyphraseOrText]  	The score to return if there is no text and/or no keyphrase set.
	 * @param {Object} [config.callbacks] 					The callbacks to use for the assessment.
	 * @param {Function} [config.callbacks.getResultTexts]	The function that returns the result texts.
	 *
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			parameters : {
				maxGoodDistractionPercentage       : 30,
				maxAcceptableDistractionPercentage : 50
			},
			scores : {
				good              : 9,
				okay              : 6,
				bad               : 1,
				noKeyphraseOrText : 1
			},
			callbacks : {}
		}

		this.identifier = 'keyphraseDistribution'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Runs the keyphraseDistribution research and based on this returns an assessment result.
	 *
	 * @param {Paper}      paper      The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (paper, researcher) {
		// Whether the paper has the data needed to return meaningful feedback (keyphrase and text).
		this._canAssess = false
		this._keyphraseDistribution = researcher.getResearch('keyphraseDistribution')

		if (paper.hasKeyword() && paper.hasText()) {
			this._canAssess = true
		}

		const assessmentResult = new AssessmentResult()

		const calculatedResult = this.calculateResult()

		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)
		assessmentResult.setHasMarks(calculatedResult.hasMarks)

		return assessmentResult
	}

	/**
	 * Calculates the result based on the keyphrase distraction percentage from the keyphraseDistribution research.
	 *
	 * @returns {{score: number, hasMarks: boolean, resultTitle: string, resultText: string}} The calculated result.
	 */
	calculateResult () {
		const {
			good: goodResultText,
			okay: okayResultText,
			bad: badResultText,
			noKeyphraseOrText: noKeyphraseOrTextResultText
		} = this.getFeedbackStrings()

		const distractionPercentage = this._keyphraseDistribution.keyphraseDistractionPercentage
		const hasMarks = 0 < this._keyphraseDistribution.sentencesToHighlight?.length

		if (!this._canAssess || 100 === distractionPercentage) {
			return {
				score       : this._config.scores.noKeyphraseOrText,
				resultTitle : __('Keyword distribution', td),
				hasMarks    : hasMarks,
				resultText  : noKeyphraseOrTextResultText
			}
		}

		if (distractionPercentage > this._config.parameters.maxAcceptableDistractionPercentage) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword distribution', td),
				hasMarks    : hasMarks,
				resultText  : badResultText
			}
		}

		if (distractionPercentage > this._config.parameters.maxGoodDistractionPercentage &&
			distractionPercentage <= this._config.parameters.maxAcceptableDistractionPercentage
		) {
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword distribution', td),
				hasMarks    : hasMarks,
				resultText  : okayResultText
			}
		}

		return {
			score       : this._config.scores.good,
			resultTitle : __('Keyword distribution', td),
			hasMarks    : hasMarks,
			resultText  : goodResultText
		}
	}

	/**
	 * Gets the feedback strings for the keyphrase distribution assessment.
	 * If you want to override the feedback strings, you can do so by providing a custom callback in the config: `this._config.callbacks.getResultTexts`.
	 * The callback function should return an object with the following properties:
	 * - good: string
	 * - okay: string
	 * - bad: string
	 * - noKeyphraseOrText: string
	 *
	 * @returns {{good: string, okay: string, bad: string, noKeyphraseOrText: string}} The feedback strings.
	 */
	getFeedbackStrings () {
		if (!this._config.callbacks.getResultTexts) {
			return {
				good              : __('Your keyword is spread evenly through your post.', td),
				okay              : __('Some sections of your post don\'t mention your keyword. Try working it into those sections naturally.', td),
				bad               : __('Large sections of your post don\'t mention your keyword. Try working it into those sections so the topic stays clear throughout.', td),
				noKeyphraseOrText : __('Add a focus keyword to enable this check.', td)
			}
		}

		return this._config.callbacks.getResultTexts()
	}

	/**
	 * Creates a marker for all content words in keyphrase and synonyms.
	 *
	 * @returns {string[]} All markers for the current text.
	 */
	getMarks () {
		return this._keyphraseDistribution.sentencesToHighlight
	}
}

export default KeyphraseDistributionAssessment