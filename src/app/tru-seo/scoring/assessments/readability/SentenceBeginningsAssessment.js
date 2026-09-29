import partition from 'lodash-es/partition'
import sortBy from 'lodash-es/sortBy'
import { __, sprintf } from '@/vue/plugins/translations'

import AssessmentResult from '../../../values/AssessmentResult'
import Mark from '../../../values/Mark'
import Assessment from '../assessment'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../languageProcessing/researches/getSentenceBeginnings").SentenceBeginning } SentenceBeginning
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * The maximum number of consecutive sentences that can start with the same word.
 * @type {number}
 */
const MAX_SAME_BEGINNINGS = 2

/**
 * Represents the assessment that checks whether there are three or more consecutive sentences beginning with the same word.
 */
export default class SentenceBeginningsAssessment extends Assessment {
	constructor (config = {}) {
		super()

		this.identifier = 'sentenceBeginnings'
		this._config = config
	}

	/**
	 * Counts and groups the number too often used sentence beginnings and determines the lowest count within that group.
	 *
	 * @param {SentenceBeginning[]} sentenceBeginnings The array containing the objects containing the beginning words and counts.
	 *
	 * @returns {{total: number, lowestCount: number}} The object containing the total number of too often used beginnings and the lowest count within those.
	 */
	groupSentenceBeginnings (sentenceBeginnings) {
		const tooOften = partition(sentenceBeginnings, word => word.count > MAX_SAME_BEGINNINGS)

		if (0 === tooOften[0].length) {
			return { total: 0, lowestCount: 0 }
		}

		const sortedCounts = sortBy(tooOften[0], word => word.count)

		return { total: tooOften[0].length, lowestCount: sortedCounts[0].count }
	}

	/**
	 * Calculates the score based on sentence beginnings.
	 *
	 * @param {{total: number, lowestCount: number}} groupedSentenceBeginnings    The object with grouped sentence beginnings.
	 *
	 * @returns {AssessmentResult} AssessmentResult object with score and feedback.
	 */
	calculateSentenceBeginningsResult (groupedSentenceBeginnings) {
		const assessmentResult = new AssessmentResult()

		assessmentResult.setTitle(0 < groupedSentenceBeginnings.total ? __('Repeated sentence starts', td) : __('Sentence beginnings', td))
		if (0 < groupedSentenceBeginnings.total) {
			assessmentResult.setScore(3)
			assessmentResult.setHasMarks(true)
			const text = 1 === groupedSentenceBeginnings.total
				? sprintf(
					/* Translators: %1$d - Number of consecutive sentences starting with the same word. */
					__('%1$d sentences in a row start with the same word. Vary the openings to keep the rhythm fresh.', td),
					groupedSentenceBeginnings.lowestCount
				)
				: sprintf(
					/* Translators: %1$d - Minimum number of consecutive sentences in a group. %2$d - Number of repeated sentence beginnings. */
					__('Your post has %2$d places where %1$d or more sentences in a row start with the same word. Vary the openings to keep the rhythm fresh.', td),
					groupedSentenceBeginnings.lowestCount,
					groupedSentenceBeginnings.total
				)
			assessmentResult.setText(text)
		} else {
			assessmentResult.setScore(9)
			assessmentResult.setHasMarks(false)
			assessmentResult.setText(__(
				'Your sentences start with a good variety of words.',
				td
			)
			)
		}

		return assessmentResult
	}

	/**
	 * Marks all consecutive sentences with the same beginnings.
	 *
	 * @param {Paper} _paper            The paper to use for the assessment.
	 * @param {Researcher} researcher   The researcher used for calling research.
	 *
	 * @returns {Mark[]} All marked sentences.
	 */
	getMarks (_paper, researcher) {
		const sentenceBeginnings = researcher.getResearch('getSentenceBeginnings')
			.filter(sentenceBeginning => sentenceBeginning.count > MAX_SAME_BEGINNINGS)
		const sentences = sentenceBeginnings.flatMap(sentenceBeginning => sentenceBeginning.sentences)
		return sentences.map(sentence => {
			const startOffset = sentence.getFirstToken()?.sourceCodeRange.startOffset || 0
			const endOffset = sentence.getLastToken()?.sourceCodeRange.endOffset || 0

			return new Mark({
				original : sentence.text || '',
				position : {
					startOffset,
					endOffset,
					startOffsetBlock : startOffset - (sentence.parentStartOffset || 0),
					endOffsetBlock   : endOffset - (sentence.parentStartOffset || 0),
					clientId         : sentence.parentClientId || '',
					attributeId      : sentence.parentAttributeId || '',
					isFirstSection   : sentence.isParentFirstSectionOfBlock || false
				}
			})
		})
	}

	/**
	 * Scores the repetition of sentence beginnings in consecutive sentences.
	 *
	 * @param {Paper} _paper          The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	getResult (_paper, researcher) {
		const sentenceBeginnings = researcher.getResearch('getSentenceBeginnings')
		const groupedSentenceBeginnings = this.groupSentenceBeginnings(sentenceBeginnings)
		return this.calculateSentenceBeginningsResult(groupedSentenceBeginnings)
	}

	/**
	 * Checks whether the sentence beginnings assessment is applicable.
	 *
	 * @param {Paper}       _paper      Unused; kept for the Assessor interface signature.
	 * @param {Researcher}  researcher  The researcher object.
	 *
	 * @returns {boolean} Returns true if the researcher has the sentence beginnings research.
	 */
	isApplicable (_paper, researcher) {
		return researcher.hasResearch('getSentenceBeginnings')
	}
}