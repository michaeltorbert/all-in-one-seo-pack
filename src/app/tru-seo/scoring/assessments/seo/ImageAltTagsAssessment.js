import merge from 'lodash-es/merge'
import { __ } from '@/vue/plugins/translations'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Represents the assessment that checks if all images have alt attributes.
 */
export default class ImageAltTagsAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object}  config      The configuration to use.
	 * @param {Object}  [config.scores] The scores to use for the assessment.
	 * @param {number}  [config.scores.bad]   The score to return if not all images have alt attributes.
	 * @param {number}  [config.scores.good]  The score to return if all images have alt attributes.
	 * @param {Object} [config.callbacks] The callbacks to use for the assessment.
	 * @param {Function}  [config.callbacks.getResultTexts]  The function that returns the result texts.
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				bad  : 3,
				good : 9
			},
			callbacks : {}
		}

		this.identifier = 'imageAltTags'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Checks whether the assessment is applicable, which requires at least one image.
	 * NOTE: without this, an image-free post fails a check it cannot satisfy, on top of the
	 * separate `images` assessment already reporting the absence.
	 *
	 * @param {Paper}       _paper      The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {boolean} Whether the assessment is applicable.
	 */
	isApplicable (_paper, researcher) {
		return 0 < researcher.getResearch('imageCount')
	}

	/**
	 * Executes the Assessment and return a result.
	 *
	 * @param {Paper}       _paper      The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {AssessmentResult} The result of the assessment, containing both a score and a descriptive text.
	 */
	getResult (_paper, researcher) {
		this.altTagsProperties = researcher.getResearch('altTagCount')
		this.imageCount = researcher.getResearch('imageCount')

		const calculatedScore = this.calculateResult()

		const assessmentResult = new AssessmentResult()
		assessmentResult.setScore(calculatedScore.score)
		assessmentResult.setTitle(calculatedScore.resultTitle)
		assessmentResult.setText(calculatedScore.resultText)

		return assessmentResult
	}

	/**
	 * Calculates the result based on the availability of images in the text.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The calculated result.
	 */
	calculateResult () {
		// The number of images with no alt attributes.
		const imagesNoAlt = this.altTagsProperties.noAlt
		const { good: goodResultText,  noImagesBad, noneHasAltBad, someHaveAltBad } = this.getFeedbackStrings()

		// There are no images or no text
		if (0 === this.imageCount) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Image alt attributes', td),
				resultText  : noImagesBad
			}
		}

		// None of the images has alt attributes.
		if (imagesNoAlt === this.imageCount) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Image alt attributes', td),
				resultText  : noneHasAltBad
			}
		}

		// Not all images have alt attributes.
		if (0 < imagesNoAlt) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Image alt attributes', td),
				resultText  : someHaveAltBad
			}
		}

		// All images have alt attributes.
		return {
			score       : this._config.scores.good,
			resultTitle : __('Image alt attributes', td),
			resultText  : goodResultText
		}
	}

	/**
	 * Returns the feedback strings for the assessment.
	 * If you want to override the feedback strings, you can do so by providing a custom callback in the config: `this._config.callbacks.getResultTexts`.
	 * This callback function should return an object with the following properties:
	 * - good: string
	 * - noImagesBad: string
	 * - noneHasAltBad: string
	 * - someHaveAltBad: string
	 *
	 * @returns {{good: string, noImagesBad: string, noneHasAltBad: string, someHaveAltBad: string}} The feedback strings.
	 */
	getFeedbackStrings () {
		const numberOfImagesWithoutAlt = this.altTagsProperties.noAlt

		if (!this._config.callbacks.getResultTexts) {
			const defaultResultTexts = {
				good           : __('Every image has alt text.', td),
				noneHasAltBad  : __('None of your images have alt text. Add a short description to each one.', td),
				noImagesBad    : __('None of your images have alt text. Add a short description to each — search engines and screen readers rely on it.', td),
				someHaveAltBad : __('Some of your images are missing alt text. Add a short description to each one.', td)
			}

			if (1 === numberOfImagesWithoutAlt) {
				defaultResultTexts.someHaveAltBad = __('One of your images is missing alt text. Add a short description to it.', td)
			}

			return defaultResultTexts
		}

		return this._config.callbacks.getResultTexts({
			numberOfImagesWithoutAlt,
			totalNumberOfImages : this.imageCount
		})
	}
}