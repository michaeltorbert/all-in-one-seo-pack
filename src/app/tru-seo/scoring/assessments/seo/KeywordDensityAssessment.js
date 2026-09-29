import { __, _n, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import recommendedKeyphraseCount from '../../helpers/assessments/recommendedKeywordCount.js'
import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'
import { inRangeEndInclusive, inRangeStartEndInclusive, inRangeStartInclusive } from '../../helpers/assessments/inRange'
import keyphraseLengthFactor from '../../helpers/assessments/keyphraseLengthFactor.js'

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 * @typedef {import("../../../values/Mark").default } Mark
 */

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {Object} KeyphraseDensityConfig
 * @property {Object} parameters The parameters to use.
 * If word forms are not available:
 * @property {Object} parameters.noWordForms The parameters to use when no morphological forms are available.
 * @property {number} parameters.noWordForms.overMaximum The percentage of keyword instances in the text that
 * is way over the maximum.
 * @property {number} parameters.noWordForms.maximum The maximum percentage of keyword instances in the text.
 * @property {number} parameters.noWordForms.minimum The minimum percentage of keyword instances in the text.
 * If word forms are available:
 * @property {Object} parameters.multipleWordForms The parameters to use when morphological forms are available.
 * @property {number} parameters.multipleWordForms.overMaximum The percentage of keyword instances in the text that
 * is way over the maximum.
 * @property {number} parameters.multipleWordForms.maximum The maximum percentage of keyword instances in the text.
 * @property {number} parameters.multipleWordForms.minimum The minimum percentage of keyword instances in the text.
 * @property {Object} scores The scores to use.
 * @property {number} scores.wayOverMaximum The score to return if there are way too many instances of keyword in the text.
 * @property {number} scores.overMaximum The score to return if there are too many instances of keyword in the text.
 * @property {number} scores.correctDensity The score to return if there is a good number of keyword instances in the text.
 * @property {number} scores.underMinimum The score to return if there are not enough keyword instances in the text.
 * @property {number} scores.noKeyphraseOrText The score to return if there is no text or no keyword set.
 */

/**
 * Represents the assessment that will assess if the keyword density is within the recommended range.
 */
class KeyphraseDensityAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 * @param {Object} [config={}]   The configuration to use.
	 */
	constructor (config = {}) {
		super()

		/**
		 * The default configuration.
		 * @type KeyphraseDensityConfig
		 */
		const defaultConfig = {
			parameters : {
				noWordForms : {
					overMaximum : 4,
					maximum     : 3,
					minimum     : 0.5
				},
				multipleWordForms : {
					overMaximum : 4,
					maximum     : 3.5,
					minimum     : 0.5
				}
			},
			scores : {
				wayOverMaximum    : -50,
				overMaximum       : -8,
				correctDensity    : 9,
				underMinimum      : 4,
				noKeyphraseOrText : -50
			}
		}

		this.identifier = 'keyphraseDensity'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Determines correct boundaries depending on the availability of morphological forms.
	 *
	 * @param {number} keyphraseLength The length of the keyword in words.
	 * @param {number} textLength The length of the text in words.
	 * @returns {void}
	 */
	setBoundaries (keyphraseLength, textLength) {
		this._boundaries = this._config.parameters.noWordForms

		if (this._hasMorphologicalForms) {
			this._boundaries = this._config.parameters.multipleWordForms
		}
		this._minRecommendedKeyphraseCount = recommendedKeyphraseCount(keyphraseLength, this._boundaries.minimum, 'min', textLength)
		this._maxRecommendedKeyphraseCount = recommendedKeyphraseCount(keyphraseLength, this._boundaries.maximum, 'max', textLength)
	}

	/**
	 * Runs the keyword density module, based on this returns an assessment
	 * result with a score.
	 *
	 * @param {Paper} paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling the research.
	 *
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	getResult (paper, researcher) {
		const assessmentResult = new AssessmentResult()

		// Whether the paper has the data needed to return meaningful feedback (keyword and text).
		this._canAssess = paper.hasKeyword() && paper.hasText()

		let calculatedScore

		if (this._canAssess) {
			this._keyphraseCount = researcher.getResearch('getKeyphraseCount')
			this._keyphraseDensityResult = researcher.getResearch('getKeyphraseDensity')
			this._textLength = this._keyphraseDensityResult.textLength
			assessmentResult.setHasMarks(0 < this._keyphraseCount.count)
			if (100 > this._textLength) {
				// Calculate the score for short texts. A ceiling of 1 flagged a second, entirely
				// natural mention in a short text (e.g. a term description) as over-optimized.
				this._minRecommendedKeyphraseCount = 1
				this._maxRecommendedKeyphraseCount = 2
				calculatedScore = this.calculateResultShortText()
			} else {
				// Calculate the score for long texts.
				this._hasMorphologicalForms = false !== researcher.getData('morphology')
				const keyphraseLength = this._keyphraseCount.keyphraseLength
				this.setBoundaries(keyphraseLength, this._textLength)
				// Safe access with fallback
				const density = this._keyphraseDensityResult?.density ?? 0
				this._keyphraseDensity = density * keyphraseLengthFactor(keyphraseLength)
				calculatedScore = this.calculateResult()
			}
		} else {
			// Calculate the score for papers with no keyword or text.
			calculatedScore = this.calculateResult()
		}

		assessmentResult.setScore(calculatedScore.score)
		assessmentResult.setTitle(calculatedScore.resultTitle)
		assessmentResult.setText(calculatedScore.resultText)

		return assessmentResult
	}

	/**
	 * Checks whether there are no keyword matches in the text.
	 *
	 * @returns {boolean} Returns true if the keyword count is 0.
	 */
	hasNoMatches () {
		return 0 === this._keyphraseCount.count
	}

	/**
	 * Checks whether there are too few keyword matches in the text.
	 *
	 * @returns {boolean} Returns true if the rounded keyword density is below the recommended minimum,
	 * or if the keyword count is 1.
	 */
	hasTooFewMatches () {
		return inRangeStartInclusive(this._keyphraseDensity, 0, this._boundaries.minimum) || (1 === this._keyphraseCount.count)
	}

	/**
	 * Checks whether there is a good number of keyword matches in the text.
	 *
	 * @returns {boolean} Returns true if the rounded keyword density is between the recommended minimum and maximum,
	 * or if the keyword count is 2 and the recommended minimum is at most 2,
	 * or if the text length is less than the short text limit and the keyword count is 1.
	 */
	hasGoodNumberOfMatches () {
		return inRangeStartEndInclusive(this._keyphraseDensity, this._boundaries.minimum, this._boundaries.maximum) ||
			(2 === this._keyphraseCount.count && 2 >= this._minRecommendedKeyphraseCount)
	}

	/**
	 * Checks whether the number of keyword matches in the text is between the
	 * recommended maximum and the specified overMaximum value.
	 *
	 * @returns {boolean} Returns true if the rounded keyword density is between
	 *                    the recommended maximum and the specified overMaximum
	 *                    value.
	 */
	hasTooManyMatches () {
		return inRangeEndInclusive(
			this._keyphraseDensity,
			this._boundaries.maximum,
			this._boundaries.overMaximum
		)
	}

	/**
	 * Checks whether there is a good number of keyword matches in a short text (<= 100 words).
	 *
	 * @returns {boolean} Returns true if the number of keyword occurrences is between the minimum and maximum recommended count.
	 */
	hasGoodNumberOfMatchesShortText () {
		return inRangeStartEndInclusive(this._keyphraseCount.count, this._minRecommendedKeyphraseCount, this._maxRecommendedKeyphraseCount)
	}

	/**
	 * Checks whether the number of keyword matches in a short text (<= 100 words) is too high.
	 *
	 * @returns {boolean} Returns true if the number of keyword occurrences is one more than the maximum recommended count.
	 */
	hasTooManyMatchesShortText () {
		return this._keyphraseCount.count === this._maxRecommendedKeyphraseCount + 1
	}

	/**
	 * Creates a translation string for the first sentence of the feedback, which reports on the number of times
	 * the keyword was found.
	 *
	 * @returns {string} The first sentence of the feedback.
	 */
	getFeedbackStringsFirstSentence () {
		return sprintf(
			/* translators: %1$d expands to the number of times the keyword occurred in the text. */
			_n(
				'The keyword was found %1$d time.',
				'The keyword was found %1$d times.',
				this._keyphraseCount.count,
				td
			),
			this._keyphraseCount.count
		)
	}

	/**
	 * Returns the score for the keyword density.
	 *
	 *
	 * @returns {{score: number, resultText: string}} result object with a score and translation text.
	 */
	calculateResultShortText () {
		if (this.hasNoMatches()) {
			return {
				score       : this._config.scores.underMinimum,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the recommended minimal number of times the keyword should occur in the text, %2$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your keyword doesn\'t appear in the %2$s yet. For a %2$s this length, try using it at least %1$d time.',
						'Your keyword doesn\'t appear in the %2$s yet. For a %2$s this length, try using it at least %1$d times.',
						this._minRecommendedKeyphraseCount,
						td
					),
					this._minRecommendedKeyphraseCount,
					this.getContentNoun()
				)
			}
		}

		if (this.hasGoodNumberOfMatchesShortText()) {
			return {
				score       : this._config.scores.correctDensity,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of times the keyword occurred in the text. */
					_n(
						'Your keyword appears %1$d time — that\'s a healthy amount.',
						'Your keyword appears %1$d times — that\'s a healthy amount.',
						this._keyphraseCount.count,
						td
					),
					this._keyphraseCount.count
				)
			}
		}

		if (this.hasTooManyMatchesShortText()) {
			return {
				score       : this._config.scores.overMaximum,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of times the keyword occurred in the text. %2$d expands to the recommended maximum number of times the keyword should occur in the text, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your keyword appears %1$d time — more than the recommended %2$d for a %3$s this length. Using it too often can hurt readability and look spammy.',
						'Your keyword appears %1$d times — more than the recommended %2$d for a %3$s this length. Using it too often can hurt readability and look spammy.',
						this._keyphraseCount.count,
						td
					),
					this._keyphraseCount.count,
					this._maxRecommendedKeyphraseCount,
					this.getContentNoun()
				)
			}
		}

		// Implicitly returns this if the keyword count is higher than for any of the above conditions.
		return {
			score       : this._config.scores.wayOverMaximum,
			resultTitle : __('Keyword density', td),
			resultText  : sprintf(
				/* translators: %1$d expands to the number of times the keyword occurred in the text. %2$d expands to the recommended maximum number of times the keyword should occur in the text, %3$s expands to the content type (e.g. "post", "category"). */
				_n(
					'Your keyword appears %1$d time — well over the recommended %2$d for a %3$s this length. Cut down to keep the text natural.',
					'Your keyword appears %1$d times — well over the recommended %2$d for a %3$s this length. Cut down to keep the text natural.',
					this._keyphraseCount.count,
					td
				),
				this._keyphraseCount.count,
				this._maxRecommendedKeyphraseCount,
				this.getContentNoun()
			)
		}
	}

	/**
	 * Returns the score for the keyword density.
	 *
	 *
	 * @returns {{score: number, resultText: string}} result object with a score and translation text.
	 */
	calculateResult () {
		if (!this._canAssess) {
			return {
				score       : this._config.scores.noKeyphraseOrText,
				resultTitle : __('Keyword density', td),
				resultText  : __(
					'Add a focus keyword to enable this check.',
					td
				)
			}
		}

		if (this.hasNoMatches()) {
			return {
				score       : this._config.scores.underMinimum,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the recommended minimal number of times the keyword should occur in the text, %2$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your keyword doesn\'t appear in the %2$s yet. For a %2$s this length, try using it at least %1$d time.',
						'Your keyword doesn\'t appear in the %2$s yet. For a %2$s this length, try using it at least %1$d times.',
						this._minRecommendedKeyphraseCount,
						td
					),
					this._minRecommendedKeyphraseCount,
					this.getContentNoun()
				)
			}
		}

		if (this.hasTooFewMatches()) {
			return {
				score       : this._config.scores.underMinimum,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of times the keyword occurred in the text. %2$d expands to the recommended minimum number of times the keyword should occur in the text. */
					_n(
						'Your keyword appears %1$d time — less than the recommended %2$d for a post this length.',
						'Your keyword appears %1$d times — less than the recommended %2$d for a post this length.',
						this._keyphraseCount.count,
						td
					),
					this._keyphraseCount.count,
					this._minRecommendedKeyphraseCount
				)
			}
		}

		if (this.hasGoodNumberOfMatches()) {
			return {
				score       : this._config.scores.correctDensity,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of times the keyword occurred in the text. */
					_n(
						'Your keyword appears %1$d time — that\'s a healthy amount.',
						'Your keyword appears %1$d times — that\'s a healthy amount.',
						this._keyphraseCount.count,
						td
					),
					this._keyphraseCount.count
				)
			}
		}

		if (this.hasTooManyMatches()) {
			return {
				score       : this._config.scores.overMaximum,
				resultTitle : __('Keyword density', td),
				resultText  : sprintf(
					/* translators: %1$d expands to the number of times the keyword occurred in the text. %2$d expands to the recommended maximum number of times the keyword should occur in the text, %3$s expands to the content type (e.g. "post", "category"). */
					_n(
						'Your keyword appears %1$d time — more than the recommended %2$d for a %3$s this length. Using it too often can hurt readability and look spammy.',
						'Your keyword appears %1$d times — more than the recommended %2$d for a %3$s this length. Using it too often can hurt readability and look spammy.',
						this._keyphraseCount.count,
						td
					),
					this._keyphraseCount.count,
					this._maxRecommendedKeyphraseCount,
					this.getContentNoun()
				)
			}
		}

		// Implicitly returns this if the rounded keyword density is higher than overMaximum.
		return {
			score       : this._config.scores.wayOverMaximum,
			resultTitle : __('Keyword density', td),
			resultText  : sprintf(
				/* translators: %1$d expands to the number of times the keyword occurred in the text. %2$d expands to the recommended maximum number of times the keyword should occur in the text, %3$s expands to the content type (e.g. "post", "category"). */
				_n(
					'Your keyword appears %1$d time — well over the recommended %2$d for a %3$s this length. Cut down to keep the text natural.',
					'Your keyword appears %1$d times — well over the recommended %2$d for a %3$s this length. Cut down to keep the text natural.',
					this._keyphraseCount.count,
					td
				),
				this._keyphraseCount.count,
				this._maxRecommendedKeyphraseCount,
				this.getContentNoun()
			)
		}
	}

	/**
	 * Marks the occurrences of keyword in the text for the keyword density assessment.
	 *
	 * @returns {Mark[]} Marks that should be applied.
	 */
	getMarks () {
		return this._keyphraseCount.markings
	}
}

/**
 * This assessment checks if the keyword density is within the recommended range.
 * KeywordDensityAssessment was the previous name for KeyphraseDensityAssessment (hence the name of this file).
 * We keep (and expose) this assessment for backwards compatibility.
 *
 * @deprecated Use KeyphraseDensityAssessment instead.
 */
class KeywordDensityAssessment extends KeyphraseDensityAssessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config   The configuration to use.
	 */
	constructor (config = {}) {
		super(config)
		this.identifier = 'keywordDensity'
		console.warn('This object is deprecated, use KeyphraseDensityAssessment instead.')
	}
}

export {
	KeyphraseDensityAssessment,
	KeywordDensityAssessment
}

export default KeyphraseDensityAssessment