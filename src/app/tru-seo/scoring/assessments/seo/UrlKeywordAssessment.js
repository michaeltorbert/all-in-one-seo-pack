import { __ } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the Slug keyword assessment. This assessment checks if the keyword is present in the slug.
 */
export default class SlugKeywordAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config   The configuration to use.
	 * @param {Object} [config.scores] The scores to use.
	 * @param {number} [config.scores.bad] The score to return if there is no keyword and/or slug.
	 * @param {number} [config.scores.okay] The score to return if not all content words are found in the slug.
	 * @param {number} [config.scores.good] The score to return if all content words are found in the slug.
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				bad  : 3,
				okay : 6,
				good : 9
			}
		}

		this.identifier = 'slugKeyword'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Executes the Assessment and returns a result.
	 *
	 * @param {Paper}       paper       The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {AssessmentResult} The result of the assessment, containing both a score and a descriptive text.
	 */
	getResult (paper, researcher) {
		// Whether the paper has the data needed to return meaningful feedback (keyword and slug).
		this._canAssess = false

		if (paper.hasKeyword() && paper.hasSlug()) {
			this._keywordInSlug = researcher.getResearch('keywordCountInSlug')
			this._canAssess = true
		}

		const assessmentResult = new AssessmentResult()

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
	 * Checks whether the assessment is applicable to the paper.
	 *
	 * @param {Paper}       paper       The paper to use for the assessment.
	 * @param {Researcher}  researcher  The researcher object.
	 *
	 * @returns {boolean} True if the edited page is not a front page, and if the keywordCountInSlug research is available on the researcher.
	 */
	isApplicable (paper, researcher) {
		return !paper.isFrontPage() && researcher.hasResearch('keywordCountInSlug')
	}

	/**
	 * Determines the score and the result text based on whether or not there's a keyword in the slug.
	 *
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The object with calculated score and resultText.
	 */
	calculateResult () {
		if (!this._canAssess) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in slug', td),
				resultText  : __(
					'Add a focus keyword to enable this check.',
					td
				)
			}
		}

		if (3 > this._keywordInSlug.keyphraseLength) {
			if (100 === this._keywordInSlug.percentWordMatches) {
				return {
					score       : this._config.scores.good,
					resultTitle : __('Keyword in slug', td),
					resultText  : __(
						'Your keyword is in the URL.',
						td
					)
				}
			}

			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword in slug', td),
				resultText  : this.getSlugFeedback()
			}
		}

		if (50 < this._keywordInSlug.percentWordMatches) {
			return {
				score       : this._config.scores.good,
				resultTitle : __('Keyword in slug', td),
				resultText  : __(
					'Most of your keyword is in the URL.',
					td
				)
			}
		}
		return {
			score       : this._config.scores.okay,
			resultTitle : __('Keyword in slug', td),
			resultText  : this.getSlugFeedback()
		}
	}

	/**
	 * Returns the feedback for a slug that is missing the keyword.
	 *
	 * NOTE: The slug field sits below the title when editing a post, but elsewhere on a term screen,
	 * so the pointer is only given where it is accurate.
	 *
	 * @returns {string} The feedback string.
	 */
	getSlugFeedback () {
		if (this.isTaxonomyContent()) {
			return __(
				'Your URL doesn\'t include your keyword. Add it to the slug — a clean, keyword-rich URL tells search engines and readers what the page is about.',
				td
			)
		}

		return __(
			'Your URL doesn\'t include your keyword. Edit the slug below the title to add it — a clean, keyword-rich URL tells search engines and readers what the page is about.',
			td
		)
	}
}

/**
 * This assessment checks if the keyword is present in the slug.
 * UrlKeywordAssessment was the previous name for SlugKeywordAssessment (hence the name of this file).
 * We keep (and expose) this assessment for backwards compatibility.
 *
 * @deprecated Since version 1.19.1. Use SlugKeywordAssessment instead.
 */
class UrlKeywordAssessment extends SlugKeywordAssessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config   The configuration to use.
	 * @returns {void}
	 */
	constructor (config = {}) {
		super(config)
		this.identifier = 'urlKeyword'
		console.warn('This object is deprecated, use SlugKeywordAssessment instead.')
	}
}

export {
	SlugKeywordAssessment,
	UrlKeywordAssessment
}