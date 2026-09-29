import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import Mark from '../../../values/Mark'
import AssessmentResult from '../../../values/AssessmentResult'
import { _n, __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether there is an over-use of center-alignment in the text.
 */
export default class TextAlignmentAssessment extends Assessment {
	/**
	 * Constructs a new TextAlignmentAssessment.
	 *
	 * @param {Object} config The configuration to use.
	 * @param {Object} [config.scores] The scores to use for the assessment.
	 * @param {number} [config.scores.bad] The score to return if the text has an over-use of center-alignment.
	 * @param {Object} [config.callbacks] The callbacks to use for the assessment.
	 * @param {Function} [config.callbacks.getResultTexts] The function that returns the result texts.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				bad : 2
			},
			callbacks : {}
		}

		this._config = merge(defaultConfig, config)

		this.identifier = 'textAlignment'
	}

	/**
	 * Executes the assessment and returns a result.
	 *
	 * @param {Paper}       paper       The Paper object to assess.
	 * @param {Researcher}  researcher  The researcher used in the assessment.
	 *
	 * @returns {AssessmentResult} The result of the assessment, containing both a score and a descriptive text.
	 */
	getResult (paper, researcher) {
		const longCenterAlignedTexts = researcher.getResearch('getLongCenterAlignedTexts')
		this.numberOfLongCenterAlignedTexts = longCenterAlignedTexts.length

		const assessmentResult = new AssessmentResult()
		// We don't want to show the assessment and its feedback when the paper doesn't contain center-aligned text.
		if (0 === this.numberOfLongCenterAlignedTexts) {
			return assessmentResult
		}

		const calculatedScore = this.calculateResult(paper, this.numberOfLongCenterAlignedTexts)

		assessmentResult.setScore(calculatedScore.score)
		assessmentResult.setTitle(__('Text alignment', td))
		assessmentResult.setText(calculatedScore.resultText)
		// We always want to highlight the long center-aligned element.
		assessmentResult.setHasMarks(true)

		return assessmentResult
	}

	/**
	 * Creates the mark objects for all long center-aligned texts.
	 *
	 * @param {Paper}       _paper       The paper to use for the assessment.
	 * @param {Researcher}  researcher   The researcher used in the assessment.
	 *
	 * @returns {Mark[]} Mark objects for all long center-aligned texts.
	 */
	getMarks (_paper, researcher) {
		const nodes = researcher.getResearch('getLongCenterAlignedTexts')
		return nodes.map(node => new Mark({
			original : node.innerText() || '',
			position : {
				clientId         : node.clientId || '',
				startOffset      : node.sourceCodeLocation.startOffset,
				endOffset        : node.sourceCodeLocation.endOffset,
				startOffsetBlock : 0,
				endOffsetBlock   : node.sourceCodeLocation.endOffset - node.sourceCodeLocation.startOffset
			}
		})
		)
	}

	/**
	 * Checks whether the assessment is applicable.
	 * The assessment is applicable when the paper has at least 50 characters (after sanitation)
	 * and when the researcher has `getLongCenterAlignedTexts` research.
	 *
	 * @param {Paper}       _paper      The paper to use for the assessment.
	 * @param {Researcher}  researcher  The researcher used in the assessment.
	 *
	 * @returns {boolean} True when the researcher has `getLongCenterAlignedText` research.
	 */
	isApplicable (_paper, researcher) {
		return researcher.hasResearch('getLongCenterAlignedTexts')
	}

	/**
	 * Calculates the result based on the number of center-aligned text found in the paper.
	 *
	 * @param {Paper}   paper                           The Paper object to assess.
	 * @param {number}  numberOfLongCenterAlignedTexts  The number of paragraphs and/or headings
	 * that are center aligned and longer than 50 characters.
	 *
	 * @returns {Object} The calculated result.
	 */
	calculateResult (paper, numberOfLongCenterAlignedTexts) {
		const { rightToLeft, leftToRight } = this.getFeedbackStrings()
		if (0 < numberOfLongCenterAlignedTexts) {
			if ('RTL' === paper.getWritingDirection()) {
				return {
					score      : this._config.scores.bad,
					resultText : rightToLeft
				}
			}
			return {
				score      : this._config.scores.bad,
				resultText : leftToRight
			}
		}
	}

	/**
	 * Returns the feedback strings for the assessment.
	 * If you want to override the feedback strings, you can do so by providing a custom callback in the config: `this._config.callbacks.getResultTexts`.
	 * This callback function should return an object with the following properties:
	 * - rightToLeft: string
	 * - leftToRight: string
	 * The singular strings are used when there is only one long center-aligned text, the plural strings are used when there are multiple.
	 * rightToLeft is for the feedback string that is shown when the writing direction is right-to-left.
	 * leftToRight is for the feedback string that is shown when the writing direction is left-to-right.
	 *
	 * @returns {{leftToRight: string, rightToLeft: string}} The feedback strings.
	 */
	getFeedbackStrings () {
		if (!this._config.callbacks.getResultTexts) {
			return {
				rightToLeft : sprintf(
					// Translators: 1 - The number of long center-aligned text sections found.
					_n(
						'%d long section of your post is center-aligned. For readable paragraphs, switch it to right-aligned.',
						'%d long sections of your post are center-aligned. For readable paragraphs, switch them to right-aligned.',
						this.numberOfLongCenterAlignedTexts,
						td
					),
					this.numberOfLongCenterAlignedTexts
				),
				leftToRight : sprintf(
					// Translators: 1 - The number of long center-aligned text sections found.
					_n(
						'%d long section of your post is center-aligned. For readable paragraphs, switch it to left-aligned.',
						'%d long sections of your post are center-aligned. For readable paragraphs, switch them to left-aligned.',
						this.numberOfLongCenterAlignedTexts,
						td
					),
					this.numberOfLongCenterAlignedTexts
				)
			}
		}

		return this._config.callbacks.getResultTexts({
			numberOfLongCenterAlignedTexts : this.numberOfLongCenterAlignedTexts
		})
	}
}