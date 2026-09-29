import { __ } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment.js'
import marker from '../../../markers/addMark.js'
import AssessmentResult from '../../../values/AssessmentResult.js'
import Mark from '../../../values/Mark.js'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Assessment to check whether a post contains more than one H1 heading.
 * The post title counts as an H1 when present, since most themes render it as the page's H1 — so any H1 in the body content is a second one.
 */
export default class SingleH1Assessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] 				The configuration to use.
	 * @param {Object} [config.scores] 			The scores to use.
	 * @param {number} [config.scores.good] 	The score to return if there is at most one H1 heading (the title counts as one).
	 * @param {number} [config.scores.bad] 		The score to return if there are two or more H1 headings (the title counts as one).
	 *
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				good : 9,
				bad  : 1
			}
		}

		this.identifier = 'singleH1'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Runs the h1 research and based on this returns an assessment result with a score.
	 *
	 * @param {Paper}       paper       The paper to use for the assessment.
	 * @param {Researcher}  researcher  The researcher used for calling the research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (paper, researcher) {
		this._h1s = researcher.getResearch('h1s')
		// The post title is rendered as the page's H1 on most themes, so count it as one.
		this._titleH1Count = paper?.hasPostTitle?.() ? 1 : 0

		const assessmentResult = new AssessmentResult()

		const calculatedResult = this.calculateResult()

		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)

		if (1 === calculatedResult.score) {
			assessmentResult.setHasMarks(true)
		}

		return assessmentResult
	}

	/**
	 * Returns the score and the feedback string for the single H1 assessment.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The calculated result with a score and text.
	 */
	calculateResult () {
		const h1Count = this._h1s.length + this._titleH1Count

		if (1 >= h1Count) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Single title', td),
				resultText  : __(
					'You have one main heading.',
					td
				)
			}
		}

		if (1 < h1Count) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Single title', td),
				resultText  : __(
					'Your post has more than one H1 heading. The H1 should be your main title — change the others to H2 or H3 so search engines know which heading is the most important.',
					td
				)
			}
		}
	}

	/**
	 * Marks all H1s in the body of the text, regardless of their position in the text.
	 *
	 * @returns {Array} Array with all the marked H1s.
	 */
	getMarks () {
		return this._h1s.map(function (h1) {
			return new Mark({
				original : '<h1>' + h1.content + '</h1>',
				marked   : '<h1>' + marker(h1.content) + '</h1>',
				position : {
					startOffset      : h1.position.startOffset,
					endOffset        : h1.position.endOffset,
					startOffsetBlock : 0,
					endOffsetBlock   : h1.position.endOffset - h1.position.startOffset,
					clientId         : h1.position.clientId
				}
			})
		})
	}
}