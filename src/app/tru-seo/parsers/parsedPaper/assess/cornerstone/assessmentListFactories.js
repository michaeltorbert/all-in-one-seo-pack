/**
 * Factory functions for creating lists of assessments for cornerstone content.
 *
 * To be used in creating the different kinds of assessors.
 */

// Shared placeholder used by the stub factories below. Each named export keeps
// its own identifier so future implementations can diverge independently
// without changing the public API.
const emptyAssessmentList = () => [
	// Needs to be populated by fancy new assessments that work on the tree representation of the text.
]

/**
 * Creates a new list of SEO assessments.
 *
 * @returns {module:parsedPaper/assess.Assessment[]} The list of SEO assessments.
 *
 * @private
 * @memberOf module:parsedPaper/assess
 */
const constructSEOAssessments = emptyAssessmentList

/**
 * Creates a new list of readability assessments.
 *
 * @returns {module:parsedPaper/assess.Assessment[]} The list of readability assessments.
 *
 * @private
 * @memberOf module:parsedPaper/assess
 */
const constructReadabilityAssessments = emptyAssessmentList

/**
 * Creates a new list of SEO assessments for related keyphrases.
 *
 * @returns {module:parsedPaper/assess.Assessment[]} The list of SEO assessments.
 *
 * @private
 * @memberOf module:parsedPaper/assess
 */
const constructRelatedKeyphraseAssessments = emptyAssessmentList

export {
	constructSEOAssessments,
	constructReadabilityAssessments,
	constructRelatedKeyphraseAssessments
}