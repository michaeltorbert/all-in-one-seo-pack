import { __ } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import { inRangeEndInclusive as inRange } from '../../helpers/assessments/inRange'
import AssessmentResult from '../../../values/AssessmentResult'

const maximumLength = 600
const td = import.meta.env.VITE_TEXTDOMAIN
/**
 * Represents the assessment that assesses the SEO title width and gives the feedback accordingly.
 */
export default class PageTitleWidthAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object}  [config]        The configuration to use.
	 * @param {boolean} allowShortTitle Whether the short title width is penalized with a bad score or not.
	 *
	 * @returns {void}
	 */
	constructor (config = {}, allowShortTitle = false) {
		super()

		const defaultConfig = {
			minLength : 400,
			maxLength : maximumLength,
			scores    : {
				noTitle       : 1,
				widthTooShort : 6,
				widthTooLong  : 3,
				widthCorrect  : 9
			}
		}

		this._allowShortTitle = allowShortTitle
		this.identifier = 'titleWidth'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Returns the maximum length.
	 *
	 * @returns {number} The maximum length.
	 */
	getMaximumLength () {
		return maximumLength
	}

	/**
	 * Runs the pageTitleWidth module, based on this returns an assessment result with score.
	 *
	 * @param {Paper} _paper Unused; kept for the Assessor interface signature.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (_paper, researcher) {
		const pageTitleWidth = researcher.getResearch('pageTitleWidth')
		const assessmentResult = new AssessmentResult()

		assessmentResult.setScore(this.calculateScore(pageTitleWidth))
		assessmentResult.setTitle(__('Page title width', td))
		assessmentResult.setText(this.translateScore(pageTitleWidth))
		if (9 > assessmentResult.getScore()) {
			assessmentResult.setHasJumps(true)
		}

		// Max and actual are used in the snippet editor progress bar.
		assessmentResult.max = this._config.maxLength
		assessmentResult.actual = pageTitleWidth
		return assessmentResult
	}

	/**
	 * Returns the score for the SEO title width calculation.
	 *
	 * @param {number} pageTitleWidth The width of the SEO title.
	 *
	 * @returns {number} The calculated score.
	 */
	calculateScore (pageTitleWidth) {
		if (inRange(pageTitleWidth, 1, 400)) {
			return this._config.scores.widthTooShort
		}

		if (inRange(pageTitleWidth, this._config.minLength, this._config.maxLength)) {
			return this._config.scores.widthCorrect
		}

		if (pageTitleWidth > this._config.maxLength) {
			return this._config.scores.widthTooLong
		}

		return this._config.scores.noTitle
	}

	/**
	 * Translates the score of the SEO title width calculation to a message the user can understand.
	 *
	 * @param {number} pageTitleWidth The width of the SEO title.
	 *
	 * @returns {string} The translated string.
	 */
	translateScore (pageTitleWidth) {
		if (inRange(pageTitleWidth, 1, 400)) {
			if (this._allowShortTitle) {
				return __(
					'Your SEO title is a good length.',
					td
				)
			}

			return __(
				'Your SEO title has room to grow. Use the extra space to add a benefit, a number, or a call to action that makes it more clickable.',
				td
			)
		}

		if (inRange(pageTitleWidth, this._config.minLength, this._config.maxLength)) {
			return __(
				'Your SEO title is a good length.',
				td
			)
		}

		if (pageTitleWidth > this._config.maxLength) {
			return __(
				'Your SEO title is too long for search results — Google may cut it off. Shorten it to keep the whole title visible.',
				td
			)
		}

		return __('Add an SEO title to enable this check.', td)
	}
}