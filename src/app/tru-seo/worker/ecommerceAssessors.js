/**
 * E-commerce assessor configurations.
 * This module is dynamically imported only when e-commerce post types are detected,
 * reducing the initial worker bundle size for non-e-commerce sites.
 *
 * @since 5.0.0
 */

// Import e-commerce assessors directly from the assessors module.
import {
	// Product page assessors.
	ProductSEOAssessor,
	ProductCornerstoneSEOAssessor,
	ProductContentAssessor,
	ProductCornerstoneContentAssessor,
	ProductRelatedKeywordAssessor,
	ProductCornerstoneRelatedKeywordAssessor,

	// Store blog assessors.
	StoreBlogSEOAssessor,
	StoreBlogCornerstoneSEOAssessor,

	// Store posts and pages assessors.
	StorePostsAndPagesSEOAssessor,
	StorePostsAndPagesCornerstoneSEOAssessor,
	StorePostsAndPagesContentAssessor,
	StorePostsAndPagesCornerstoneContentAssessor,
	StorePostsAndPagesRelatedKeywordAssessor,
	StorePostsAndPagesCornerstoneRelatedKeywordAssessor,

	// Collection page assessors.
	CollectionSEOAssessor,
	CollectionCornerstoneSEOAssessor,
	CollectionRelatedKeywordAssessor,
	CollectionCornerstoneRelatedKeywordAssessor
} from '@/app/tru-seo/scoring/assessors'

/**
 * Assessor configuration map for custom e-commerce post types.
 * Each key represents a post type, and the value contains the assessor classes to register.
 *
 * @since 5.0.0
 */
export const assessorConfigs = {
	productPage : {
		seo                       : ProductSEOAssessor,
		cornerstoneSeo            : ProductCornerstoneSEOAssessor,
		content                   : ProductContentAssessor,
		cornerstoneContent        : ProductCornerstoneContentAssessor,
		relatedKeyword            : ProductRelatedKeywordAssessor,
		cornerstoneRelatedKeyword : ProductCornerstoneRelatedKeywordAssessor
	},
	storeBlog : {
		seo            : StoreBlogSEOAssessor,
		cornerstoneSeo : StoreBlogCornerstoneSEOAssessor
	},
	storePostsAndPages : {
		seo                       : StorePostsAndPagesSEOAssessor,
		cornerstoneSeo            : StorePostsAndPagesCornerstoneSEOAssessor,
		content                   : StorePostsAndPagesContentAssessor,
		cornerstoneContent        : StorePostsAndPagesCornerstoneContentAssessor,
		relatedKeyword            : StorePostsAndPagesRelatedKeywordAssessor,
		cornerstoneRelatedKeyword : StorePostsAndPagesCornerstoneRelatedKeywordAssessor
	},
	collectionPage : {
		seo                       : CollectionSEOAssessor,
		cornerstoneSeo            : CollectionCornerstoneSEOAssessor,
		content                   : StorePostsAndPagesContentAssessor,
		cornerstoneContent        : StorePostsAndPagesCornerstoneContentAssessor,
		relatedKeyword            : CollectionRelatedKeywordAssessor,
		cornerstoneRelatedKeyword : CollectionCornerstoneRelatedKeywordAssessor
	}
}

/**
 * List of e-commerce custom analysis types.
 *
 * @since 5.0.0
 */
export const ecommerceAnalysisTypes = [
	'productPage',
	'storeBlog',
	'storePostsAndPages',
	'collectionPage'
]

/**
 * Checks if the given analysis type is an e-commerce type.
 *
 * @since 5.0.0
 * @param {string} analysisType The custom analysis type.
 * @returns {boolean} True if it's an e-commerce type.
 */
export function isEcommerceAnalysisType (analysisType) {
	return ecommerceAnalysisTypes.includes(analysisType)
}