/**
 * Whether a node is a WordPress emoji image (`<img class="emoji">`), which
 * `wp-emoji`/Twemoji substitutes for an emoji or special glyph in the editor
 * DOM. Its `alt` holds the original character(s).
 *
 * @param {Node} node The node to test.
 * @returns {boolean} True for an emoji image element.
 */
const isEmojiImage = (node) => {
	return 'IMG' === node.tagName && node.classList?.contains('emoji')
}

/**
 * Builds a canonical character stream from a root element's text nodes.
 *
 * `text` is the concatenation of every descendant Text node in document
 * order — the order a `SHOW_TEXT` TreeWalker visits. Emoji images
 * (`<img class="emoji">`, injected by `wp-emoji`/Twemoji in place of an
 * emoji or special glyph) contribute their `alt` character(s) too, so the
 * stream stays aligned with the analyzer's sentence text (which keeps the
 * original character). `segments` records each contributor's `[start, end)`
 * range within the stream, so a stream offset can be resolved to a DOM
 * position via `rangeFromStream` without re-walking the DOM.
 *
 * Unlike `outerText` (CSS-aware, forces layout reflow, inserts synthetic
 * `\n` between block-level children), this stream maps 1:1 to the DOM
 * text nodes — so offsets matched in `text` can be applied directly to
 * a DOM Range without drift across `<li>`/`<td>`/etc. boundaries.
 *
 * @param {Node} root The element to extract text from.
 * @returns {{ text: string, segments: Array<{node: Node, start: number, end: number, element?: boolean}> }} The text stream and its segment map.
 */
export const buildTextStream = (root) => {
	const segments = []
	let text       = ''

	if (!root || !root.ownerDocument) {
		return { text, segments }
	}

	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
	while (walker.nextNode()) {
		const node = walker.currentNode

		if (Node.TEXT_NODE === node.nodeType) {
			const len = node.textContent.length
			if (!len) {
				continue
			}

			segments.push({ node, start: text.length, end: text.length + len })
			text += node.textContent

			continue
		}

		if (isEmojiImage(node)) {
			const alt = node.getAttribute('alt') || ''
			if (!alt.length) {
				continue
			}

			segments.push({ node, start: text.length, end: text.length + alt.length, element: true })
			text += alt
		}
	}

	return { text, segments }
}

/**
 * Binary-searches the segments array for the segment containing `offset`.
 * Returns -1 if the offset falls outside the stream.
 *
 * @param {Array}  segments Segments from `buildTextStream`.
 * @param {number} offset   Stream offset to locate.
 * @returns {number} The segment index, or -1 if not found.
 */
const findSegmentIndex = (segments, offset) => {
	let lo = 0,
		hi = segments.length - 1

	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		const seg = segments[mid]
		if (offset < seg.start) {
			hi = mid - 1
		} else if (offset >= seg.end) {
			lo = mid + 1
		} else {
			return mid
		}
	}

	return -1
}

/**
 * Anchors one edge of a range at a stream offset within a segment.
 *
 * Emoji-image segments (`element: true`) are atomic — the offset falls
 * before or after the whole image — so the edge is set with
 * `setStart/EndBefore/After`. Text segments use the character offset, and
 * a length mismatch means the cached node was mutated (a stale segment),
 * signalled by returning false so the caller can bail to a collapsed range.
 *
 * @param {Range}   range   The range to anchor.
 * @param {Object}  segment The target segment from `buildTextStream`.
 * @param {number}  offset  The stream offset to anchor at.
 * @param {boolean} isStart Whether this is the range's start edge.
 * @returns {boolean} True on success, false if the segment is stale.
 */
const anchorEdge = (range, segment, offset, isStart) => {
	if (segment.element) {
		const after = isStart ? offset > segment.start : offset >= segment.end
		if (isStart) {
			after ? range.setStartAfter(segment.node) : range.setStartBefore(segment.node)
		} else {
			after ? range.setEndAfter(segment.node) : range.setEndBefore(segment.node)
		}

		return true
	}

	const localOffset = offset - segment.start
	if ((segment.node?.length ?? 0) < localOffset) {
		return false
	}

	isStart ? range.setStart(segment.node, localOffset) : range.setEnd(segment.node, localOffset)

	return true
}

/**
 * Builds a DOM Range from stream offsets using a `buildTextStream` map.
 *
 * `endOffset` is exclusive (matches `match.index + match[0].length`).
 * Returns an empty (collapsed) range if offsets fall outside the stream.
 *
 * Segment node references stay valid only until that segment's text node
 * is split (e.g. by `Range.surroundContents`). Callers that annotate
 * multiple ranges per parent should iterate marks in descending offset
 * order — splitting a later segment leaves earlier segments untouched,
 * so unprocessed segments remain resolvable.
 *
 * @param {Document} doc         Owning document for the range.
 * @param {Array}    segments    Segments from `buildTextStream`.
 * @param {number}   startOffset Stream offset for the range start (inclusive).
 * @param {number}   endOffset   Stream offset for the range end (exclusive).
 * @returns {Range} A DOM Range spanning the stream offsets.
 */
export const rangeFromStream = (doc, segments, startOffset, endOffset) => {
	const range = doc.createRange()
	if (!segments.length) {
		return range
	}

	const startIdx = findSegmentIndex(segments, startOffset)
	const endIdx   = findSegmentIndex(segments, Math.max(endOffset - 1, startOffset))
	if (0 > startIdx || 0 > endIdx) {
		return range
	}

	// Bail if a cached node has been mutated (split, emptied, or detached)
	// since `buildTextStream` ran — using stale offsets would throw
	// `IndexSizeError`. A collapsed range lets the caller fall back to a
	// fresh live-DOM walk.
	if (
		!anchorEdge(range, segments[startIdx], startOffset, true) ||
		!anchorEdge(range, segments[endIdx], endOffset, false)
	) {
		return doc.createRange()
	}

	return range
}