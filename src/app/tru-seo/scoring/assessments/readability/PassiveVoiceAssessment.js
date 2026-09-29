import { __, sprintf } from '@/vue/plugins/translations'
import map from 'lodash-es/map'

import formatNumber from '../../../helpers/formatNumber'
import { inRangeEndInclusive as inRange } from '../../helpers/assessments/inRange'
import marker from '../../../markers/addMark'
import { stripIncompleteTags as stripTags } from '../../../languageProcessing/helpers/sanitize/stripHTMLTags'
import AssessmentResult from '../../../values/AssessmentResult'
import Mark from '../../../values/Mark'
import Assessment from '../assessment'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether there are passive sentences in the text.
 */
export default class PassiveVoiceAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config The configuration to use.
	 */
	constructor (config = {}) {
		super()

		this.identifier = 'passiveVoice'
		this._config = config
	}

	/**
	 * Calculates the result based on the number of sentences and passives.
	 *
	 * @param {{total: number, passives:{length: number, total: number}}} passiveVoice Object containing the number of sentences and passives.
	 *
	 * @returns {{score: number, text: string, hasMarks: boolean}} Result object with score and text, and whether there are marks.
	 */
	calculatePassiveVoiceResult (passiveVoice) {
		let score = 0,
		 percentage = 0
		const recommendedValue = 10

		// Prevent division by zero errors.
		if (0 !== passiveVoice.total) {
			percentage = formatNumber((passiveVoice.passives.length / passiveVoice.total) * 100)
		}

		const hasMarks = 0 < percentage

		if (10 >= percentage) {
			// Green indicator.
			score = 9
		}

		if (inRange(percentage, 10, 15)) {
			// Orange indicator.
			score = 6
		}

		if (15 < percentage) {
			// Red indicator.
			score = 3
		}

		if (7 <= score) {
			return {
				score    : score,
				hasMarks : hasMarks,
				text     : __(
					'You\'re using mostly active voice.',
					td
				)
			}
		}
		return {
			score    : score,
			hasMarks : hasMarks,
			text     : sprintf(
				/* translators: %1$s expands to the percentage of sentences in passive voice, %2$s expands to the recommended value. */
				__(
					'%1$s of your sentences are in passive voice — more than the recommended %2$s. Active voice ("we shipped the feature") is usually clearer than passive ("the feature was shipped").',
					td
				),
				percentage + '%',
				recommendedValue + '%'
			)
		}
	}

	/**
	 * Marks all sentences that have the passive voice.
	 *
	 * @param {Paper} _paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {Mark[]} All marked sentences.
	 */
	getMarks (_paper, researcher) {
		const passiveVoice = researcher.getResearch('getPassiveVoiceResult')
		return map(passiveVoice.passives, function (sentence) {
			sentence = stripTags(sentence)
			const marked = marker(sentence)
			return new Mark({
				original : sentence,
				marked   : marked
			})
		})
	}

	/**
	 * Runs the passiveVoice module, based on this returns an assessment result with score and text.
	 *
	 * @param {Paper} _paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	getResult (_paper, researcher) {
		const passiveVoice = researcher.getResearch('getPassiveVoiceResult')

		const passiveVoiceResult = this.calculatePassiveVoiceResult(passiveVoice)

		const assessmentResult = new AssessmentResult()

		assessmentResult.setScore(passiveVoiceResult.score)
		assessmentResult.setTitle(__('Passive voice', td))
		assessmentResult.setText(passiveVoiceResult.text)
		assessmentResult.setHasMarks(passiveVoiceResult.hasMarks)

		return assessmentResult
	}

	/**
	 * Checks if passive voice analysis is available for the language of the paper.
	 *
	 * @param {Paper}       _paper      The paper to check.
	 * @param {Researcher}  researcher  The researcher object.
	 *
	 * @returns {boolean} Returns true if the researcher has the passive voice research.
	 */
	isApplicable (_paper, researcher) {
		return researcher.hasResearch('getPassiveVoiceResult')
	}
}