const MEASUREMENT_ELEMENT_ID = 'aioseo-text-width-measurement'

// Standalone pixel-width measurement for SEO title/description counters. Kept out of
// the TruSEO module so the counters work whether or not TruSEO is enabled. The font
// (arial / 20px / 400) mirrors the TruSEO title-width check
// (app/tru-seo/helpers/createMeasurementElement.js) so the counter and the check agree;
// keep them in sync.
const getMeasurementElement = () => {
	let element = document.getElementById(MEASUREMENT_ELEMENT_ID)
	if (element) {
		return element
	}

	element = document.createElement('div')
	element.id = MEASUREMENT_ELEMENT_ID
	element.style.position = 'absolute'
	element.style.left = '-9999em'
	element.style.top = '0'
	element.style.height = '0'
	element.style.overflow = 'hidden'
	element.style.fontFamily = 'arial, sans-serif'
	element.style.fontSize = '20px'
	element.style.fontWeight = '400'

	document.body.appendChild(element)

	return element
}

/**
 * Measures the rendered pixel width of a string, the way search engines gauge title width.
 *
 * @param {string} text The text to measure.
 * @returns {number}    The width in pixels (0 for empty text).
 */
export const measureTextWidth = (text) => {
	if (!text) {
		return 0
	}

	const element = getMeasurementElement()
	element.innerText = String(text)

	return element.offsetWidth
}