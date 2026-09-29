/**
 * Creates a location of an element in the source code.
 *
 * @param {Object?} startTag The location of the start tag of the element, if it has one.
 * @param {number} startTag.startOffset The start position of the start tag.
 * @param {number} startTag.endOffset The end position of the start tag.
 *
 * @param {Object?} endTag The location of the end tag of the element, if it has one.
 * @param {number} endTag.startOffset The start position of the end tag.
 * @param {number} endTag.endOffset The end position of the end tag.
 *
 * @param {Object} startOffset The start position of the element.
 * @param {Object} endOffset The end position of the element.
 *
 * @returns {Object} The source code location object.
 */
function SourceCodeLocation ({ startTag, endTag, startOffset, endOffset }) {
	const location = { startOffset, endOffset }
	if (startTag) {
		location.startTag = { startOffset: startTag.startOffset, endOffset: startTag.endOffset }
	}
	if (endTag) {
		location.endTag = { startOffset: endTag.startOffset, endOffset: endTag.endOffset }
	}

	return location
}

export default SourceCodeLocation