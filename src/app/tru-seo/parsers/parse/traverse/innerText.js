import { isEmpty } from 'lodash-es'

/**
 * @typedef {import("../structure").Node} Node
 * @typedef {import("../structure").Text} Text
 */

/**
 * Gathers the text content of the given node.
 *
 * @param {Node|Text} node The node to gather the text content from.
 *
 * @returns {string} The text content.
 */
export default function innerText (node) {
	let text = ''

	if (!isEmpty(node.childNodes)) {
		node.childNodes.forEach(child => {
			if ('#text' === child.name) {
				text += child.value
			} else if ('br' === child.name) {
				text += '\n'
			} else {
				text += innerText(child)
			}
		})
	}

	return text
}