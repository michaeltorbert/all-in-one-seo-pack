/**
 * Determines the custom analysis type based on current context.
 *
 * @since 5.0.0
 *
 * @param {Object} currentPost The current post/term from the store.
 * @param {Object} rootStore The root store with global data.
 * @returns {string} The custom analysis type for assessors.
 */
export const getCustomAnalysisType = (currentPost, rootStore) => {
	// No custom type for non-WooCommerce sites
	if (!rootStore?.aioseo?.data?.isWooCommerceActive) {
		return ''
	}

	const context = currentPost?.context

	// EDITING A TERM (taxonomy term like category/tag)
	if ('term' === context) {
		const termType = currentPost?.termType

		// Product categories or tags = collection page
		if ('product_cat' === termType || 'product_tag' === termType) {
			return 'collectionPage'
		}

		return ''
	}

	// EDITING A POST/PRODUCT
	if ('post' === context) {
		const postType = currentPost?.postType

		// WooCommerce product pages
		if ('product' === postType) {
			return 'productPage'
		}

		// Store posts and pages (posts/pages on a WooCommerce site)
		if ('post' === postType || 'page' === postType) {
			// Check if it's the WooCommerce shop page
			if (rootStore.aioseo.data.isWooCommerceShopPage) {
				return 'storeBlog'
			}

			return 'storePostsAndPages'
		}
	}

	// Default: no custom analysis
	return ''
}