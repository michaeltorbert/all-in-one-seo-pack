import TaxonomyAssessor from '../taxonomyAssessor.js'

/**
 * The CollectionSEOAssessor class is used for the SEO analysis for collections.
 *
 * A collection page is a term, so the assessment list lives on {@see TaxonomyAssessor}. Only the
 * type differs, which is what the result copy and the worker's taxonomy handling key off.
 */
export default class CollectionSEOAssessor extends TaxonomyAssessor {
	/**
	 * Returns the assessor type.
	 *
	 * @returns {string} The assessor type.
	 */
	assessorType () {
		return 'collectionSEOAssessor'
	}
}