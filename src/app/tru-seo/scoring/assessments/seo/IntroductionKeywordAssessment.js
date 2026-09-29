import { __, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Assessment to check whether the keyphrase or synonyms are encountered in the first paragraph of the article.
 */
export default class IntroductionKeywordAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 * @param {Object} [config.scores] The scores to use.
	 * @param {number} [config.scores.good] The score to return if there is a match within one sentence in the first paragraph.
	 * @param {number} [config.scores.okay] The score to return if all words are matched in the first paragraph.
	 * @param {number} [config.scores.bad] The score to return if not all words are matched in the first paragraph.
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				good : 9,
				okay : 6,
				bad  : 3
			}
		}

		this.identifier = 'introductionKeyword'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Assesses the presence of keyphrase or synonyms in the first paragraph.
	 *
	 * @param {Paper} paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The result of this assessment.
	 */
	getResult (paper, researcher) {
		const assessmentResult = new AssessmentResult()
		// Whether the paper has the data needed to return meaningful feedback (keyphrase and text).
		this._canAssess = false

		if (paper.hasKeyword() && paper.hasText()) {
			this._firstParagraphMatches = researcher.getResearch('findKeywordInFirstParagraph')
			this._canAssess = true
		}
		const calculatedResult = this.calculateResult()

		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)

		return assessmentResult
	}

	/**
	 * Returns a result based on the number of occurrences of keyphrase in the first paragraph.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} result object with a score and translation text.
	 */
	calculateResult () {
		if (!this._canAssess) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in introduction', td),
				resultText  : __(
					'Add a focus keyword to enable this check.',
					td
				)
			}
		}

		if (this._firstParagraphMatches.foundInOneSentence) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Keyword in introduction', td),
				resultText  : __(
					'Your keyword appears in the first paragraph.',
					td
				)
			}
		}

		if (this._firstParagraphMatches.foundInParagraph) {
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword in introduction', td),
				resultText  : __(
					'Your keyword appears in the first paragraph, but it\'s split across multiple sentences. Try fitting it into one sentence so the topic is clear right away.',
					td
				)
			}
		}

		return {
			score       : this._config.scores.bad,
			resultTitle : __('Keyword in introduction', td),
			resultText  : sprintf(
				/* translators: 1 - The content type (e.g. "post", "category"). */
				__('Your keyword doesn\'t appear in the first paragraph. Mention it early so readers and search engines see what the %1$s is about.', td),
				this.getContentNoun()
			)
		}
	}
}