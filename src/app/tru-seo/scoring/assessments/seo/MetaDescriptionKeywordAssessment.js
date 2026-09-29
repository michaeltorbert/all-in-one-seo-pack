import { __, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Assessment for checking the keyword matches in the meta description.
 */
export default class MetaDescriptionKeywordAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 * @param {number} [config.scores.good] The score to return if there are enough keyword occurrences in the meta description.
	 * @param {number} [config.scores.bad] The score to return if there are no or too many keyword occurrences in the meta description.
	 *
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				good : 9,
				bad  : 3
			}
		}

		this.identifier = 'metaDescriptionKeyword'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Runs the metaDescriptionKeyword researcher and based on this, returns an assessment result with score.
	 *
	 * @param {Paper}      paper      The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (paper, researcher) {
		// Whether the paper has the data needed to return meaningful feedback (keyphrase and meta description).
		this._canAssess = false

		if (paper.hasKeyword() && paper.hasDescription()) {
			this._keyphraseCounts = researcher.getResearch('metaDescriptionKeyword')
			this._canAssess = true
		}

		const assessmentResult = new AssessmentResult()
		const calculatedResult = this.calculateResult()

		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)
		if (9 > assessmentResult.getScore()) {
			assessmentResult.setHasJumps(true)
		}

		return assessmentResult
	}

	/**
	 * Returns the result object based on the number of keyword matches in the meta description.
	 *
	 * @returns {{score: number, resultText: string}} Result object with score and text.
	 */
	calculateResult () {
		if (!this._canAssess) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in meta description', td),
				resultText  : __(
					'Please add both a keyword and a meta description containing the keyword.',
					td
				)
			}
		}

		// GOOD result when the meta description contains a keyphrase or synonym 1 or 2 times.
		if (1 === this._keyphraseCounts || 2 === this._keyphraseCounts) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Keyword in meta description', td),
				resultText  : __(
					'Keyword appears in the meta description. Well done!',
					td
				)
			}
		}

		// BAD if the description contains every keyword term more than twice.
		if (3 <= this._keyphraseCounts) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in meta description', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of sentences containing the keyword, */
					__(
						'Your meta description uses the keyword %1$d times — over the recommended 2. Trim it so the snippet reads naturally.',
						td
					),
					this._keyphraseCounts
				)
			}
		}

		// BAD if the keyphrase is not contained in the meta description.
		return {
			score       : this._config.scores.bad,
			resultTitle : __('Keyword in meta description', td),
			resultText  : __(
				'Your meta description doesn\'t include your keyword. Add it — search engines often bold matching words in the snippet, which can earn more clicks.',
				td
			)
		}
	}
}