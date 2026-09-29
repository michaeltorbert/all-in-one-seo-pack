// Quill 2.x resolves selection through the top-level `document`
// (`document.getSelection()`, `document.activeElement`, `document.createRange()`
// and a `selectionchange` listener bound to `document`). When the editor is
// mounted inside the block editor iframe (WordPress 6.3+), the caret lives in
// the iframe's document, so the top-level selection is always empty and
// `quill.getSelection()` returns null. Reading `.index` off that null is what
// throws when a Smart Tag is clicked in the Recipe/Product blocks.
//
// This rebinds the document-dependent selection methods to the document that
// actually contains the editor. It is a no-op when the editor is in the
// top-level document, so non-iframe usages are untouched.
export default function bindQuillSelectionToOwnerDocument (quill) {
	const ownerDoc = quill.root.ownerDocument
	if (!ownerDoc || ownerDoc === document) {
		return
	}

	const selection = quill.selection
	const root      = selection.root

	const contains = (parent, descendant) => {
		try {
			// Firefox inserts inaccessible nodes around some elements.
			descendant.parentNode // eslint-disable-line no-unused-expressions
		} catch (e) {
			return false
		}
		return parent.contains(descendant)
	}

	selection.hasFocus = () =>
		ownerDoc.activeElement === root ||
		(null !== ownerDoc.activeElement && contains(root, ownerDoc.activeElement))

	selection.getNativeRange = () => {
		const nativeSelection = ownerDoc.getSelection()
		if (null === nativeSelection || 0 >= nativeSelection.rangeCount) {
			return null
		}

		const nativeRange = nativeSelection.getRangeAt(0)
		if (null === nativeRange) {
			return null
		}

		return selection.normalizeNative(nativeRange)
	}

	selection.setNativeRange = (startNode, startOffset, endNode = startNode, endOffset = startOffset, force = false) => {
		if (
			null !== startNode &&
			(null === root.parentNode || null === startNode.parentNode || null === endNode.parentNode)
		) {
			return
		}

		const nativeSelection = ownerDoc.getSelection()
		if (null === nativeSelection) {
			return
		}

		if (null === startNode) {
			nativeSelection.removeAllRanges()
			root.blur()
			return
		}

		if (!selection.hasFocus()) {
			root.focus({ preventScroll: true })
		}

		const currentNative = (selection.getNativeRange() || {}).native
		const isSameRange = null !== currentNative &&
			startNode === currentNative.startContainer &&
			startOffset === currentNative.startOffset &&
			endNode === currentNative.endContainer &&
			endOffset === currentNative.endOffset

		if (isSameRange && !force) {
			return
		}

		let start = startNode,
			startAt = startOffset,
			end = endNode,
			endAt = endOffset
		if ('BR' === start.nodeName) {
			startAt = Array.from(start.parentNode.childNodes).indexOf(start)
			start   = start.parentNode
		}
		if ('BR' === end.nodeName) {
			endAt = Array.from(end.parentNode.childNodes).indexOf(end)
			end   = end.parentNode
		}

		const range = ownerDoc.createRange()
		range.setStart(start, startAt)
		range.setEnd(end, endAt)
		nativeSelection.removeAllRanges()
		nativeSelection.addRange(range)
	}

	selection.getBounds = (index, length = 0) => {
		const scrollLength = selection.scroll.length()
		index  = Math.min(index, scrollLength - 1)
		length = Math.min(index + length, scrollLength - 1) - index

		const firstLeaf = selection.scroll.leaf(index)
		let leaf   = firstLeaf[0],
			offset = firstLeaf[1],
			side   = 'left',
			rect   = null
		if (null === leaf) {
			return null
		}

		if (0 < length && offset === leaf.length()) {
			const next = selection.scroll.leaf(index + 1)[0]
			if (next) {
				const line     = selection.scroll.line(index)[0]
				const nextLine = selection.scroll.line(index + 1)[0]
				if (line === nextLine) {
					leaf   = next
					offset = 0
				}
			}
		}

		const position   = leaf.position(offset, true)
		const node       = position[0]
		const nodeOffset = position[1]
		const range      = ownerDoc.createRange()

		if (0 < length) {
			range.setStart(node, nodeOffset)
			const endLeaf = selection.scroll.leaf(index + length)[0]
			if (null === endLeaf) {
				return null
			}
			const endPosition = endLeaf.position(selection.scroll.leaf(index + length)[1], true)
			range.setEnd(endPosition[0], endPosition[1])
			return range.getBoundingClientRect()
		}

		// NOTE: node types are compared instead of using `instanceof`. Quill builds
		// its nodes with the top-level `document`, so they stay instances of the
		// top-level `Text`/`Element` even once they live in the iframe.
		if (Node.TEXT_NODE === node.nodeType) {
			if (!node.data.length) {
				return null
			}

			if (nodeOffset < node.data.length) {
				range.setStart(node, nodeOffset)
				range.setEnd(node, nodeOffset + 1)
			} else {
				range.setStart(node, nodeOffset - 1)
				range.setEnd(node, nodeOffset)
				side = 'right'
			}
			rect = range.getBoundingClientRect()
		} else {
			if (Node.ELEMENT_NODE !== leaf.domNode.nodeType) {
				return null
			}
			rect = leaf.domNode.getBoundingClientRect()
			if (0 < nodeOffset) {
				side = 'right'
			}
		}

		return {
			bottom : rect.top + rect.height,
			height : rect.height,
			left   : rect[side],
			right  : rect[side],
			top    : rect.top,
			width  : 0
		}
	}

	// Quill's own selectionchange listener is bound to the top-level document and
	// never fires for a caret inside the iframe. Mirror it (and the mouse-drag
	// guards) on the owner document so selection-change events keep emitting.
	// `isConnected` keeps a re-created editor's stale listeners from acting on a
	// detached instance (startQuill() may run more than once).
	ownerDoc.addEventListener('selectionchange', () => {
		if (root.isConnected && !selection.mouseDown && !selection.composing) {
			setTimeout(selection.update.bind(selection, 'user'), 1)
		}
	})

	ownerDoc.body?.addEventListener('mousedown', () => {
		if (root.isConnected) {
			selection.mouseDown = true
		}
	})
	ownerDoc.body?.addEventListener('mouseup', () => {
		if (root.isConnected) {
			selection.mouseDown = false
			selection.update('user')
		}
	})
}