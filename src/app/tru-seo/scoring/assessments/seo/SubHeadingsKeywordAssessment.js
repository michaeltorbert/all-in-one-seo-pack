import { __, _n, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'
import { getSubheadingsAll } from '../../../languageProcessing/helpers/html/getSubheadings'
import Assessment from '../assessment'
import { inRangeStartEndInclusive } from '../../helpers/assessments/inRange.js'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Represents the assessment that checks if the keyword is present in one of the subheadings.
 */
export default class SubHeadingsKeywordAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} config The configuration to use.
	 *
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			parameters : {
				lowerBoundary            : 0.3,
				recommendedMaximumLength : 300,
				upperBoundary            : 0.75
			},
			scores : {
				noKeyphraseOrText          : 1,
				badLongTextNoSubheadings   : 2,
				noMatches                  : 3,
				tooFewMatches              : 3,
				goodNumberOfMatches        : 9,
				goodShortTextNoSubheadings : 9,
				tooManyMatches             : 3
			},
			cornerstoneContent : false
		}

		this.identifier = 'subheadingsKeyword'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Runs the matchKeywordInSubheadings research and based on this returns an assessment result.
	 *
	 * @param {Paper} paper             The paper to use for the assessment.
	 * @param {Researcher} researcher   The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (paper, researcher) {
		const languageSpecificConfig = researcher.getConfig('subheadingsTooLong')
		// Only overwrite the config when there is a language-specific config.
		if (languageSpecificConfig) {
			this._config = this.getLanguageSpecificConfig(researcher, languageSpecificConfig)
		}

		this._subHeadingsResearchResult = researcher.getResearch('matchKeywordInSubheadings')

		const assessmentResult = new AssessmentResult()

		this._minNumberOfSubheadings = Math.ceil(this._subHeadingsResearchResult.count * this._config.parameters.lowerBoundary)
		this._maxNumberOfSubheadings = Math.floor(this._subHeadingsResearchResult.count * this._config.parameters.upperBoundary)
		const calculatedResult = this.calculateResult(paper)

		assessmentResult.setScore(calculatedResult.score)
		assessmentResult.setTitle(calculatedResult.resultTitle)
		assessmentResult.setText(calculatedResult.resultText)

		return assessmentResult
	}

	/**
	 * Checks if there is language-specific config, and if so, overwrite the current config with it.
	 *
	 * @param {Researcher} _researcher Unused; kept for compatibility with sibling getLanguageSpecificConfig signatures.
	 * @param {Object} languageSpecificConfig The language-specific config to use.
	 *
	 * @returns {Object} The language-specific config or the current config if there is no language-specific config.
	 */
	getLanguageSpecificConfig (_researcher, languageSpecificConfig) {
		const currentConfig = this._config
		// Check if a language has a default cornerstone configuration.
		if (true === currentConfig.cornerstoneContent && Object.hasOwn(languageSpecificConfig,  'cornerstoneParameters')) {
			return merge(currentConfig, languageSpecificConfig.cornerstoneParameters)
		}

		// Use the default language-specific config for non-cornerstone condition.
		return merge(currentConfig, languageSpecificConfig.defaultParameters)
	}

	/**
	 * Checks whether the paper has subheadings.
	 *
	 * @param {Paper} paper The paper to use for the check.
	 *
	 * @returns {boolean} True when there is at least one subheading.
	 */
	hasSubheadings (paper) {
		const subheadings =  getSubheadingsAll(paper.getText())
		return 0 < subheadings.length
	}

	/**
	 * Checks whether there are too few subheadings with the keyword.
	 *
	 * This is the case if the number of subheadings with the keyword is more than 0 but less than the specified
	 * recommended minimum.
	 *
	 * @returns {boolean} Returns true if the keyword is included in too few subheadings.
	 */
	hasTooFewMatches () {
		return 0 < this._subHeadingsResearchResult.matches && this._subHeadingsResearchResult.matches < this._minNumberOfSubheadings
	}

	/**
	 * Checks whether there are too many subheadings with the keyword.
	 *
	 * The upper limit is only applicable if there is more than one subheading. If there is only one subheading with
	 * the keyword, this would otherwise always lead to a 100% match rate.
	 *
	 * @returns {boolean} Returns true if there is more than one subheading and if the keyword is included in fewer
	 *                    subheadings than the recommended maximum.
	 */
	hasTooManyMatches () {
		return 1 < this._subHeadingsResearchResult.count && this._subHeadingsResearchResult.matches > this._maxNumberOfSubheadings
	}

	/**
	 * Checks whether there is only one higher-level subheading and this subheading includes the keyword.
	 *
	 * @returns {boolean} Returns true if there is exactly one higher-level subheading and this
	 * subheading has a keyword match.
	 */
	isOneOfOne () {
		return 1 === this._subHeadingsResearchResult.count && 1 === this._subHeadingsResearchResult.matches
	}

	/**
	 * Checks whether there is a good number of subheadings with the keyword.
	 *
	 * This is the case if there is only one subheading and that subheading includes the keyword or if the number of
	 * subheadings with the keyword is within the specified recommended range.
	 *
	 * @returns {boolean} Returns true if the keyword is included in a sufficient number of subheadings.
	 */
	hasGoodNumberOfMatches () {
		return inRangeStartEndInclusive(
			this._subHeadingsResearchResult.matches,
			this._minNumberOfSubheadings,
			this._maxNumberOfSubheadings
		)
	}

	/**
	 * Determines the score and the Result text for the case there are no subheadings.
	 *
	 * @returns {{score: number, resultTitle: string, resultText: string}} The object with the calculated score and the result text.
	 */
	getResultForNoSubheadings () {
		const textLength = this._subHeadingsResearchResult.textLength

		if (textLength >= this._config.parameters.recommendedMaximumLength) {
			return {
				score       : this._config.scores.badLongTextNoSubheadings,
				resultTitle : __('Keyword in subheading', td),
				resultText  : __(
					'None of your subheadings mention your keyword. Add it to at least one subheading.',
					td
				)
			}
		}
		if (textLength < this._config.parameters.recommendedMaximumLength) {
			return {
				score       : this._config.scores.goodShortTextNoSubheadings,
				resultTitle : __('Keyword in subheading', td),
				resultText  : __(
					'Your post is short enough that subheadings aren\'t needed.',
					td
				)
			}
		}
	}

	/**
	 * Determines the score and the Result text for the subheadings.
	 * @param {Paper} paper to use for the check.
	 * @returns {{score: number, resultText: string}} The object with the calculated score and the result text.
	 */
	calculateResult (paper) {
		if (!paper.hasKeyword() || !paper.hasText()) {
			return {
				score       : this._config.scores.noKeyphraseOrText,
				resultTitle : __('Keyword in subheading', td),
				resultText  : __(
					'Add a focus keyword and some content to enable this check.',
					td
				)
			}
		}

		if (!this.hasSubheadings(paper)) {
			return this.getResultForNoSubheadings()
		}

		if (this.hasTooFewMatches()) {
			return {
				score       : this._config.scores.tooFewMatches,
				resultTitle : __('Keyword in subheading', td),
				resultText  : sprintf(
					/* Translators: 1 - Number of subheadings that mention the keyword. */
					_n(
						'Only %1$s of your subheadings mentions your keyword. Add it to a few more to reinforce the topic.',
						'Only %1$s of your subheadings mention your keyword. Add it to a few more to reinforce the topic.',
						this._subHeadingsResearchResult.matches,
						td
					),
					this._subHeadingsResearchResult.matches
				)
			}
		}

		if (this.hasTooManyMatches()) {
			return {
				score       : this._config.scores.tooManyMatches,
				resultTitle : __('Keyword in subheading', td),
				resultText  : __(
					'More than 75% of your subheadings include your keyword — that\'s repetitive. Vary the wording so the post reads naturally.',
					td
				)
			}
		}

		if (this.isOneOfOne()) {
			return {
				score       : this._config.scores.goodNumberOfMatches,
				resultTitle : __('Keyword in subheading', td),
				resultText  : __(
					'Your subheading mentions your keyword.',
					td
				)
			}
		}

		if (this.hasGoodNumberOfMatches()) {
			return {
				score       : this._config.scores.goodNumberOfMatches,
				resultTitle : __('Keyword in subheading', td),
				resultText  : sprintf(
					/* Translators: 1 - Number of subheadings. */
					_n(
						'%1$s of your subheadings mentions your keyword.',
						'%1$s of your subheadings mention your keyword.',
						this._subHeadingsResearchResult.matches,
						td
					),
					this._subHeadingsResearchResult.matches
				)
			}
		}

		return {
			score       : this._config.scores.noMatches,
			resultTitle : __('Keyword in subheading', td),
			resultText  : __(
				'Add your keyword to a subheading — it reinforces the topic for skimming readers and for search engines.',
				td
			)
		}
	}
}