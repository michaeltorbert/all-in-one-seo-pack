import { __, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * @typedef {import("../../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../../values/").Paper } Paper
 */

/**
 * Assessment to check whether the keyword is included in the term name.
 *
 * The term name is the archive's visible heading, so this is the taxonomy counterpart of checking
 * the keyword against a post's H1.
 */
export default class KeyphraseInTermNameAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config]             The configuration to use.
	 * @param {Object} [config.scores]      The scores to use.
	 * @param {number} [config.scores.good] The score to return if all keyword words appear in the name.
	 * @param {number} [config.scores.okay] The score to return if some of them appear.
	 * @param {number} [config.scores.bad]  The score to return if none of them appear.
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				good : 9,
				okay : 6,
				bad  : 3
			}
		}

		this.identifier = 'keyphraseInTermName'

		/* translators: This is the name of the 'Keyword in term name' SEO assessment.
		 It appears before the feedback in the analysis, for example in the feedback string:
		 "Keyword in term name: Your keyword appears in the name." */
		this.name = __('Keyword in term name', td)

		this._config = merge(defaultConfig, config)
	}

	/**
	 * Checks whether the paper has both a keyword and a term name to assess.
	 *
	 * @param {Paper} paper The Paper object to assess.
	 * @returns {boolean}   Whether the assessment is applicable.
	 */
	isApplicable (paper) {
		return paper.hasKeyword() && paper.hasPostTitle()
	}

	/**
	 * Executes the assessment and returns a result.
	 *
	 * @param {Paper}      paper      The Paper object to assess.
	 * @param {Researcher} researcher The Researcher object containing all available researches.
	 * @returns {AssessmentResult}    The result of the assessment.
	 */
	getResult (paper) {
		const assessmentResult = new AssessmentResult()
		const calculated       = this.calculateResult(
			this.percentKeyphraseWordsInName(paper.getKeyword(), paper.getPostTitle()),
			paper.getKeyword()
		)

		assessmentResult.setScore(calculated.score)
		assessmentResult.setTitle(this.name)
		assessmentResult.setText(calculated.resultText)

		return assessmentResult
	}

	/**
	 * Returns what share of the keyphrase's words appear in the term name.
	 *
	 * A term name is a handful of words, so this matches on the words themselves rather than going
	 * through the morphology researcher — no language-support caveats, and nothing to throw.
	 *
	 * @param {string} keyphrase The focus keyphrase.
	 * @param {string} termName  The term name.
	 * @returns {number}         The percentage of keyphrase words found, 0-100.
	 */
	percentKeyphraseWordsInName (keyphrase, termName) {
		const normalize        = value => (value || '').toLowerCase().replace(/[‘’']/g, '\'')
		const keyphraseWords   = normalize(keyphrase).split(/[^\p{L}\p{N}']+/u).filter(Boolean)
		const nameWords        = new Set(normalize(termName).split(/[^\p{L}\p{N}']+/u).filter(Boolean))

		if (!keyphraseWords.length) {
			return 0
		}

		const found = keyphraseWords.filter(word => nameWords.has(word)).length

		return Math.round(found / keyphraseWords.length * 100)
	}

	/**
	 * Returns the score and feedback for the given match percentage.
	 *
	 * @param {number} percentWordMatches The percentage of keyword words found in the term name.
	 * @param {string} keyphrase          The keyphrase, for the feedback string.
	 * @returns {{score: number, resultText: string}} The calculated result.
	 */
	calculateResult (percentWordMatches, keyphrase) {
		if (100 === percentWordMatches) {
			return {
				score      : this._config.scores.good,
				resultText : __('Your keyword appears in the term name — that helps the archive heading match what people searched for.', td)
			}
		}

		if (0 < percentWordMatches) {
			return {
				score      : this._config.scores.okay,
				resultText : sprintf(
					/* translators: 1 - The focus keyword. */
					__('The term name only contains part of your keyword "%1$s". Using the full keyword makes the archive heading a closer match.', td),
					keyphrase
				)
			}
		}

		return {
			score      : this._config.scores.bad,
			resultText : sprintf(
				/* translators: 1 - The focus keyword. */
				__('Your keyword "%1$s" is missing from the term name. The name is the heading people see on the archive, so include it where it reads naturally.', td),
				keyphrase
			)
		}
	}
}