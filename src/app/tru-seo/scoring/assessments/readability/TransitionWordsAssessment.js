import { __, sprintf } from '@/vue/plugins/translations'
import map from 'lodash-es/map'
import merge from 'lodash-es/merge'

import formatNumber from '../../../helpers/formatNumber'
import { inRangeStartInclusive as inRange } from '../../helpers/assessments/inRange'
import { stripIncompleteTags as stripTags } from '../../../languageProcessing/helpers/sanitize/stripHTMLTags'
import AssessmentResult from '../../../values/AssessmentResult'
import Mark from '../../../values/Mark.js'
import marker from '../../../markers/addMark.js'
import Assessment from '../assessment'
import removeHtmlBlocks from '../../../languageProcessing/helpers/html/htmlParser'
import getWords from '../../../languageProcessing/helpers/word/getWords'
import { filterShortcodesFromHTML } from '../../../languageProcessing/helpers'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether there are enough transition words in the text.
 */
export default class TransitionWordsAssessment extends Assessment {
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
			transitionWordsNeededIfTextLongerThan : 200
		}

		this.identifier = 'textTransitionWords'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Calculates the actual percentage of transition words in the sentences.
	 *
	 * @param {Object} sentences The object containing the total number of sentences and the number of sentences containing
	 * a transition word.
	 *
	 * @returns {number} The percentage of sentences containing a transition word.
	 */
	calculateTransitionWordPercentage (sentences) {
		if (0 === sentences.transitionWordSentences || 0 === sentences.totalSentences) {
			return 0
		}

		return formatNumber((sentences.transitionWordSentences / sentences.totalSentences) * 100)
	}

	/**
	 * Calculates the score for the assessment based on the percentage of sentences containing transition words.
	 *
	 * @param {number} percentage The percentage of sentences containing transition words.
	 *
	 * @returns {number} The score.
	 */
	calculateScoreFromPercentage (percentage) {
		if (20 > percentage) {
			// Red indicator.
			return 3
		}

		if (inRange(percentage, 20, 30)) {
			// Orange indicator.
			return 6
		}

		// Green indicator.
		return 9
	}

	/**
	 * Calculates transition word result.
	 *
	 * @param {Object} transitionWordSentences  The object containing the total number of sentences and the number of sentences containing
	 *                                          a transition word.
	 * @param {number} textLength               The length of the text.
	 *
	 * @returns {Object} Object containing score and text.
	 */
	calculateTransitionWordResult (transitionWordSentences, textLength) {
		const percentage = this.calculateTransitionWordPercentage(transitionWordSentences)
		const score = this.calculateScoreFromPercentage(percentage)
		// Marks flag the sentences that lack a transition word (the ones to fix), so
		// there's something to highlight whenever at least one sentence has none.
		const hasMarks   = 0 < (transitionWordSentences.nonTransitionWordSentences?.length || 0)

		// If the text is shorter than the minimum required length for transition words, we always return a green traffic light.
		if (textLength < this._config.transitionWordsNeededIfTextLongerThan) {
			if (0 < percentage) {
				return {
					score    : formatNumber(9),
					hasMarks : hasMarks,
					text     : __(
						'Your post uses transition words to connect ideas.',
						td
					)
				}
			}
			return {
				score    : formatNumber(9),
				hasMarks : hasMarks,
				text     : __(
					'Your post is short enough that transition words aren\'t needed.',
					td
				)
			}
		}

		if (7 > score && 0 === percentage) {
			return {
				score    : formatNumber(score),
				hasMarks : hasMarks,
				text     : __(
					'None of your sentences use transition words like "however", "because", or "for example". Adding a few helps your post flow.',
					td
				)
			}
		}

		if (7 > score) {
			return {
				score    : formatNumber(score),
				hasMarks : hasMarks,
				text     : sprintf(
					/* translators: %1$s expands to the percentage of sentences containing transition words */
					__(
						'Only %1$s of your sentences use transition words like "however", "because", or "for example". Adding more helps your post flow.',
						td
					),
					percentage + '%'
				)
			}
		}

		return {
			score    : formatNumber(score),
			hasMarks : hasMarks,
			text     : __(
				'Your post uses transition words to connect ideas.',
				td
			)
		}
	}

	/**
	 * Scores the percentage of sentences including one or more transition words.
	 *
	 * @param {Object} paper        The paper to use for the assessment.
	 * @param {Object} researcher   The researcher used for calling research.
	 *
	 * @returns {Object} The Assessment result.
	 */
	getResult (paper, researcher) {
		const customCountLength = researcher.getHelper('customCountLength')
		const customMinimumRequiredTextLength = researcher.getConfig('assessmentApplicability').transitionWords
		if (customMinimumRequiredTextLength) {
			this._config.transitionWordsNeededIfTextLongerThan = customMinimumRequiredTextLength
		}
		let text = paper.getText()
		text = removeHtmlBlocks(text)
		text = filterShortcodesFromHTML(text, paper._attributes?.shortcodes)
		const textLength = customCountLength ? customCountLength(text) : getWords(text).length

		const transitionWordSentences = researcher.getResearch('findTransitionWords')

		const transitionWordResult = this.calculateTransitionWordResult(transitionWordSentences, textLength)
		const assessmentResult = new AssessmentResult()

		assessmentResult.setScore(transitionWordResult.score)
		assessmentResult.setTitle(7 <= transitionWordResult.score ? __('Transition words', td) : __('Missing transition words', td))
		assessmentResult.setText(transitionWordResult.text)
		assessmentResult.setHasMarks(transitionWordResult.hasMarks)

		return assessmentResult
	}

	/**
	 * Marks text for the transition words assessment.
	 *
	 * Marks the sentences that are *missing* a transition word — the ones the user
	 * needs to fix — not the sentences that already have one.
	 *
	 * @param {Paper}       _paper      The paper to use for the marking.
	 * @param {Researcher}  researcher  The researcher containing the necessary research.
	 *
	 * @returns {Array<Mark>} A list of marks that should be applied.
	 */
	getMarks (_paper, researcher) {
		const transitionWordSentences = researcher.getResearch('findTransitionWords')

		return map(transitionWordSentences.nonTransitionWordSentences, function (sentence) {
			sentence = stripTags(sentence)
			return new Mark({
				original : sentence,
				marked   : marker(sentence)
			})
		})
	}

	/**
	 * Checks if the transition words assessment is applicable to the paper.
	 *
	 * @param {Paper}       _paper      Unused; kept for the Assessor interface signature.
	 * @param {Researcher}  researcher  The researcher object.
	 *
	 * @returns {boolean} Returns true if the assessment is available in the researcher of the language.
	 */
	isApplicable (_paper, researcher) {
		return researcher.hasResearch('findTransitionWords')
	}
}