/**
 * Filter helpers for the html tree filter.
 * All helpers are functions that return a callback with the element as the only argument.
 */

/**
 * Creates a callback that checks if an element has a specific name.
 *
 * @param {string} name The name to check.
 *
 * @returns {function(*)} A function that returns true if the element has a specific name.
 */
export function elementHasName (name) {
	return (element) => {
		return element.name === name
	}
}

/**
 * Creates a callback that checks the class of an element.
 *
 * @param {string} className The classname to filter out.
 *
 * @returns {function(*): boolean} A function that returns true if a Node has a certain class.
 */
export function elementHasClass (className) {
	return (blockElement) => {
		return !!blockElement.attributes.class && blockElement.attributes.class.has(className)
	}
}

/**
 * Creates a callback that checks if an element has a certain ID.
 *
 * @param {string} id The ID we want to check against.
 *
 * @returns {function(*): boolean}  A function that returns true if an element has a certain ID.
 */
export function elementHasID (id) {
	return (element) => {
		return element.attributes.id === id
	}
}

/**
 * Creates a callback that checks if an element is an iframe but NOT a valid video oEmbed.
 * This allows video oEmbed iframes (YouTube, Vimeo, etc.) to pass through while filtering other iframes.
 *
 * @returns {function(*): boolean} A function that returns true if an element is a non-video iframe.
 */
export function elementIsNonVideoIframe () {
	// List of video oEmbed domains that should be excluded.
	const videoOEmbedDomains = [
		'youtube.com',
		'youtu.be',
		'vimeo.com',
		'player.vimeo.com',
		'dailymotion.com',
		'dai.ly',
		'videopress.com',
		'animoto.com',
		'tiktok.com'
	]

	return (element) => {
		// Check if element is an iframe.
		if ('iframe' !== element.name) {
			return false
		}

		// Check src attribute for video oEmbed domains.
		if (element.attributes.src) {
			const src = element.attributes.src.toLowerCase()
			const isVideoOEmbed = videoOEmbedDomains.some(domain => src.includes(domain))
			if (isVideoOEmbed) {
				return false
			}
		}

		// Check title attribute for video oEmbed domains (WordPress sandbox iframes).
		if (element.attributes.title) {
			const title = element.attributes.title.toLowerCase()
			const isVideoOEmbed = videoOEmbedDomains.some(domain => title.includes(domain))
			if (isVideoOEmbed) {
				return false
			}
		}

		// Return true if it's an iframe but NOT a video oEmbed.
		return true
	}
}