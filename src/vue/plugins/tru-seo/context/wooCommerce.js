import {
	useLicenseStore,
	useRootStore,
	useTagsStore,
	usePostEditorStore
} from '@/vue/stores'

import { maybeUpdatePost } from '@/vue/plugins/tru-seo/components/helpers'

const isUnlicensed = () => {
	const licenseStore = useLicenseStore()
	return licenseStore?.isUnlicensed || false
}

const refreshWoocommerceStore = () => {
	let productSku   = '',
		productPrice = '',
		productBrand = '',
		brands       = [],
		brandFound   = false,
		productCatLabel = ''

	const tagsStore       = useTagsStore()
	const postEditorStore = usePostEditorStore()

	const sku = document.getElementById('_sku')
	if (sku) {
		productSku = sku.value
		tagsStore.updateWooCommerceSku(productSku)
	}

	const salePrice = document.getElementById('_sale_price')
	const price     = document.getElementById('_regular_price')

	if (salePrice) {
		productPrice = salePrice.value
	}

	if (!productPrice && price) {
		productPrice = price.value
	}

	const rootStore          = useRootStore()
	const parsedProductPrice = rootStore.aioseo.data?.wooCommerce?.currencySymbol || '$' + parseFloat(productPrice || 0).toFixed(2)
	tagsStore.updateWooCommercePrice(parsedProductPrice)

	const brandPluginSelector = [
		'pwb-brand', // Perfect WooCommerce Brands
		'product_brand' // WooCommerce Brands
	]

	for (const brandPlugin of brandPluginSelector) {
		brands = document.querySelectorAll(`#post input[name="tax_input[${brandPlugin}][]"]:checked`)
		if (!brands.length) {
			continue
		}

		if (productBrand !== brands[0].parentNode.innerText) {
			productBrand = brands[0].parentNode.innerText
			tagsStore.updateWooCommerceBrand(brands[0].parentNode.innerText)
		}

		// Set product brand if primary term is set.
		if (postEditorStore.currentPost?.primary_term?.[brandPlugin]) {
			const productBrandElement = document.querySelector(`#${brandPlugin}checklist input[value="${postEditorStore.currentPost.primary_term[brandPlugin]}"]`)
			if (productBrandElement?.parentNode?.innerText) {
				tagsStore.updateWooCommerceBrand(productBrandElement.parentNode.innerText)
			}
		}

		brandFound = true
		break // Exit loop after first brand is found
	}

	if (!brandFound) {
		tagsStore.updateWooCommerceBrand('')
	}

	const productCats = document.querySelectorAll('#post input[name="tax_input[product_cat][]"]:checked')

	if (productCats.length) {
		productCatLabel = productCats[0].parentNode.innerText
	}

	// The primary term label takes precedence.
	if (postEditorStore.currentPost?.primary_term?.product_cat) {
		const productCategory = document.getElementById(`in-product_cat-${postEditorStore.currentPost.primary_term.product_cat}`) ||
			document.getElementById(`in-product_cat-${postEditorStore.currentPost.primary_term.product_cat}-1`)

		productCatLabel = productCategory?.childNodes[0]?.innerText || ''
		// Means that we are using an old version (such as WP 6.6.2)
		if (!productCategory.hasChildNodes()) {
			productCatLabel = productCategory?.parentNode?.innerText || ''
		}
	}

	tagsStore.updateTaxonomyTitle(productCatLabel)
}

window.addEventListener('DOMContentLoaded', () => {
	if ('customize' !== window?.aioseo?.screen?.base && !isUnlicensed()) {
		refreshWoocommerceStore()
	}
})

/**
 * Fields the productIdentifier and productSKU assessments read out of `paper.customData`.
 * `#product-type` matters too — switching simple/variable changes which scoring branch applies.
 */
const PRODUCT_DATA_FIELDS = [
	'#_sku',
	'#_global_unique_id',
	'#product-type',
	'[name^="variable_sku"]',
	'[name^="variable_global_unique_id"]'
].join(', ')

/**
 * Re-runs the analysis when a field the product assessments depend on changes.
 *
 * These live in WooCommerce's own metabox, outside the editor content the analysis already
 * watches, so without this nothing triggers a fresh run and the check appears stuck until the
 * next unrelated edit or a save.
 *
 * @returns {void}
 */
const watchProductDataFields = () => {
	// Delegated: Woo renders variation rows only when the Variations tab is opened, so listeners
	// bound to individual nodes at load time would miss every variation field.
	const onFieldChange = event => {
		if (event.target?.matches?.(PRODUCT_DATA_FIELDS)) {
			// maybeUpdatePost debounces, so keystrokes coalesce into one analysis.
			maybeUpdatePost(500)
		}
	}

	document.addEventListener('input', onFieldChange)
	document.addEventListener('change', onFieldChange)
}

export const watchWooCommerce = () => {
	// Runs regardless of license: the product assessments ship in both builds.
	watchProductDataFields()

	if (isUnlicensed()) {
		return
	}

	window.addEventListener('change', (event) => {
		if ('INPUT' !== event.target.tagName) {
			return
		}

		refreshWoocommerceStore()
	})

	window.aioseoBus.$on('standalone-update-post', (param) => {
		if (!param.primary_term) {
			return
		}

		refreshWoocommerceStore()
	})
}