/**
 * @returns {RegExp} A precompiled regex for recognizing self-closing image tags.
 */
export const imageRegex = /<img(?:[^>]+)?>(<\/img>)*/gi

/**
 * Retrieves all image tags from a given text string.
 *
 * @param {string} text The text string to check for images.
 * @returns {RegExpMatchArray|[]} An array containing all types of found images.
 */
export default function (text) {
	// Early return if the text is not a string.
	if ('string' !== typeof text) {
		return []
	}
	return text.match(imageRegex) || []
}