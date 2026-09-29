import { __, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'
import getLanguage from '../../../languageProcessing/helpers/language/getLanguage'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Assessment to check whether the keyword is included in (the beginning of) the SEO title.
 */
export default class KeyphraseInSEOTitleAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config] The configuration to use.
	 * @param {number} [config.parameters] The parameters to use.
	 * @param {number} [config.parameters.recommendedPosition] The recommended position of the keyword within the SEO title.
	 * @param {Object} [config.scores] The scores to use.
	 * @param {number} [config.scores.good] The score to return if the keyword is found at the recommended position.
	 * @param {number} [config.scores.okay] The score to return if the keyword is found, but not at the recommended position.
	 * @param {number} [config.scores.bad] The score to return if there are fewer keyword occurrences than the recommended minimum.
	 * @param {Object} [config.feedbackStrings] The feedback strings to use.
	 * @param {string} [config.feedbackStrings.bad] The feedback string to use when the assessment gives a bad score.
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			parameters : {
				recommendedPosition : 0
			},
			scores : {
				good : 9,
				okay : 6,
				bad  : 2
			},
			feedbackStrings : {
				bad : __('For the best results, include your exact keyword in the SEO title — ideally at the start.', td)
			}
		}

		this.identifier = 'keyphraseInSEOTitle'

		/* translators: This is the name of the 'Keyword in SEO title' SEO assessment.
		 It appears before the feedback in the analysis, for example in the feedback string:
		 "Keyword in SEO title: Your keyword appears at the start of the SEO title." */
		this.name = __('Keyword in SEO title', td)

		this._config = merge(defaultConfig, config)
	}

	/**
	 * Executes the SEO title keyword assessment and returns an assessment result.
	 *
	 * @param {Paper}       paper       The Paper object to assess.
	 * @param {Researcher}  researcher  The Researcher object containing all available researches.
	 *
	 * @returns {AssessmentResult} The result of the assessment with text and score.
	 */
	getResult (paper, researcher) {
		const language = getLanguage(paper.getLocale())
		// Whether the paper has the data needed to return meaningful feedback (keyword and SEO title).
		this._canAssess = false

		if (paper.hasKeyword() && paper.hasTitle()) {
			this._keyphraseMatches = researcher.getResearch('findKeyphraseInSEOTitle')
			this._keyphrase = paper.getKeyword()
			this._canAssess = true
		}

		const assessmentResult = new AssessmentResult()

		const calculatedResult = this.calculateResult(this._keyphrase, language)
		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)
		if (9 > assessmentResult.getScore()) {
			assessmentResult.setHasJumps(true)
		}

		return assessmentResult
	}

	/**
	 * Calculates the result based on whether and how the keyword was matched in the SEO title. Returns GOOD result if
	 * an exact match of the keyword is found in the beginning of the SEO title. Returns OK results if all content words
	 * from the keyword are in the SEO title (in any form). Returns BAD otherwise.
	 *
	 * @param {string}  keyphrase   The keyword of the paper (to be returned in the feedback strings).
	 * @param {string}  language    The language to check.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} Object with score and text.
	 */
	calculateResult (keyphrase, language) {
		if (!this._canAssess) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in SEO title', td),
				resultText  : __(
					'Add a focus keyword to enable this check.',
					td
				)
			}
		}

		const feedbackStrings = this._config.feedbackStrings
		if ('ja' === language) {
			feedbackStrings.bad = __('For the best results, include all words of your keyword in the SEO title — ideally at the start.', td)
		}
		const exactMatchFound = this._keyphraseMatches.exactMatchFound
		const position = this._keyphraseMatches.position
		const allWordsFound = this._keyphraseMatches.allWordsFound
		const exactMatchKeyphrase = this._keyphraseMatches.exactMatchKeyphrase

		if (true === exactMatchFound) {
			if (0 === position) {
				return {
					score       : this._config.scores.good,
					resultTitle : __('Keyword in SEO title', td),
					resultText  : __(
						'Your keyword appears at the start of the SEO title.',
						td
					)
				}
			}
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword in SEO title', td),
				resultText  : __(
					'Your keyword appears in the SEO title, but not at the start. Moving it to the start usually works better in search results.',
					td
				)
			}
		}

		if (allWordsFound) {
			if ('ja' === language) {
				if (0 === position) {
					return {
						score       : this._config.scores.good,
						resultTitle : __('Keyword in SEO title', td),
						resultText  : __(
							'Your keyword appears at the start of the SEO title.',
							td
						)
					}
				}
				return {
					score       : this._config.scores.okay,
					resultTitle : __('Keyword in SEO title', td),
					resultText  : __(
						'Your SEO title doesn\'t start with your keyword. Move it to the start for better results.',
						td
					)
				}
			}
			return {
				score       : this._config.scores.okay,
				resultTitle : __('Keyword in SEO title', td),
				resultText  : __(
					'Your SEO title includes your keyword, but not as an exact phrase. Use the exact keyword — ideally at the start — for the strongest match.',
					td
				)
			}
		}

		if (exactMatchKeyphrase) {
			return {
				score       : this._config.scores.bad,
				resultTitle : __('Keyword in SEO title', td),
				resultText  : __(
					'Your SEO title doesn\'t include your exact keyword. Add it — ideally at the start — for better results.',
					td
				)
			}
		}

		return {
			score       : this._config.scores.bad,
			resultTitle : __('Keyword in SEO title', td),
			resultText  : sprintf(
				/* translators: %1$s expands to the keyword of the article, %2$s expands to the call to action text. */
				__(
					'Your SEO title is missing some words from your keyword "%1$s". %2$s.',
					td
				),
				keyphrase,
				feedbackStrings.bad
			)
		}
	}
}