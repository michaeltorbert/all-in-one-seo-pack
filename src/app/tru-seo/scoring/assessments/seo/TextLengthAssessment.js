import { __, _n, sprintf } from '@/vue/plugins/translations'
import inRange from 'lodash-es/inRange'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents an assessment that checks the length of the text and gives feedback accordingly.
 */
export default class TextLengthAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			recommendedMinimum   : 300,
			slightlyBelowMinimum : 250,
			belowMinimum         : 200,
			veryFarBelowMinimum  : 100,

			scores : {
				recommendedMinimum   : 9,
				slightlyBelowMinimum : 6,
				belowMinimum         : 3,
				farBelowMinimum      : -10,
				veryFarBelowMinimum  : -20
			},
			countCharacters : false,

			cornerstoneContent : false,
			customContentType  : ''
		}

		this.identifier = 'textLength'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Executes the Assessment and returns a result.
	 *
	 * @param {Paper}       _paper      The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {AssessmentResult} The result of the assessment, containing both a score and a descriptive text.
	 */
	getResult (_paper, researcher) {
		const textLength = researcher.getResearch('wordCountInText')

		if (researcher.getConfig('textLength')) {
			this._config = this.getLanguageSpecificConfig(researcher)
		}

		this._config.countCharacters = !!researcher.getConfig('countCharacters')

		const calculatedResult = this.calculateResult(textLength.count)

		const assessmentResult = new AssessmentResult()
		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)

		return assessmentResult
	}

	/**
	 * Checks if there is language-specific config, and if so, overwrites the current config with it.
	 *
	 * @param {Researcher} researcher The researcher to use.
	 *
	 * @returns {Object} The config that should be used.
	 */
	getLanguageSpecificConfig (researcher) {
		const currentConfig = this._config
		const languageSpecificConfig = researcher.getConfig('textLength')

		// Checks if a language has configuration for custom content types.
		if (Object.hasOwn(languageSpecificConfig, currentConfig.customContentType)) {
			return merge(currentConfig, languageSpecificConfig[currentConfig.customContentType])
		}

		// Checks if a language has a default cornerstone configuration.
		if (true === currentConfig.cornerstoneContent && '' === currentConfig.customContentType &&
			Object.hasOwn(languageSpecificConfig, 'defaultCornerstone')) {
			return merge(currentConfig, languageSpecificConfig.defaultCornerstone)
		}

		// Uses the default language-specific config for posts and pages.
		return merge(currentConfig, languageSpecificConfig.defaultAnalysis)
	}

	/**
	 * Returns the feedback texts for the text length assessment.
	 *
	 * @returns {{firstSentence: (function(boolean, number): string), good: (function(string): string), slightlyBelow: (function(boolean, string): string), below: (function(boolean, string): string), farBelow: (function(boolean, string): string)}} //
	 */
	getFeedbackTexts () {
		return {
			firstSentence : (useCharacter, textLength) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words. */
					_n(
						'The text contains %1$d word.',
						'The text contains %1$d words.',
						textLength,
						td
					),
					textLength
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters. */
					_n(
						'The text contains %1$d character.',
						'The text contains %1$d characters.',
						textLength,
						td
					),
					textLength
				)
				return useCharacter ? characterFeedback : wordFeedback
			},
			good : (useCharacter, textLength) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words, %2$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %2$s is %1$d word long — a good length.',
						'Your %2$s is %1$d words long — a good length.',
						textLength,
						td
					),
					textLength,
					this.getContentNoun()
				)

				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters, %2$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %2$s is %1$d character long — a good length.',
						'Your %2$s is %1$d characters long — a good length.',
						textLength,
						td
					),
					textLength,
					this.getContentNoun()
				)

				return useCharacter ? characterFeedback : wordFeedback
			},
			slightlyBelow : (useCharacter, textLength) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words, %2$d expands to the recommended minimum number of words, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d word long — slightly under the recommended %2$d. Add a bit more content. Search engines need enough text to understand the topic.',
						'Your %3$s is %1$d words long — slightly under the recommended %2$d. Add a bit more content. Search engines need enough text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters, %2$d expands to the recommended minimum number of characters, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d character long — slightly under the recommended %2$d. Add a bit more content. Search engines need enough text to understand the topic.',
						'Your %3$s is %1$d characters long — slightly under the recommended %2$d. Add a bit more content. Search engines need enough text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				return useCharacter ? characterFeedback : wordFeedback
			},
			below : (useCharacter, textLength) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words, %2$d expands to the recommended minimum number of words, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d word long — under the recommended %2$d. Add more content. Search engines need enough text to understand the topic.',
						'Your %3$s is %1$d words long — under the recommended %2$d. Add more content. Search engines need enough text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters, %2$d expands to the recommended minimum number of characters, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d character long — under the recommended %2$d. Add more content. Search engines need enough text to understand the topic.',
						'Your %3$s is %1$d characters long — under the recommended %2$d. Add more content. Search engines need enough text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				return useCharacter ? characterFeedback : wordFeedback
			},
			farBelow : (useCharacter, textLength) => {
				const wordFeedback = sprintf(
					/* translators: %1$d expands to the number of words, %2$d expands to the recommended minimum number of words, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d word long — well under the recommended %2$d. Search engines usually need more text to understand the topic.',
						'Your %3$s is %1$d words long — well under the recommended %2$d. Search engines usually need more text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				const characterFeedback = sprintf(
					/* translators: %1$d expands to the number of characters, %2$d expands to the recommended minimum number of characters, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your %3$s is %1$d character long — well under the recommended %2$d. Search engines usually need more text to understand the topic.',
						'Your %3$s is %1$d characters long — well under the recommended %2$d. Search engines usually need more text to understand the topic.',
						textLength,
						td
					),
					textLength,
					this._config.recommendedMinimum,
					this.getContentNoun()
				)
				return useCharacter ? characterFeedback : wordFeedback
			}
		}
	}

	/**
	 * Returns the score and the appropriate feedback string based on the current word count
	 * for taxonomies (in WordPress) and collections (in Shopify).
	 *
	 * @param {number} textLength	The amount of words or characters to be checked against.
	 * @returns {{score: number, resultTitle: string, resultText: string}} The score and the feedback string.
	 */
	calculateTaxonomyResult (textLength) {
		// Gets functions used to create feedback strings.
		const feedbackTexts = this.getFeedbackTexts()

		if (textLength >= this._config.recommendedMinimum) {
			return {
				score       : this._config.scores.recommendedMinimum,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.good(this._config.countCharacters, textLength)
			}
		}
		if (inRange(textLength, this._config.slightlyBelowMinimum, this._config.recommendedMinimum)) {
			return {
				score       : this._config.scores.slightlyBelowMinimum,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.slightlyBelow(this._config.countCharacters, textLength)
			}
		}
		if (inRange(textLength, this._config.veryFarBelowMinimum, this._config.slightlyBelowMinimum)) {
			return {
				score       : this._config.scores.belowMinimum,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.below(this._config.countCharacters, textLength)
			}
		}
		return {
			score       : this._config.scores.veryFarBelowMinimum,
			resultTitle : __('Text length', td),
			resultText  : __(
				'Add some content to enable this check.',
				td
			)
		}
	}

	/**
	 * Returns the score and the appropriate feedback string based on the current word count for every type of content.
	 *
	 * @param {number}  textLength   The amount of words or characters to be checked against.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The score and the feedback string.
	 */
	calculateResult (textLength) {
		const customContentTypes = [ 'taxonomyAssessor', 'collectionSEOAssessor', 'collectionCornerstoneSEOAssessor' ]
		if (customContentTypes.includes(this._config.customContentType)) {
			return this.calculateTaxonomyResult(textLength)
		}

		// Gets functions used to create feedback strings.
		const feedbackTexts = this.getFeedbackTexts()

		if (textLength >= this._config.recommendedMinimum) {
			return {
				score       : this._config.scores.recommendedMinimum,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.good(this._config.countCharacters, textLength)
			}
		}

		if (inRange(textLength, 0, this._config.belowMinimum)) {
			let badScore = this._config.scores.farBelowMinimum

			if (inRange(textLength, 0, this._config.veryFarBelowMinimum)) {
				badScore = this._config.scores.veryFarBelowMinimum
			}

			return {
				score       : badScore,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.farBelow(this._config.countCharacters, textLength)
			}
		}

		if (inRange(textLength, this._config.slightlyBelowMinimum, this._config.recommendedMinimum)) {
			if (false === this._config.cornerstoneContent) {
				return {
					score       : this._config.scores.slightlyBelowMinimum,
					resultTitle : __('Text length', td),
					resultText  : feedbackTexts.slightlyBelow(this._config.countCharacters, textLength)
				}
			}

			return {
				score       : this._config.scores.slightlyBelowMinimum,
				resultTitle : __('Text length', td),
				resultText  : feedbackTexts.below(this._config.countCharacters, textLength)
			}
		}

		return {
			score       : this._config.scores.belowMinimum,
			resultTitle : __('Text length', td),
			resultText  : feedbackTexts.below(this._config.countCharacters, textLength)
		}
	}
}