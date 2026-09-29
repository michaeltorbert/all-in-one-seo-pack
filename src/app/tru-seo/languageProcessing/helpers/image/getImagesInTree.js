/**
 * Whether an image node is a WordPress emoji (Twemoji) rather than real content.
 *
 * Page builders analyze the rendered DOM, where emoji are turned into
 * `<img class="emoji">` tags — they should not count towards the image assessments.
 *
 * @param {Node} node The image node to inspect.
 * @returns {boolean} Whether the image is an emoji.
 */
const isEmojiImage = node => {
	const classes = node.attributes?.class
	if (classes) {
		// The analyzer stores the class attribute as a Set, but guard for other shapes.
		const hasEmojiClass = 'function' === typeof classes.has
			? classes.has('emoji')
			: -1 !== [].concat(classes).join(' ').split(' ').indexOf('emoji')

		if (hasEmojiClass) {
			return true
		}
	}

	// Some page builders strip the class attribute; the core emoji asset path is a reliable fallback.
	return /\/images\/core\/emoji\//.test(node.attributes?.src || '')
}

/**
 * Checks the tree for images.
 *
 * @param {Paper}       paper       The paper to check for images.
 *
 * @returns {Array} Array containing all images in the tree
 */
export default function (paper) {
	const tree = paper.getTree()

	if (!tree) {
		return []
	}

	return tree.findAll(node => 'img' === node.name && !isEmojiImage(node))
}