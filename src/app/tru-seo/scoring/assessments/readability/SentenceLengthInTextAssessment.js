import { __, _n, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import formatNumber from '../../../helpers/formatNumber'
import { inRangeEndInclusive as inRange } from '../../helpers/assessments/inRange'
import AssessmentResult from '../../../values/AssessmentResult'
import Mark from '../../../values/Mark'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that will calculate the length of sentences in the text.
 */
class SentenceLengthInTextAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config			The scoring configuration that should be used.
	 * @param {boolean} isCornerstone	Whether cornerstone configuration should be used.
	 * @param {boolean} isProduct		Whether product configuration should be used.

	 * @returns {void}
	 */
	constructor (config = {}, isCornerstone = false, isProduct = false) {
		super()

		const defaultConfig = {
			recommendedLength : 20,
			slightlyTooMany   : 25,
			farTooMany        : 30,
			countCharacters   : false
		}

		// Add cornerstone and/or product-specific config if applicable.
		this._config = merge(defaultConfig, config)

		this._isCornerstone = isCornerstone
		this._isProduct = isProduct
		this.identifier = 'textSentenceLength'
	}

	/**
	 * Scores the percentage of sentences including more than the recommended number of words.
	 *
	 * @param {Paper} _paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The Assessment result.
	 */
	getResult (_paper, researcher) {
		const sentences = researcher.getResearch('countSentencesFromText')
		if	(researcher.getConfig('sentenceLength')) {
			this._config = this.getLanguageSpecificConfig(researcher)
		}

		this._config.countCharacters = !!researcher.getConfig('countCharacters')

		const percentage = this.calculatePercentage(sentences)
		const score = this.calculateScore(percentage)

		const assessmentResult = new AssessmentResult()
		assessmentResult.setScore(score)
		assessmentResult.setTitle(7 <= score ? __('Sentence length', td) : __('Long sentences', td))
		assessmentResult.setText(this.translateScore(score, percentage))
		assessmentResult.setHasMarks(0 < percentage)

		return assessmentResult
	}

	/**
	 * Mark the sentences.
	 *
	 * @param {Paper} _paper The paper to use for the marking.
	 * @param {Researcher} researcher The researcher to use.
	 *
	 * @returns {Array} Array with all the marked sentences.
	 */
	getMarks (_paper, researcher) {
		const sentenceCount = researcher.getResearch('countSentencesFromText')
		if (researcher.getConfig('sentenceLength')) {
			this._config = this.getLanguageSpecificConfig(researcher)
		}
		const tooLongSentences = this.getTooLongSentences(sentenceCount)

		return tooLongSentences.map(tooLongSentence => {
			const { sentence, firstToken, lastToken } = tooLongSentence

			const startOffset = firstToken.sourceCodeRange.startOffset
			const endOffset = lastToken.sourceCodeRange.endOffset

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
	 * Check if there is language-specific config, and if so, overwrite the current config with it.
	 *
	 * @param {Researcher} researcher The researcher to use.
	 *
	 * @returns {Object} The config that should be used.
	 */
	getLanguageSpecificConfig (researcher) {
		const currentConfig = this._config
		const languageSpecificConfig = researcher.getConfig('sentenceLength')

		if (Object.prototype.hasOwnProperty.call(languageSpecificConfig, 'recommendedLength')) {
			currentConfig.recommendedLength = languageSpecificConfig.recommendedLength
		}

		// Check if a language has specific cornerstone configuration for non-product pages.
		if (true === this._isCornerstone && false === this._isProduct && Object.prototype.hasOwnProperty.call(languageSpecificConfig, 'cornerstonePercentages')) {
			return merge(currentConfig, languageSpecificConfig.cornerstonePercentages)
		}
		// Check if a language has specific configuration for non-product, non-cornerstone pages.
		if (false === this._isCornerstone && false === this._isProduct && Object.prototype.hasOwnProperty.call(languageSpecificConfig, 'percentages')) {
			return merge(currentConfig, languageSpecificConfig.percentages)
		}
		// More conditions should be added below once we add language-specific config for product pages.
		return currentConfig
	}

	/**
	 * Translates the score to a message the user can understand.
	 *
	 * @param {number} score The score.
	 * @param {number} percentage The percentage.
	 *
	 * @returns {string} A string.
	 */
	translateScore (score, percentage) {
		if (7 <= score) {
			return __(
				'Your sentences are a comfortable length.',
				td
			)
		}

		const wordFeedback = sprintf(
			/* Translators: 1 - Percentage of sentences. 2 - Recommended maximum number of words. 3 - Recommended maximum percentage. */
			_n(
				'%1$s of your sentences are over %2$d word — more than the recommended %3$s. Long sentences are harder to follow; try splitting them.',
				'%1$s of your sentences are over %2$d words — more than the recommended %3$s. Long sentences are harder to follow; try splitting them.',
				this._config.recommendedLength,
				td
			),
			percentage + '%',
			this._config.recommendedLength,
			this._config.slightlyTooMany + '%'
		)

		const characterFeedback = sprintf(
			/* Translators: 1 - Percentage of sentences. 2 - Recommended maximum number of characters. 3 - Recommended maximum percentage. */
			_n(
				'%1$s of your sentences are over %2$d character — more than the recommended %3$s. Long sentences are harder to follow; try splitting them.',
				'%1$s of your sentences are over %2$d characters — more than the recommended %3$s. Long sentences are harder to follow; try splitting them.',
				this._config.recommendedLength,
				td
			),
			percentage + '%',
			this._config.recommendedLength,
			this._config.slightlyTooMany + '%'
		)

		return this._config.countCharacters ? characterFeedback : wordFeedback
	}

	/**
	 * Calculates the percentage of sentences that are too long.
	 *
	 * @param {SentenceLength[]} sentences The sentences to calculate the percentage for.
	 * @returns {number} The calculates percentage of too long sentences.
	 */
	calculatePercentage (sentences) {
		let percentage = 0

		if (0 !== sentences.length) {
			const tooLongTotal = this.getTooLongSentences(sentences).length

			percentage = formatNumber((tooLongTotal / sentences.length) * 100)
		}

		return percentage
	}

	/**
	 * Calculates the score for the given percentage.
	 *
	 * @param {number} percentage The percentage to calculate the score for.
	 * @returns {number} The calculated score.
	 */
	calculateScore (percentage) {
		let score

		// Green indicator.
		if (percentage <= this._config.slightlyTooMany) {
			score = 9
		}

		// Orange indicator.
		if (inRange(percentage, this._config.slightlyTooMany, this._config.farTooMany)) {
			score = 6
		}

		// Red indicator.
		if (percentage > this._config.farTooMany) {
			score = 3
		}

		return score
	}

	/**
	 * Returns the sentences that are qualified as being too long.
	 * @param {SentenceLength[]} sentences The sentences to filter.
	 * @returns {SentenceLength[]} Array with all the sentences considered to be too long.
	 */
	getTooLongSentences (sentences) {
		return sentences.filter(sentence => sentence.sentenceLength > this._config.recommendedLength)
	}
}

export default SentenceLengthInTextAssessment