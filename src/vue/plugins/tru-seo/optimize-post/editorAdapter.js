import { wordBoundaryPattern } from '@/vue/utils/regex'

import { isBlockEditor } from '@/vue/utils/context'
import { replaceAllInBlockEditor } from '@/vue/plugins/tru-seo/highlighter/spellingReplace'
import { getRichTextIdentifier } from '@/vue/plugins/tru-seo/highlighter/blockEditor'

// Optimize Post rewrites the post body block-by-block, which needs the block
// editor's structured blocks (each block has a stable clientId we map results
// back to). Classic and page-builder editors are not supported.
export function isOptimizeSupported () {
	return isBlockEditor()
}

// Block types we send to the optimizer, mapped to the payload's type. Everything
// else (media, embeds, shortcodes, etc.) is skipped.
const OPTIMIZABLE_BLOCKS = {
	'core/paragraph' : 'paragraph',
	'core/heading'   : 'heading'
}

function toPlainText (html) {
	const div = document.createElement('div')
	div.innerHTML = String(html || '')

	return (div.textContent || '').trim()
}

// The post body as an ordered list of text blocks ({ id, type, level, text }),
// keyed by each block's clientId so the optimizer's per-block result maps back
// precisely. Recurses into nested blocks (groups, columns) since replaceBlock
// resolves any clientId regardless of depth.
export function getPostContentBlocks () {
	if (!isBlockEditor()) {
		return []
	}

	const blocks = window.wp?.data?.select('core/block-editor')?.getBlocks?.() || []
	const out    = []

	const walk = (list) => {
		for (const block of list) {
			const type = OPTIMIZABLE_BLOCKS[block.name]
			if (type) {
				const text = toPlainText(block.attributes?.content)
				if (text) {
					out.push({
						id    : block.clientId,
						type,
						level : 'heading' === type ? (block.attributes?.level || 2) : 0,
						text
					})
				}
			}

			if (block.innerBlocks?.length) {
				walk(block.innerBlocks)
			}
		}
	}

	walk(blocks)

	return out
}

// Applies the optimizer's per-block results back into the editor, replacing each
// block (by clientId) with the returned block(s): an in-place edit (one block), a
// paragraph split (several), or a heading insertion (heading first, then paragraphs).
// Returns the number of source blocks actually replaced.
export function applyOptimizedBlocks (results) {
	if (!isBlockEditor() || !Array.isArray(results) || !results.length) {
		return 0
	}

	const createBlock = window.wp?.blocks?.createBlock
	const editor      = window.wp?.data?.dispatch?.('core/block-editor')
	const select      = window.wp?.data?.select?.('core/block-editor')
	if (!createBlock || !editor?.replaceBlock || !select?.getBlock) {
		return 0
	}

	let replaced = 0
	for (const result of results) {
		if (!result?.id || !Array.isArray(result.blocks) || !result.blocks.length) {
			continue
		}

		// The block may have been removed while the request was in flight.
		if (!select.getBlock(result.id)) {
			continue
		}

		const newBlocks = result.blocks.map(block =>
			'heading' === block.type
				? createBlock('core/heading', { level: block.level || 2, content: block.text })
				: createBlock('core/paragraph', { content: block.text })
		)

		editor.replaceBlock(result.id, newBlocks)
		replaced++
	}

	return replaced
}

// Max chars of surrounding context sent per word. Matches the proxy's cap, so
// anything longer is trimmed server-side anyway.
const SPELLING_CONTEXT_MAX_CHARS = 1000

// Rich-text plain text of a block, matching what replaceAllInBlockEditor sees
// (same identifier + HTML → text path), so a word found here is a word we can
// actually correct. Empty for blocks without a rich-text attribute.
function getBlockRichText (block) {
	const attributeId = getRichTextIdentifier(block)
	const content     = block?.attributes?.[attributeId]
	if (!content) {
		return ''
	}

	const html = ('object' === typeof content && 'function' === typeof content.toHTMLString)
		? content.toHTMLString()
		: String(content)

	const create = window.wp?.richText?.create
	if (create) {
		return create({ html }).text
	}

	return toPlainText(html)
}

// The sentence around the first whole-word occurrence of `word` in `text`,
// bounded to SPELLING_CONTEXT_MAX_CHARS. Returns null when the word isn't found.
function findWordContext (text, word) {
	const match = new RegExp(wordBoundaryPattern(word), 'u').exec(text)
	if (!match) {
		return null
	}

	const index = match.index

	let start = 0,
	 end = text.length

	for (let i = index - 1; 0 <= i; i--) {
		if (/[.!?\n]/.test(text[i])) {
			start = i + 1
			break
		}
	}

	for (let i = index + word.length; i < text.length; i++) {
		if (/[.!?\n]/.test(text[i])) {
			end = i + 1
			break
		}
	}

	const sentence = text.slice(start, end).trim()
	if (sentence.length <= SPELLING_CONTEXT_MAX_CHARS) {
		return sentence || word
	}

	const rel  = index - start
	const from = Math.max(0, rel - Math.floor(SPELLING_CONTEXT_MAX_CHARS / 2))

	return sentence.slice(from, from + SPELLING_CONTEXT_MAX_CHARS) || word
}

// Restricts a set of flagged words to those living in a rich-text block we can
// correct, and attaches each word's surrounding sentence as `context`. Walks the
// whole block tree (paragraphs, headings, list items, quotes, captions, any
// block exposing a rich-text attribute), recursing nested blocks. Words present
// only in blocks we can't rewrite (tables, embeds, raw HTML, ...) are dropped so
// they're never sent to the AI. Returns [{ word, context }] preserving input order.
export function gatherSpellingTargets (words) {
	if (!isBlockEditor() || !Array.isArray(words) || !words.length) {
		return []
	}

	const cleaned = [ ...new Set(words.map(w => (w || '').trim()).filter(Boolean)) ]
	if (!cleaned.length) {
		return []
	}

	const blocks  = window.wp?.data?.select('core/block-editor')?.getBlocks?.() || []
	const context = new Map()

	const walk = (list) => {
		for (const block of list) {
			const text = getBlockRichText(block)
			if (text) {
				for (const word of cleaned) {
					if (context.has(word)) {
						continue
					}

					const found = findWordContext(text, word)
					if (null !== found) {
						context.set(word, found)
					}
				}
			}

			if (block.innerBlocks?.length) {
				walk(block.innerBlocks)
			}
		}
	}

	walk(blocks)

	return cleaned
		.filter(word => context.has(word))
		.map(word => ({ word, context: context.get(word) }))
}

// Applies spelling corrections to the post body by whole-word replacement. Walks
// the full block tree (every rich-text block type the spelling assessment covers,
// recursing nested blocks) and replaces every occurrence of each misspelled word
// with its correction via replaceAllInBlockEditor — which safely no-ops on blocks
// that don't expose the word. Marks-independent by design: it reads the block
// content directly, so corrections apply with highlighting toggled off. Returns
// the number of distinct words that were corrected in at least one block.
export function applySpellingCorrections (corrections) {
	if (!isBlockEditor() || !Array.isArray(corrections) || !corrections.length) {
		return 0
	}

	const pairs = corrections
		.map(c => ({ word: (c?.word || '').trim(), correction: (c?.correction || '').trim() }))
		.filter(c => c.word && c.correction)
	if (!pairs.length) {
		return 0
	}

	const blocks = window.wp?.data?.select('core/block-editor')?.getBlocks?.() || []
	const fixedWords = new Set()

	const walk = (list) => {
		for (const block of list) {
			for (const { word, correction } of pairs) {
				if (replaceAllInBlockEditor(block.clientId, word, correction)) {
					fixedWords.add(word)
				}
			}

			if (block.innerBlocks?.length) {
				walk(block.innerBlocks)
			}
		}
	}

	walk(blocks)

	return fixedWords.size
}