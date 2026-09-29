/**
 * Builds the WooCommerce product facts the productIdentifier and productSKU assessments read out
 * of `paper.customData`.
 *
 * The saved product comes from PHP (`currentPost.wooProduct`). On top of that we read the classic
 * product editor's own inputs where they exist, so typing a SKU updates the check without a save.
 * Woo's newer React product editor has no such inputs — there the saved values stand on their own.
 *
 * NOTE the casing: the assessments read `hasGlobalSKU` / `doAllVariantsHaveSKU` (upper) but
 * `canRetrieveGlobalSku` / `canRetrieveVariantSkus` (lower). Getting either wrong fails silently
 * as a permanent "ok" score rather than an error.
 */

const SELECTORS = Object.freeze({
	sku               : '#_sku',
	identifier        : '#_global_unique_id',
	productType       : '#product-type',
	variantSku        : 'input[name^="variable_sku"]',
	variantIdentifier : 'input[name^="variable_global_unique_id"]'
})

const hasValue = selector => {
	const field = document.querySelector(selector)

	return field ? '' !== String(field.value).trim() : null
}

// Returns null when no input is present, so callers can tell "absent" from "empty".
const everyFieldFilled = selector => {
	const fields = [ ...document.querySelectorAll(selector) ]

	return fields.length ? fields.every(f => '' !== String(f.value).trim()) : null
}

/**
 * Reads whatever the classic product editor currently has on screen.
 *
 * @returns {Object} The subset of product facts that could be read live.
 */
const readLiveFields = () => {
	const live = {}

	const productType = document.querySelector(SELECTORS.productType)
	if (productType) {
		live.productType = productType.value
	}

	const sku = hasValue(SELECTORS.sku)
	if (null !== sku) {
		live.hasGlobalSKU = sku
	}

	const identifier = hasValue(SELECTORS.identifier)
	if (null !== identifier) {
		live.hasGlobalIdentifier = identifier
	}

	/*
	 * Woo renders variation rows only once the Variations tab has been opened, so an empty result
	 * means "not loaded", not "no variants". Only override the saved variant facts when rows exist,
	 * otherwise a variable product would read as having none.
	 */
	const variantSkus = everyFieldFilled(SELECTORS.variantSku)
	if (null !== variantSkus) {
		live.hasVariants = true
		live.doAllVariantsHaveSKU = variantSkus
	}

	const variantIdentifiers = everyFieldFilled(SELECTORS.variantIdentifier)
	if (null !== variantIdentifiers) {
		live.hasVariants = true
		live.doAllVariantsHaveIdentifier = variantIdentifiers
	}

	return live
}

/**
 * Returns the product customData for the current post, or null when it is not a Woo product.
 *
 * @param {Object} currentPost The current post from the store.
 * @returns {Object|null} The product facts to place on `paper.customData`.
 */
export const getWooProductData = currentPost => {
	const saved = currentPost?.wooProduct
	if (!saved) {
		return null
	}

	return { ...saved, ...readLiveFields() }
}