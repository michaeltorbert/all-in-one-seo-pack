import { __, _n, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'
import { inRangeStartEndInclusive } from '../../helpers/assessments/inRange'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks if the text has any images present, including videos in product pages.
 */
export default class TextImagesAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object}  config      The configuration to use.
	 * @param {boolean} countVideos Whether videos are also included in the assessment or not.
	 */
	constructor (config = {}, countVideos = true) {
		super()

		const defaultConfig = {
			scores : {
				bad  : 3,
				good : 9
			},
			recommendedCount : 1
		}

		this.identifier = 'images'
		this._config = merge(defaultConfig, config)
		this._countVideos = countVideos
	}

	/**
	 * Execute the Assessment and return a result.
	 *
	 * @param {Paper}       _paper      The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {AssessmentResult} The result of the assessment, containing both a score and a descriptive text.
	 */
	getResult (_paper, researcher) {
		this.imageCount = researcher.getResearch('imageCount')
		this.videoCount = researcher.getResearch('videoCount')

		const calculatedScore = this.calculateResult()

		const assessmentResult = new AssessmentResult()
		assessmentResult.setScore(calculatedScore.score)
		assessmentResult.setTitle(calculatedScore.resultTitle)
		assessmentResult.setText(calculatedScore.resultText)

		return assessmentResult
	}

	/**
	 * Calculate the result based on the availability of images in the text, including videos in product pages.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The calculated result.
	 */
	calculateResult () {
		// If "countVideos" is on, we include videos in the assessment
		const mediaCount = this._countVideos ? this.imageCount + this.videoCount : this.imageCount

		// No images.
		if (0 === mediaCount) {
			if (this._countVideos) {
				return {
					score       : this._config.scores.bad,
					resultTitle : __('Images and videos', td),
					resultText  : __(
						'Your post has no images or videos. Even one supporting image makes posts easier to read and share.',
						td
					)
				}
			}

			return {
				score       : this._config.scores.bad,
				resultTitle : __('Images', td),
				resultText  : __(
					'Your post has no images. Even one supporting image makes posts easier to read and share.',
					td
				)
			}
		}

		if (this._config.scores.okay) {
			if (inRangeStartEndInclusive(mediaCount, 1, 3) && !this._countVideos) {
				return {
					score       : this._config.scores.okay,
					resultTitle : __('Images', td),
					resultText  : sprintf(
						/* translators: %1$d expands to the number of images found in the text, %2$d expands to the recommended number of images in the text. */
						_n(
							'You have %1$d image. We recommend at least %2$d — try adding a screenshot, photo, or illustration that supports your text.',
							'You have %1$d images. We recommend at least %2$d — try adding a screenshot, photo, or illustration that supports your text.',
							mediaCount,
							td
						),
						mediaCount,
						this._config.recommendedCount
					)
				}
			} else if (inRangeStartEndInclusive(mediaCount, 1, 3) && this._countVideos) {
				return {
					score       : this._config.scores.okay,
					resultTitle : __('Images and videos', td),
					resultText  : sprintf(
						/* translators: %1$d expands to the number of images found in the text, %2$d expands to the recommended number of images in the text. */
						_n(
							'You have %1$d image or video. We recommend at least %2$d — try adding a screenshot, photo, illustration, or short clip that supports your text.',
							'You have %1$d images or videos. We recommend at least %2$d — try adding a screenshot, photo, illustration, or short clip that supports your text.',
							mediaCount,
							td
						),
						mediaCount,
						this._config.recommendedCount
					)
				}
			}
		}

		if (this._countVideos) {
			// Text with at least one image or one video.
			return {
				score       : this._config.scores.good,
				resultTitle : __('Images and videos', td),
				resultText  : __(
					'You have enough images and videos.',
					td
				)
			}
		}

		// Text with at least one image.
		return {
			score       : this._config.scores.good,
			resultTitle : __('Images', td),
			resultText  : __(
				'You have enough images.',
				td
			)
		}
	}
}