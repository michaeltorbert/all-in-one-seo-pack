import reject from 'lodash-es/reject'

/**
 * Returns all paragraphs in a given Paper.
 * Remove paragraphs that do not contain sentences or only consist of links.
 *
 * @param {Paper} paper The current paper.
 * @returns {Paragraph[]} All paragraphs in the paper.
 */
export default function (paper) {
	let paragraphs = paper.getTree().findAll(node => 'p' === node.name)

	// Remove empty paragraphs without sentences and paragraphs only consisting of links.
	paragraphs = reject(paragraphs, paragraph => 0 === paragraph.sentences.length)
	paragraphs = reject(paragraphs, paragraph => paragraph.childNodes.every(node => 'a' === node.name))

	return paragraphs
}