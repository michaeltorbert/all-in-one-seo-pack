import { wordBoundaryPattern } from '@/vue/utils/regex'
import { getRichTextIdentifier } from './blockEditor'
import { requestPostUpdate } from '@/vue/plugins/tru-seo/spellingSuggestions'
import { normalizeWhitespaces } from '@/vue/utils/postData/helpers'

/**
 * Finds the character offset of the mark's node within its closest
 * contenteditable container, in the same coordinate space wp.richText uses.
 *
 * @since 5.0.0
 *
 * @param {HTMLElement} container The contenteditable container element.
 * @param {Node}        markNode  The highlighted mark DOM node.
 * @returns {number} The character offset, or -1 if not found.
 */
function getCharacterOffset (container, markNode) {
	// In the iframed block editor (WP 6.3+), `container` lives in the iframe's
	// document. Use its owner document so the walker traverses the iframe tree
	// — `document.createTreeWalker(foreignNode)` is not portable across realms.
	const doc = container.ownerDocument || document
	// Visit elements as well as text: wp.richText models each `<br>` as one "\n"
	// in the text the mark range is measured against, so a text-only walk skips
	// every `<br>` and drifts the offset by one per line break — silently
	// misaligning the replacement for any sentence after a `<br>`.
	const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
	let offset = 0,
	 node

	while (null !== (node = walker.nextNode())) {
		if (markNode === node || markNode.contains(node)) {
			return offset
		}

		if (Node.TEXT_NODE === node.nodeType) {
			offset += node.textContent.length
		} else if ('BR' === node.tagName) {
			offset += 1
		}
	}

	return -1
}

/**
 * Replaces a misspelled word with a suggestion in the Block Editor.
 *
 * Uses the wp.richText API to perform a position-aware replacement,
 * ensuring only the specific word the user hovered is replaced even
 * when the same misspelled word appears multiple times in a block.
 *
 * @since 5.0.0
 *
 * @param {Object} mark        The highlight mark object from the store.
 * @param {string} replacement The replacement word.
 * @returns {boolean}          Whether the replacement was successful.
 */
export function replaceInBlockEditor (mark, replacement) {
	if (!mark?.block?.clientId || !window?.wp?.data || !window?.wp?.richText) {
		return false
	}

	const { select, dispatch } = window.wp.data
	const block = select('core/block-editor').getBlock(mark.block.clientId)
	if (!block) {
		return false
	}

	const attributeId = getRichTextIdentifier(block)
	const content = block.attributes[attributeId]
	if (!content) {
		return false
	}

	const isRichTextData = 'object' === typeof content && 'function' === typeof content.toHTMLString
	const html = isRichTextData ? content.toHTMLString() : String(content)

	const word = mark.sentence
	const markNode = mark.node
	if (!markNode) {
		return false
	}

	const container = (markNode.nodeType === Node.TEXT_NODE ? markNode.parentElement : markNode)
		?.closest('[contenteditable="true"]')
	if (!container) {
		return false
	}

	const charOffset = getCharacterOffset(container, markNode)
	if (-1 === charOffset) {
		return false
	}

	const { create, insert, toHTMLString } = window.wp.richText
	const richTextValue = create({ html })

	// `word` (mark.sentence) went through normalizeWhitespaces, which folds `&nbsp;`
	// / U+00A0 down to a plain space; the raw rich-text projection keeps the U+00A0.
	// Both are one code unit so the offsets still line up — compare normalized so a
	// sentence containing a non-breaking space isn't rejected here (which silently
	// dropped the replacement for any flagged sentence with special-character spacing).
	const candidate = richTextValue.text.substring(charOffset, charOffset + word.length)
	if (normalizeWhitespaces(candidate) !== normalizeWhitespaces(word)) {
		return false
	}

	const newValue = insert(
		richTextValue,
		create({ text: replacement }),
		charOffset,
		charOffset + word.length
	)
	const newHtml = toHTMLString({ value: newValue })

	const RichTextData = window.wp?.richText?.RichTextData
	const newContent = (isRichTextData && RichTextData)
		? RichTextData.fromHTMLString(newHtml)
		: newHtml

	dispatch('core/block-editor').updateBlockAttributes(mark.block.clientId, {
		[attributeId] : newContent
	})

	return true
}

/**
 * Replaces a misspelled word with a suggestion in the Classic Editor (TinyMCE).
 *
 * Swaps the annotation span for a fresh text node, merges adjacent text
 * nodes via `normalize()` so the editor doesn't end up with fragmented
 * siblings (which can confuse TinyMCE's serializer on form submit), marks
 * the editor dirty, and registers a single undo step.
 *
 * @since 5.0.0
 *
 * @param {Object} mark        The highlight mark object from the store.
 * @param {string} replacement The replacement word.
 * @returns {boolean}          Whether the replacement was successful.
 */
export function replaceInClassicEditor (mark, replacement) {
	const editor = window.tinymce?.get('content')
	if (!editor || !mark?.node?.parentNode) {
		return false
	}

	const markNode = mark.node
	const parent   = markNode.parentNode
	const doc      = markNode.ownerDocument || editor.getDoc()
	const textNode = doc.createTextNode(replacement)

	parent.replaceChild(textNode, markNode)
	parent.normalize()

	editor.undoManager.add()
	editor.setDirty(true)

	// Programmatic DOM edits don't fire the keyup/paste events that drive the
	// Classic editor's re-analysis (see `watchClassicEditor`), so trigger it
	// explicitly. Without this, the highlights cleared right after applying a
	// suggestion never come back even though the content still has issues.
	// Routed through the worker-free bridge (registered by `components/helpers`)
	// so this module doesn't statically pull the TruSEO worker into addon bundles.
	requestPostUpdate(500)

	return true
}

/**
 * Detects if the current editor is the Block Editor.
 *
 * @since 5.0.0
 *
 * @returns {boolean} True if the Block Editor is active.
 */
export function isBlockEditor () {
	return !!document.querySelector('.block-editor')
}

/**
 * Replaces a misspelled word with a suggestion in the active editor.
 *
 * @since 5.0.0
 *
 * @param {Object} mark        The highlight mark object.
 * @param {string} replacement The replacement word.
 * @returns {boolean}          Whether the replacement was successful.
 */
export function replaceWord (mark, replacement) {
	if (isBlockEditor()) {
		return replaceInBlockEditor(mark, replacement)
	}

	return replaceInClassicEditor(mark, replacement)
}

/**
 * Replaces the flagged text (sentence/anchor) with new text in the active editor.
 *
 * Works for any scope where the replacement stays inside the same block (single
 * sentence, new anchor text). Uses the same position-aware rich-text replacement
 * as `replaceWord`, just with a longer source range.
 *
 * @since 5.0.0
 *
 * @param {Object} mark    The highlight mark object.
 * @param {string} newText The replacement text.
 * @returns {boolean}      Whether the replacement was successful.
 */
export function replaceText (mark, newText) {
	return replaceWord(mark, newText)
}

/**
 * Parses a remote suggestion string into a list of structural parts suitable
 * for building block editor blocks.
 *
 * Lines starting with `## ` become H2 heading parts. Lines starting with
 * `### ` become H3 heading parts. Text separated by blank lines becomes
 * separate paragraph parts.
 *
 * @since 5.0.0
 *
 * @param {string} text The replacement text from the AI Generator.
 * @returns {Array} An array of part objects, each with a `type`, optional `level`, and `content`.
 */
function parseStructuredReplacement (text) {
	const parts = []
	const chunks = String(text).split(/\n{2,}/).map(c => c.trim()).filter(Boolean)

	for (const chunk of chunks) {
		if (chunk.startsWith('### ')) {
			parts.push({ type: 'heading', level: 3, content: chunk.slice(4).trim() })
			continue
		}

		if (chunk.startsWith('## ')) {
			parts.push({ type: 'heading', level: 2, content: chunk.slice(3).trim() })
			continue
		}

		parts.push({ type: 'paragraph', content: chunk })
	}

	return parts
}

/**
 * Replaces the block containing the mark with multiple paragraph/heading blocks
 * built from a structured AI replacement. Used by paragraph and section scope.
 *
 * Falls back to in-place text replacement for Classic Editor (TinyMCE).
 *
 * @since 5.0.0
 *
 * @param {Object} mark    The highlight mark object.
 * @param {string} newText The replacement text (may contain `\n\n` and `## `/`### ` markers).
 * @returns {boolean}      Whether the replacement was successful.
 */
export function replaceBlockText (mark, newText) {
	if (isBlockEditor()) {
		if (!mark?.block?.clientId || !window?.wp?.data || !window?.wp?.blocks) {
			return false
		}

		const parts = parseStructuredReplacement(newText)
		if (!parts.length) {
			return false
		}

		const { createBlock } = window.wp.blocks
		const newBlocks = parts.map(part => {
			if ('heading' === part.type) {
				return createBlock('core/heading', { level: part.level, content: part.content })
			}

			return createBlock('core/paragraph', { content: part.content })
		})

		window.wp.data.dispatch('core/block-editor').replaceBlocks(mark.block.clientId, newBlocks)

		return true
	}

	// Classic Editor: fall back to plain-text replacement with literal paragraph breaks.
	const flattened = String(newText)
		.replace(/^#{2,3} /gm, '')
		.replace(/\n{2,}/g, '\n\n')

	return replaceInClassicEditor(mark, flattened)
}

/**
 * Applies the case pattern of the replaced text to its replacement.
 *
 * Dictionary suggestions come back lowercase, so accepting one for "Recieve" at the start of a
 * sentence would fix the spelling and introduce a capitalisation error in its place. Matched per
 * occurrence, so the same word capitalised in one sentence and lowercase in another each keep their
 * own form.
 *
 * NOTE: Scripts without letter case (the spell checker supports many) compare equal upper and lower,
 * so they fall through and keep the suggestion exactly as the dictionary supplied it.
 *
 * @since 5.0.1
 *
 * @param {string} original    The text being replaced.
 * @param {string} replacement The replacement word.
 * @returns {string}           The replacement, cased like the original.
 */
export function matchCase (original, replacement) {
	if (!original || !replacement) {
		return replacement
	}

	// Require more than one letter so a lone "I" isn't read as an all-caps word.
	const isAllCaps = 1 < original.length &&
		original === original.toUpperCase() &&
		original !== original.toLowerCase()

	if (isAllCaps) {
		return replacement.toUpperCase()
	}

	const first = original.charAt(0)
	if (first === first.toUpperCase() && first !== first.toLowerCase()) {
		return replacement.charAt(0).toUpperCase() + replacement.slice(1)
	}

	return replacement
}

/**
 * Replaces every whole-word occurrence of `word` with `replacement`
 * inside a single Gutenberg block.
 *
 * Reads the block content fresh, finds matches via the rich-text plain
 * text representation, then applies replacements from the end so earlier
 * offsets stay valid for the same update.
 *
 * @since   5.0.0
 * @version 5.0.1 Preserves each occurrence's capitalisation.
 *
 * @param {string} clientId    The Gutenberg block client ID.
 * @param {string} word        The misspelled word to replace.
 * @param {string} replacement The replacement word.
 * @returns {boolean}          Whether the replacement was successful.
 */
export function replaceAllInBlockEditor (clientId, word, replacement) {
	if (!clientId || !window?.wp?.data || !window?.wp?.richText) {
		return false
	}

	const { select, dispatch } = window.wp.data
	const block = select('core/block-editor').getBlock(clientId)
	if (!block) {
		return false
	}

	const attributeId = getRichTextIdentifier(block)
	const content = block.attributes[attributeId]
	if (!content) {
		return false
	}

	const isRichTextData = 'object' === typeof content && 'function' === typeof content.toHTMLString
	const html = isRichTextData ? content.toHTMLString() : String(content)

	const { create, insert, toHTMLString } = window.wp.richText
	const wordRegex = new RegExp(wordBoundaryPattern(word), 'gu')
	const positions = []
	let richTextValue = create({ html }),
	 match

	while (null !== (match = wordRegex.exec(richTextValue.text))) {
		positions.push({ start: match.index, end: match.index + match[0].length, matched: match[0] })
	}

	if (!positions.length) {
		return false
	}

	for (let i = positions.length - 1; 0 <= i; i--) {
		richTextValue = insert(
			richTextValue,
			create({ text: matchCase(positions[i].matched, replacement) }),
			positions[i].start,
			positions[i].end
		)
	}

	const newHtml = toHTMLString({ value: richTextValue })

	const RichTextData = window.wp?.richText?.RichTextData
	const newContent = (isRichTextData && RichTextData)
		? RichTextData.fromHTMLString(newHtml)
		: newHtml

	dispatch('core/block-editor').updateBlockAttributes(clientId, {
		[attributeId] : newContent
	})

	return true
}

/**
 * Replaces every whole-word occurrence of a word in a term's description textarea.
 *
 * @since 5.0.1
 *
 * @param {HTMLTextAreaElement} textarea          The term description textarea.
 * @param {string}              word              The word to replace.
 * @param {string}              replacement       The replacement word.
 * @param {boolean}             triggerReanalysis Re-run analysis after editing.
 * @returns {boolean}                             Whether any occurrence was replaced.
 */
export function replaceAllWordInTermDescription (textarea, word, replacement, triggerReanalysis = true) {
	const wordRegex = new RegExp(wordBoundaryPattern(word), 'gu')
	const original  = textarea.value || ''

	wordRegex.lastIndex = 0
	if (!wordRegex.test(original)) {
		return false
	}

	// Preserve the caret so applying a fix doesn't jump the cursor to the end for anyone
	// mid-sentence in the description.
	const selectionStart = textarea.selectionStart
	const selectionEnd   = textarea.selectionEnd

	wordRegex.lastIndex = 0
	// Function replacer so `$` sequences in the replacement aren't treated as special patterns.
	textarea.value = original.replace(wordRegex, match => matchCase(match, replacement))

	const maxCaret = textarea.value.length
	textarea.setSelectionRange(Math.min(selectionStart, maxCaret), Math.min(selectionEnd, maxCaret))

	// The term description is a plain textarea, so nothing observes programmatic writes —
	// dispatch input so WordPress and our own listeners see the change.
	textarea.dispatchEvent(new Event('input', { bubbles: true }))

	if (triggerReanalysis) {
		requestPostUpdate(500)
	}

	return true
}

/**
 * Replaces every whole-word occurrence of a misspelled word in the Classic editor.
 *
 * @since 5.0.0
 *
 * @param {string}  word              The misspelled word to replace.
 * @param {string}  replacement       The replacement word.
 * @param {boolean} triggerReanalysis Re-run analysis after editing.
 * @returns {boolean}                 Whether any occurrence was replaced.
 */
export function replaceAllWordInClassicEditor (word, replacement, triggerReanalysis = true) {
	const editor = window.tinymce?.get('content')
	const body   = editor?.getBody?.()
	if (!editor || !body) {
		return false
	}

	const doc       = editor.getDoc?.() || body.ownerDocument || document
	const wordRegex = new RegExp(wordBoundaryPattern(word), 'gu')
	const walker    = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT)
	const targets   = []
	let node

	while (null !== (node = walker.nextNode())) {
		wordRegex.lastIndex = 0
		if (wordRegex.test(node.nodeValue || '')) {
			targets.push(node)
		}
	}

	if (!targets.length) {
		return false
	}

	for (const textNode of targets) {
		wordRegex.lastIndex = 0
		// Function replacer so `$` sequences in the replacement (e.g. "$&") aren't
		// treated as special patterns by String.prototype.replace.
		textNode.nodeValue = textNode.nodeValue.replace(wordRegex, match => matchCase(match, replacement))
	}

	// Merge annotation-split siblings so TinyMCE's serializer stays clean, then
	// re-run analysis — programmatic edits don't fire the keyup/paste that drives it.
	body.normalize()
	editor.undoManager.add()
	editor.setDirty(true)
	if (triggerReanalysis) {
		requestPostUpdate(500)
	}

	return true
}

/**
 * Replaces every whole-word occurrence of a misspelled word across the whole
 * document, without needing any painted highlight marks.
 *
 * The Spelling tab's word list is built from the assessment, not the editor's
 * highlight marks, so its fix action must work even when spelling highlighting
 * is toggled off (no marks exist). Block editor: walks every block and reuses the
 * position-aware {@see replaceAllInBlockEditor} (a no-op on blocks without the
 * word). Classic editor: rewrites matching text nodes in the TinyMCE body.
 *
 * @since 5.0.0
 *
 * @param {string}  word              The misspelled word to replace.
 * @param {string}  replacement       The replacement word.
 * @param {boolean} triggerReanalysis Re-run analysis after editing. Pass false when the caller re-analyzes itself.
 * @returns {boolean}                 Whether any occurrence was replaced.
 */
export function replaceWordInContent (word, replacement, triggerReanalysis = true) {
	if (!word || !replacement) {
		return false
	}

	// A term has no editor — its description textarea is the analysed content.
	const termDescription = document.querySelector('#edittag textarea#description')
	if (termDescription) {
		return replaceAllWordInTermDescription(termDescription, word, replacement, triggerReanalysis)
	}

	if (!isBlockEditor()) {
		return replaceAllWordInClassicEditor(word, replacement, triggerReanalysis)
	}

	const blocks = window.wp?.data?.select?.('core/block-editor')?.getBlocks?.() || []
	if (!blocks.length) {
		return false
	}

	let replaced = false
	const walk = (list) => {
		for (const block of list) {
			if (replaceAllInBlockEditor(block.clientId, word, replacement)) {
				replaced = true
			}

			if (block.innerBlocks?.length) {
				walk(block.innerBlocks)
			}
		}
	}
	walk(blocks)

	return replaced
}