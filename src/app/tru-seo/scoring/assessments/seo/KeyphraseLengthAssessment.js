import { __, _n, sprintf } from '@/vue/plugins/translations'
import inRange from 'lodash-es/inRange'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'
import { inRangeStartEndInclusive } from '../../helpers/assessments/inRange'
import processExactMatchRequest from '../../../languageProcessing/helpers/match/processExactMatchRequest'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Enumerator for the different types of counting methods for this assessment.
 * @type {Readonly<{WORDS: string, CONTENT_WORDS: string, CHARACTERS: string}>}
 */
const COUNT_TEXT_IN = Object.freeze({
	WORDS         : 'words',
	CONTENT_WORDS : 'content words',
	CHARACTERS    : 'characters'
})

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Assessment to check whether the keyword has a good length.
 */
export default class KeyphraseLengthAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 * @param {Object} [config.parameters] The parameters to use for the assessment.
	 * @param {number} [config.parameters.recommendedMinimum] The recommended minimum length of the keyword (in words).
	 * @param {number} [config.parameters.acceptableMaximum] The acceptable maximum length of the keyword (in words).
	 * @param {Object} [config.scores] The scores to use for the assessment.
	 * @param {number} [config.scores.veryBad] The score to return if the length of the keyword is below recommended minimum.
	 * @param {number} [config.scores.consideration] The score to return if the length of the keyword is above acceptable maximum.
	 * @param {boolean} isProductPage Whether product page scoring is used or not.
	*/
	constructor (config, isProductPage = false) {
		super()

		this.defaultConfig = {
			parameters : {
				recommendedMinimum : 1,
				recommendedMaximum : 4,
				acceptableMaximum  : 8
			},
			parametersNoFunctionWordSupport : {
				recommendedMaximum : 6,
				acceptableMaximum  : 9
			},
			scores : {
				veryBad : -999,
				bad     : 3,
				okay    : 6,
				good    : 9
			},
			countTextIn        : COUNT_TEXT_IN.WORDS,
			isRelatedKeyphrase : false
		}

		this.identifier = 'keyphraseLength'
		this._config = merge(this.defaultConfig, config)
		this._isProductPage = isProductPage
	}

	/**
	 * Assesses the keyword presence and length.
	 *
	 * @param {Paper} paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The result of this assessment.
	 */
	getResult (paper, researcher) {
		this._keyphraseLengthData = researcher.getResearch('keyphraseLength')
		const assessmentResult = new AssessmentResult()

		const countTextInCharacters = researcher.getConfig('countCharacters')
		if (countTextInCharacters) {
			this._config.countTextIn = COUNT_TEXT_IN.CHARACTERS
		}

		/*
		 * Checks whether the keyword length is calculated with function words filtered out AND whether the keyword doesn't use double quotes.
		 * If both conditions are true, then the feedback string should output 'content words' instead of only 'words'.
		 * */
		const keyphrase = paper.getKeyword()

		// Character length of the keyword itself (exact-match quotes stripped). The
		// word count alone treats a single character like "g" as an acceptable
		// one-word keyphrase, so we track characters to reject that case below.
		this._keyphraseCharacterLength = processExactMatchRequest(keyphrase).keyphrase.trim().length

		if (0 < this._keyphraseLengthData.functionWords.length && !processExactMatchRequest(keyphrase).exactMatchRequested) {
			this._config.countTextIn = COUNT_TEXT_IN.CONTENT_WORDS
		}

		/*
		 * Checks whether the researcher has custom config for the scoring boundaries and overrides the current config with it.
		 * If no custom config is found, makes boundaries less strict if the language doesn't have function word support.
		 * */
		const customConfig = researcher.getConfig('keyphraseLength')
		if (customConfig) {
			this._config = this.getCustomConfig(researcher)
		} else if (0 === this._keyphraseLengthData.functionWords.length) {
			this._config.parameters = merge({}, this._config.parameters, this._config.parametersNoFunctionWordSupport)
		}

		// Set a variable that contains the scoring boundaries.
		this._boundaries = this._config.parameters

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
	 * Merges language-specific configurations for product/regular pages.
	 *
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {Object} Configuration to use.
	 */
	getCustomConfig (researcher) {
		const customKeyphraseLengthConfig = researcher.getConfig('keyphraseLength')

		if (this._isProductPage && Object.hasOwn(customKeyphraseLengthConfig, 'productPages')) {
			// If a language has specific configuration for keyword length in product pages, that configuration is used.
			return merge(this._config, customKeyphraseLengthConfig.productPages)
		}

		// If a language has a configuration for keyword length for regular pages, that configuration is used.
		return merge(this._config, customKeyphraseLengthConfig.defaultAnalysis)
	}

	/**
	 * Returns the feedback texts for the conditions when the keyword is too long or too short.
	 *
	 * @returns {{lessThanMinimum: (function(string): string), firstSentence: (function(string): string), moreThanMinimum: (function(string): string), wayMoreThanMinimum: (function(string): string), wayLessThanMinimum: (function(string): string)}} The feedback texts for the conditions when the keyword is too long or too short.
	 */
	getFeedbackTexts () {
		return {
			firstSentence : (countTextIn) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words */
					_n(
						'The keyword contains %1$d word.',
						'The keyword contains %1$d words.',
						this._keyphraseLengthData.keyphraseLength,
						td
					),
					this._keyphraseLengthData.keyphraseLength
				)
				const contentWordFeedback = sprintf(
					/* translators: %1$d expands to the number of content words */
					_n(
						'The keyword contains %1$d content word.',
						'The keyword contains %1$d content words.',
						this._keyphraseLengthData.keyphraseLength,
						td
					),
					this._keyphraseLengthData.keyphraseLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters */
					_n(
						'The keyword contains %1$d character.',
						'The keyword contains %1$d characters.',
						this._keyphraseLengthData.keyphraseLength,
						td
					),
					this._keyphraseLengthData.keyphraseLength
				)
				if (countTextIn === COUNT_TEXT_IN.WORDS) {
					return wordFeedback
				} else if (countTextIn === COUNT_TEXT_IN.CONTENT_WORDS) {
					return contentWordFeedback
				}
				return characterFeedback
			},
			moreThanMinimum : countTextIn => {
				const keyphraseLength = this._keyphraseLengthData.keyphraseLength
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of words, %2$d expands to the actual number of words in the keyword. */
					_n(
						'Your keyword is %2$d word long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d words long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				const contentWordFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of content words, %2$d expands to the actual number of content words in the keyword. */
					_n(
						'Your keyword is %2$d content word long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d content words long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of characters, %2$d expands to the actual number of characters in the keyword. */
					_n(
						'Your keyword is %2$d character long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d characters long — more than the recommended %1$d. Try shortening it. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				if (countTextIn === COUNT_TEXT_IN.WORDS) {
					return wordFeedback
				} else if (countTextIn === COUNT_TEXT_IN.CONTENT_WORDS) {
					return contentWordFeedback
				}
				return characterFeedback
			},
			wayMoreThanMinimum : countTextIn => {
				const keyphraseLength = this._keyphraseLengthData.keyphraseLength
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of words, %2$d expands to the actual number of words in the keyword. */
					_n(
						'Your keyword is %2$d word long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d words long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				const contentWordFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of content words, %2$d expands to the actual number of content words in the keyword. */
					_n(
						'Your keyword is %2$d content word long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d content words long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the recommended maximum number of characters, %2$d expands to the actual number of characters in the keyword. */
					_n(
						'Your keyword is %2$d character long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						'Your keyword is %2$d characters long, well over the recommended %1$d. Try a much shorter phrase. Shorter phrases are easier to target and better match what people search.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMaximum,
					keyphraseLength
				)
				if (countTextIn === COUNT_TEXT_IN.WORDS) {
					return wordFeedback
				} else if (countTextIn === COUNT_TEXT_IN.CONTENT_WORDS) {
					return contentWordFeedback
				}
				return characterFeedback
			},
			lessThanMinimum : countTextIn => {
				const keyphraseLength = this._keyphraseLengthData.keyphraseLength
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the recommended minimum number of words, %2$d expands to the actual number of words in the keyword. */
					_n(
						'Your keyword is %2$d word long — less than the recommended %1$d. Try a slightly longer phrase.',
						'Your keyword is %2$d words long — less than the recommended %1$d. Try a slightly longer phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				const contentWordFeedback = sprintf(
					/* translators: %1$d expands to the recommended minimum number of content words, %2$d expands to the actual number of content words in the keyword. */
					_n(
						'Your keyword is %2$d content word long — less than the recommended %1$d. Try a slightly longer phrase.',
						'Your keyword is %2$d content words long — less than the recommended %1$d. Try a slightly longer phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the recommended minimum number of characters, %2$d expands to the actual number of characters in the keyword. */
					_n(
						'Your keyword is %2$d character long — less than the recommended %1$d. Try a slightly longer phrase.',
						'Your keyword is %2$d characters long — less than the recommended %1$d. Try a slightly longer phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				if (countTextIn === COUNT_TEXT_IN.WORDS) {
					return wordFeedback
				} else if (countTextIn === COUNT_TEXT_IN.CONTENT_WORDS) {
					return contentWordFeedback
				}
				return characterFeedback
			},
			wayLessThanMinimum : countTextIn => {
				const keyphraseLength = this._keyphraseLengthData.keyphraseLength
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the recommended minimum number of words, %2$d expands to the actual number of words in the keyword. */
					_n(
						'Your keyword is %2$d word long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						'Your keyword is %2$d words long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				const contentWordFeedback = sprintf(
					/* translators: %1$d expands to the recommended minimum number of content words, %2$d expands to the actual number of content words in the keyword. */
					_n(
						'Your keyword is %2$d content word long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						'Your keyword is %2$d content words long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters, %2$s expands to the sentence "The keyword contains X character(s)." */
					_n(
						'Your keyword is %2$d character long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						'Your keyword is %2$d characters long — well under the recommended %1$d. Try a longer, more descriptive phrase.',
						keyphraseLength,
						td
					),
					this._boundaries.recommendedMinimum,
					keyphraseLength
				)
				if (countTextIn === COUNT_TEXT_IN.WORDS) {
					return wordFeedback
				} else if (countTextIn === COUNT_TEXT_IN.CONTENT_WORDS) {
					return contentWordFeedback
				}
				return characterFeedback
			}
		}
	}

	/**
	 * Calculates the result for product pages based on the keyphraseLength research.
	 * @returns {{score: number, resultText: string}} The score and feedback for a product page.
	 */
	calculateResultForProduct () {
		// Calculates very bad score for product pages.
		if (0 === this._keyphraseLengthData.keyphraseLength) {
			return this.getNoKeyphraseFeedback()
		}

		// Calculates good score for product pages.
		if (inRangeStartEndInclusive(this._keyphraseLengthData.keyphraseLength, this._boundaries.recommendedMinimum,
			this._boundaries.recommendedMaximum)) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Keyword length', td),
				resultText  : __(
					'Your keyword length is just right.',
					td
				)
			}
		}

		// Gets functions used to create feedback strings for the 'okay' and 'bad' assessment scores.
		const feedbackTexts = this.getFeedbackTexts()

		// Calculates bad score for product pages.
		if (this._keyphraseLengthData.keyphraseLength <= this._boundaries.acceptableMinimum) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword length', td),
				resultText  : feedbackTexts.wayLessThanMinimum(this._config.countTextIn)
			}
		}
		if (this._keyphraseLengthData.keyphraseLength > this._boundaries.acceptableMaximum) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword length', td),
				resultText  : feedbackTexts.wayMoreThanMinimum(this._config.countTextIn)
			}
		}
		// Calculates okay score for product pages when the keyword is too short.
		if (inRange(this._keyphraseLengthData.keyphraseLength, this._boundaries.acceptableMinimum, this._boundaries.recommendedMinimum)) {
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword length', td),
				resultText  : feedbackTexts.lessThanMinimum(this._config.countTextIn)
			}
		}
		// Calculates okay score for product pages when the keyword is too long.
		return {
			score       : this._config.scores.okay,
			resultTitle : __('Keyword length', td),
			resultText  : feedbackTexts.moreThanMinimum(this._config.countTextIn)
		}
	}

	/**
	 * Returns the feedback when no keyword was set.
	 * @returns {{score: number, resultText: string}} The score and feedback for when no keyword is set.
	 */
	getNoKeyphraseFeedback () {
		if (this._config.isRelatedKeyphrase) {
			return {
				score       : this._config.scores.veryBad,
				resultTitle : __('Keyword length', td),
				resultText  : sprintf(
					/* translators: 1 - The content type (e.g. "post", "category"). */
					__('Add a focus keyword to start scoring this %1$s.', td),
					this.getContentNoun()
				)
			}
		}
		return {
			score       : this._config.scores.veryBad,
			resultTitle : __('Keyword length', td),
			resultText  : sprintf(
				/* translators: 1 - The content type (e.g. "post", "category"). */
				__('Add a focus keyword to start scoring this %1$s.', td),
				this.getContentNoun()
			)
		}
	}

	/**
	 * Calculates the result based on the keyphraseLength research.
	 * @returns {{score: number, resultText: string}} The score and feedback for a regular post.
	 */
	calculateResult () {
		// A single-character keyword (e.g. "g") is never a meaningful search term,
		// even though the word count treats it as an acceptable one-word keyphrase.
		if (1 === this._keyphraseCharacterLength) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword length', td),
				resultText  : __(
					'Your keyword is too short. Try a longer, more descriptive phrase.',
					td
				)
			}
		}

		if (this._isProductPage) {
			return this.calculateResultForProduct()
		}

		// Calculates scores for regular pages.
		if (this._keyphraseLengthData.keyphraseLength < this._boundaries.recommendedMinimum) {
			return this.getNoKeyphraseFeedback()
		}
		if (inRange(this._keyphraseLengthData.keyphraseLength, this._boundaries.recommendedMinimum, this._boundaries.recommendedMaximum + 1)) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Keyword length', td),
				resultText  : __(
					'Your keyword length is just right.',
					td
				)
			}
		}

		// Gets functions used to create feedback strings for the 'okay' and 'bad' assessment scores.
		const feedbackTexts = this.getFeedbackTexts()

		if (inRange(this._keyphraseLengthData.keyphraseLength, this._boundaries.recommendedMaximum + 1, this._boundaries.acceptableMaximum + 1)) {
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword length', td),
				resultText  : feedbackTexts.moreThanMinimum(this._config.countTextIn)
			}
		}

		return {
			score       : this._config.scores.bad,
			resultTitle : __('Keyword length', td),
			resultText  : feedbackTexts.wayMoreThanMinimum(this._config.countTextIn)
		}
	}
}