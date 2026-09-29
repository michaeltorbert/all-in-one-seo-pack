import CollectionSEOAssessor from '../CollectionSEOAssessor'
import { TAXONOMY_TEXT_LENGTH_OPTIONS } from '../../taxonomyAssessor.js'

/**
 * The CollectionCornerstoneSEOAssessor class is used for the SEO analysis for cornerstone collections.
 */
export default class CollectionCornerstoneSEOAssessor extends CollectionSEOAssessor {
	/**
	 * Returns the assessor type.
	 *
	 * @returns {string} The assessor type.
	 */
	assessorType () {
		return 'collectionCornerstoneSEOAssessor'
	}

	/**
	 * Returns the text length options to use.
	 *
	 * @returns {Object} The text length options.
	 */
	textLengthOptions () {
		return {
			...TAXONOMY_TEXT_LENGTH_OPTIONS,
			cornerstoneContent : true,
			customContentType  : this.type
		}
	}
}