/* eslint-disable no-unused-vars */
import { __ } from '@/vue/plugins/translations'

import { sanitizeString } from '../../languageProcessing'
import { filterShortcodesFromHTML } from '../../languageProcessing/helpers'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Matches the assessor types that analyse a term, so result copy can pick its noun.
 *
 * Deliberately a pattern rather than a list: the taxonomy and collection assessors come in SEO,
 * cornerstone and related-keyword variants, and an explicit list silently misses new ones.
 */
const TAXONOMY_CONTENT_TYPE_PATTERN = /taxonomy|collection/i

/**
 * The base class for an Assessment.
 */
class Assessment {
	/**
	 * Executes the assessment and return its result.
	 *
	 * @param {Paper}       _paper       The paper to run this assessment on.
	 * @param {Researcher}  _researcher  The researcher used for the assessment.
	 *
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	getResult (_paper, _researcher) {
		throw new Error('The method getResult is not implemented')
	}

	/**
	 * Checks whether the assessment is applicable.
	 *
	 * @param {Paper}       _paper       The paper to run this assessment on.
	 * @param {Researcher}  _researcher  The researcher used for the assessment.
	 *
	 * @returns {boolean} Whether the assessment is applicable, defaults to `true`.
	 */
	isApplicable (_paper, _researcher) {
		return true
	}

	/**
	 * Returns the noun to use for the analysed content in result copy.
	 *
	 * NOTE: The taxonomy's own registered label is preferred so a tag doesn't read as a category.
	 * It arrives on the config via the worker; `term` is the fallback when it doesn't.
	 *
	 * @returns {string} The content noun, singular.
	 */
	getContentNoun () {
		if (this._config?.contentNouns?.singular) {
			return this._config.contentNouns.singular
		}

		return this.isTaxonomyContent()
			? __('term', td)
			: __('post', td)
	}

	/**
	 * Returns whether the analysed content is a term.
	 *
	 * @returns {boolean} Whether the content is a term.
	 */
	isTaxonomyContent () {
		return TAXONOMY_CONTENT_TYPE_PATTERN.test(this._config?.customContentType || '')
	}

	/**
	 * Tests whether a `Paper` has enough content for assessments to be displayed.
	 *
	 * @param {Paper} paper 						The paper to run this assessment on.
	 * @param {number} contentNeededForAssessment	The minimum length in characters a text must have for assessments to be displayed.
	 *
	 * @returns {boolean} `true` if the text is of the required length, `false` otherwise.
	 */
	hasEnoughContentForAssessment (paper, contentNeededForAssessment = 50) {
		let text = paper.getText()
		text = filterShortcodesFromHTML(text, paper._attributes?.shortcodes)
		text = sanitizeString(text)
		return sanitizeString(text).length >= contentNeededForAssessment
	}
}

/* eslint-enable no-unused-vars */

export default Assessment