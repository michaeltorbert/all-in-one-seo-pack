import { ref, watch, nextTick, createApp, h, onMounted, onBeforeMount } from 'vue'

import {
	useTruSeoHighlighterStore
} from '@/vue/stores'

import { debounce, random } from 'lodash-es'
import { escapeRegex, wordBoundaryPattern } from '@/vue/utils/regex'
import { getAssessmentColor } from '@/vue/plugins/tru-seo/helpers/assessmentColors'

import {
	isBlockEditor as isBlockEditorFunc,
	isClassicEditor as isClassicEditorFunc,
	isPageBuilderEditor
} from '@/vue/utils/context'

import {
	getEditorIframe,
	isIframedEditor
} from '@/vue/utils/editor'

import {
	normalizeWhitespaces,
	getClosestNodeByPropertyValue,
	createHighlightPopoverNode
} from '@/vue/utils/postData/helpers'

import TruSeoHighlightPopover from '@/vue/components/common/tru-seo/HighlightPopover'

import { registerHighlightFormats } from '@/vue/plugins/tru-seo/highlighter/blockFormats'

import {
	buildTinyMceCss,
	suppressTinyMceEvents,
	restoreTinyMceEvents,
	HIGHLIGHT_ACTIVE_CLASS
} from '@/vue/plugins/tru-seo/highlighter/tinymce'

import { buildTextStream } from '@/vue/plugins/tru-seo/highlighter/textStream'

import {
	initTinymceEditor,
	highlightClassicEditor as highlightClassic
} from '@/vue/plugins/tru-seo/highlighter/classicEditor'

import {
	buildBlockFormatCss,
	getFormatClassName,
	getNativeBlockText,
	highlightBlockEditor as highlightBlock
} from '@/vue/plugins/tru-seo/highlighter/blockEditor'

/**
 * Composable that orchestrates TruSeo readability/SEO highlight
 * functionality across Classic Editor (TinyMCE) and Block Editor (Gutenberg).
 *
 * Editor-specific logic is delegated to:
 * - `highlighter/classicEditor.js` for TinyMCE annotation and DOM manipulation.
 * - `highlighter/blockEditor.js` for Gutenberg custom RichText format types.
 *
 * This composable manages the shared lifecycle: style injection, mark
 * creation, hover popover positioning, editor observation, and the reset cycle.
 *
 * @returns {{ watchHighlightSentences: Function }} Watcher callback for highlight data changes.
 */
export const useTruSeoHighlighter = () => {
	const editorObserver    = ref(null)
	const isBlockEditor     = isBlockEditorFunc()
	const isClassicEditor   = isClassicEditorFunc()
	const isIframed         = ref(false)
	const selectBlockEditor = window?.wp?.data?.select('core/block-editor')
	const selectEditPost    = window?.wp?.data?.select('core/edit-post')
	const tinymceEditor              = ref(null)
	const injectedStyleEl            = ref(null)
	const registeredTinyMceAnnotators = new Set()
	// Per-parent text-stream cache: `Map<parentNode, {text, segments}>`.
	// Populated during `formatBlockContent` for the node path and consumed
	// by `annotateTinyMce` to resolve regex offsets to DOM ranges without
	// re-walking text nodes or relying on `outerText` (which inserts
	// synthetic `\n` between block-level children and drifts offsets).
	const streamCache                = new Map()
	let resetInProgress               = false,
		popoverPinned                 = false,
		clickOutsideHandler           = null,
		escapeKeyHandler              = null,
		repositionRafId               = null

	const truSeoHighlighterStore = useTruSeoHighlighterStore()

	const getEditorDocument = () => {
		if (isIframed.value) {
			return getEditorIframe()?.contentDocument || document
		}

		return document
	}

	const getEditorWindow = () => {
		if (isIframed.value) {
			return getEditorIframe()?.contentWindow || window
		}

		return window
	}

	// Flips `isIframed` once the block editor iframe (WP 6.3+) exists and its
	// document is usable. Returns true only on the transition so the caller can
	// react (inject the iframe stylesheet). Called both by the async detection
	// interval and synchronously before every paint in `reset()`.
	const syncIframeState = () => {
		if (isIframed.value) {
			return false
		}

		if (!isIframedEditor() || !getEditorIframe()?.contentDocument?.head) {
			return false
		}

		isIframed.value = true

		return true
	}

	const BLOCK_HIGHLIGHT_PREFIX = 'aioseo-highlight-'

	// Mark click delegation: one mousedown listener per editor document
	// (`Map<Document, handler>`), not one per mark node. Block-editor marks
	// are re-rendered — and their DOM nodes replaced — by Gutenberg on every
	// analyzer toggle or re-analysis, which stranded per-node listeners on
	// detached nodes and made re-rendered marks unclickable.
	const delegatedListenerMap = new Map()
	const popoverPlacement = ref('above')
	const scrollListenerTarget = ref(null)

	const getSourceForAnalyzer = (analyzer) => {
		return `${truSeoHighlighterStore.source}-${analyzer}`
	}

	const isHighlightClass = (className) => {
		if (className.includes(truSeoHighlighterStore.source)) {
			return true
		}

		return className.startsWith(BLOCK_HIGHLIGHT_PREFIX)
	}

	const injectHighlightStyles = () => {
		if (injectedStyleEl.value) {
			injectedStyleEl.value.remove()
			injectedStyleEl.value = null
		}

		// The iframe stylesheet (WP 7.0+ block editor) lives in a separate
		// document and is tracked by id, not a ref. Remove it here so it is
		// rebuilt from the current analyzer set on every call — otherwise an
		// analyzer toggled on after the sheet was first created never gets its
		// color rule and its <mark> falls back to the browser default (yellow).
		const editorDoc     = getEditorDocument()
		const iframeStyleId = 'aioseo-tru-seo-highlight-styles'
		if (editorDoc && editorDoc !== document) {
			editorDoc.getElementById(iframeStyleId)?.remove()
		}

		const analyzers = truSeoHighlighterStore.highlightAnalyzers
		if (!analyzers.length) {
			return
		}

		const rules = analyzers.map(analyzer => {
			const color = getAssessmentColor(analyzer)
			const source = getSourceForAnalyzer(analyzer)
			const className = getFormatClassName(analyzer)

			return [
				buildTinyMceCss(source, color),
				buildBlockFormatCss(className, color)
			].join('\n')
		}).join('\n')

		const style = document.createElement('style')
		style.setAttribute('data-aioseo-highlighter', 'true')
		style.textContent = rules
		document.head.appendChild(style)
		injectedStyleEl.value = style

		// When the editor is inside an iframe (WP 7.0+), marks live in the iframe's
		// document so the main-document stylesheet cannot reach them. Inject the
		// block-format rules into the iframe's head as well.
		if (editorDoc && editorDoc !== document && editorDoc.head) {
			const iframeStyle = editorDoc.createElement('style')
			iframeStyle.id = iframeStyleId
			iframeStyle.textContent = rules
			editorDoc.head.appendChild(iframeStyle)
		}
	}

	// Walks up from `startEl` to the innermost enclosing highlight mark and
	// returns its store entry. Nested marks (e.g. sentenceLength inside
	// paragraphLength) resolve to the innermost — what the cursor is actually
	// over. As a side effect it re-anchors the matched mark to the live clicked
	// element, healing a `mark.node` left stale by a Gutenberg re-render.
	const findMarkFromElement = (startEl, fallbackMark) => {
		let current = startEl
		while (current && 1 === current.nodeType) {
			const uid = current.dataset?.mceAnnotationUid
			if (uid) {
				const match = truSeoHighlighterStore.highlightMarks.find(m => String(m.id) === uid)
				if (match) {
					// Re-anchor to the element actually clicked: a Gutenberg
					// re-render may have replaced the node cached at build time.
					match.node = current

					return match
				}
			}

			if (current.id && current.classList) {
				for (const cls of current.classList) {
					if (isHighlightClass(cls)) {
						const match = truSeoHighlighterStore.highlightMarks.find(m => current.id.endsWith(`-${m.id}`))
						if (match) {
							match.node = current

							return match
						}
						break
					}
				}
			}

			current = current.parentElement
		}

		return fallbackMark
	}

	// Resolves a mark's current on-screen node, re-querying the live editor
	// documents when the cached reference has been detached. Gutenberg replaces
	// a native block's highlight `<mark>` elements on every re-render (analyzer
	// toggle, re-analysis), leaving `mark.node` pointing at a detached node whose
	// `getBoundingClientRect()` is all zeros — which anchored the popover at the
	// top-left instead of the mark.
	const getLiveMarkNode = (mark) => {
		if (!mark) {
			return null
		}

		if (mark.node?.isConnected) {
			return mark.node
		}

		for (const doc of getListenerDocuments()) {
			const live = doc.querySelector(`[data-mce-annotation-uid="${mark.id}"]`) ||
				doc.querySelector(`[id$="-${mark.id}"]`)
			if (live) {
				mark.node = live

				return live
			}
		}

		return mark.node || null
	}

	const attachMarkClickListeners = () => {
		for (const doc of getListenerDocuments()) {
			if (delegatedListenerMap.has(doc)) {
				continue
			}

			// Clicking a mark toggles its popover: open (or switch to) the clicked
			// mark, or close it when it's already the open one. The click still
			// propagates to the editor so caret placement keeps working. The popover
			// anchors to the mark and follows it as the content scrolls.
			//
			// A single delegated listener resolves the mark from the click target at
			// click time, so it keeps working no matter how often Gutenberg replaces
			// the mark's DOM node. `findMarkFromElement` walks up from the target to
			// the innermost enclosing mark, so overlapping (nested) analyzer marks
			// resolve to the one the user is actually pointing at.
			const down = (e) => {
				// Two composable instances (the always-present metabox and the
				// on-demand sidebar) each attach this delegated listener to the same
				// editor document, so both fire for one click. Since hoveredMarkId is
				// shared but popoverPinned is per-instance, the first sets the clicked
				// mark and opens it, and the second then reads that now-matching id,
				// sees its own popoverPinned, and closes it as a re-click. Claim the
				// event so only the first handler to resolve a mark acts on it.
				if (e.aioseoTruseoMarkClickHandled) {
					return
				}

				const target = findMarkFromElement(e.target, null)
				if (!target) {
					return
				}

				e.aioseoTruseoMarkClickHandled = true

				if (popoverPinned && truSeoHighlighterStore.hoveredMarkId === target.id) {
					hidePopover()
					return
				}

				truSeoHighlighterStore.hoveredMarkId = target.id
				popoverPinned = true
				showPopover()
			}

			doc.addEventListener('mousedown', down)
			delegatedListenerMap.set(doc, down)
		}

		attachScrollListener()
	}

	/**
	 * Removes the delegated mark click listeners from every editor document.
	 *
	 * @returns {void}
	 */
	const detachMarkClickListeners = () => {
		for (const [ doc, down ] of delegatedListenerMap) {
			doc.removeEventListener('mousedown', down)
		}
		delegatedListenerMap.clear()

		detachScrollListener()
	}

	/**
	 * Repositions at most once per animation frame while scrolling, so the
	 * open popover stays glued to its mark without thrashing layout.
	 *
	 * @returns {void}
	 */
	const scheduleReposition = () => {
		if (repositionRafId) {
			return
		}

		repositionRafId = requestAnimationFrame(() => {
			repositionRafId = null
			repositionHoverPopover()
		})
	}

	/**
	 * Keeps the open popover aligned with its mark as the editor content
	 * (or the page) scrolls. No-op while the popover is closed.
	 *
	 * @returns {void}
	 */
	const onEditorScroll = () => {
		if (popoverPinned && truSeoHighlighterStore.highlightPopover?.node) {
			scheduleReposition()
		}
	}

	/**
	 * Listens for scroll on the editor's scrollable ancestor (or its window)
	 * and on the main window, so the popover can follow its mark.
	 *
	 * @returns {void}
	 */
	const attachScrollListener = () => {
		if (scrollListenerTarget.value) {
			return
		}

		const scrollable = getEditorNode('navigable')
		const editorWin = getEditorWindow()
		scrollListenerTarget.value = scrollable && !scrollable.isEqualNode(getEditorDocument().documentElement)
			? scrollable
			: editorWin

		scrollListenerTarget.value?.addEventListener('scroll', onEditorScroll, { passive: true })
		window.addEventListener('scroll', onEditorScroll, { passive: true })
	}

	/**
	 * Removes the scroll listeners and cancels any pending reposition frame.
	 *
	 * @returns {void}
	 */
	const detachScrollListener = () => {
		if (repositionRafId) {
			cancelAnimationFrame(repositionRafId)
			repositionRafId = null
		}

		scrollListenerTarget.value?.removeEventListener('scroll', onEditorScroll)
		scrollListenerTarget.value = null
		window.removeEventListener('scroll', onEditorScroll)
	}

	/**
	 * Shows the popover for the currently clicked mark. Mounts the Vue app on
	 * first use, otherwise positions the existing instance and reveals it.
	 *
	 * @returns {void}
	 */
	const showPopover = () => {
		setActiveMark(truSeoHighlighterStore.hoveredMarkId)

		if (truSeoHighlighterStore.highlightPopover?.node) {
			revealPopover()

			return
		}

		mountPopoverApp()
	}

	/**
	 * Positions the already-mounted popover for the active mark while invisible
	 * (avoiding a flash at the previous spot), reveals it, and re-arms the
	 * outside-click / Escape handlers. Used both to open the popover and to
	 * re-reveal it after an advance-to-next-word fix hid it.
	 *
	 * @returns {void}
	 */
	const revealPopover = () => {
		const node = truSeoHighlighterStore.highlightPopover?.node
		if (!node) {
			return
		}

		repositionHoverPopover()
		node.style.visibility = 'visible'
		node.style.pointerEvents = 'auto'

		attachClickOutsideHandler(node)
		attachEscapeKeyHandler()
	}

	/**
	 * Returns the set of documents that should receive global listeners
	 * (click-outside, Escape). Covers the main document, the iframed block
	 * editor's `editor-canvas` document (WP 6.3+), and every active TinyMCE
	 * editor's iframe document — Classic Editor (`content_ifr`) and Classic
	 * blocks inside the Block Editor (`editor-*_ifr`) both render inside
	 * their own iframes, so events there never reach the main document.
	 *
	 * @returns {Document[]} Documents to attach listeners to.
	 */
	const getListenerDocuments = () => {
		const docs = [ document ]

		const editorDoc = getEditorDocument()
		if (editorDoc && editorDoc !== document) {
			docs.push(editorDoc)
		}

		const tinymceEditors = window?.tinymce?.editors
		if (tinymceEditors) {
			for (const editor of tinymceEditors) {
				try {
					const tinyDoc = editor.getDoc()
					if (tinyDoc && !docs.includes(tinyDoc)) {
						docs.push(tinyDoc)
					}
				} catch (_e) {
					// Editor not yet ready or already destroyed.
				}
			}
		}

		return docs
	}

	/**
	 * Toggles the active-mark class so the specific mark whose popover is open
	 * stands out from adjacent same-analyzer marks. Applies to every DOM node
	 * of the mark (marks can split across formatting boundaries) in each editor
	 * document. Pass null to clear.
	 *
	 * @param {(string|number|null)} markId The active mark's id, or null.
	 * @returns {void}
	 */
	const setActiveMark = (markId) => {
		for (const doc of getListenerDocuments()) {
			for (const node of doc.querySelectorAll(`.${HIGHLIGHT_ACTIVE_CLASS}`)) {
				node.classList.remove(HIGHLIGHT_ACTIVE_CLASS)
			}

			if (null === markId || undefined === markId) {
				continue
			}

			for (const node of doc.querySelectorAll('mark, span.annotation-text')) {
				if ((node.id && node.id.endsWith(`-${markId}`)) || node.dataset?.mceAnnotationUid === String(markId)) {
					node.classList.add(HIGHLIGHT_ACTIVE_CLASS)
				}
			}
		}
	}

	/**
	 * Hides the popover without destroying it and clears hovered mark state.
	 * Uses visibility instead of display so the element stays measurable
	 * for positioning before the next show.
	 *
	 * @returns {void}
	 */
	const hidePopover = () => {
		popoverPinned = false
		setActiveMark(null)
		truSeoHighlighterStore.hoveredMarkId = null

		const docs = getListenerDocuments()

		if (clickOutsideHandler) {
			for (const d of docs) {
				d.removeEventListener('mousedown', clickOutsideHandler, true)
			}
			clickOutsideHandler = null
		}

		if (escapeKeyHandler) {
			for (const d of docs) {
				d.removeEventListener('keydown', escapeKeyHandler, true)
			}
			escapeKeyHandler = null
		}

		if (truSeoHighlighterStore.highlightPopover?.node) {
			truSeoHighlighterStore.highlightPopover.node.style.visibility = 'hidden'
			truSeoHighlighterStore.highlightPopover.node.style.pointerEvents = 'none'
		}
	}

	/**
	 * Attaches mousedown listeners on the main document (and the editor
	 * document when iframed) that close the popover when the user clicks
	 * outside it. Clicks on a highlight mark are treated as "inside" —
	 * those pin the popover via the mark's own mousedown listener and
	 * must not trigger a hide here.
	 *
	 * @param {HTMLElement} node The popover root node.
	 * @returns {void}
	 */
	const attachClickOutsideHandler = (node) => {
		const docs = getListenerDocuments()

		if (clickOutsideHandler) {
			for (const d of docs) {
				d.removeEventListener('mousedown', clickOutsideHandler, true)
			}
		}

		clickOutsideHandler = (e) => {
			if (node.contains(e.target)) {
				return
			}

			// nodeType is a numeric value, so it works across realms — `instanceof
			// Element` would fail for click targets dispatched inside iframed
			// editor documents (different realm = different Element constructor).
			let el = (e.target && 1 === e.target.nodeType) ? e.target : null
			while (el) {
				const classList = el.classList
				if (classList) {
					for (const c of classList) {
						if (isHighlightClass(c)) {
							return
						}
					}
				}
				el = el.parentElement
			}

			// Explicit user dismissal — drop any queued advance-to-next-word so it
			// doesn't reopen after the rebuild finishes.
			truSeoHighlighterStore.cancelAdvance()
			hidePopover()
		}

		for (const d of docs) {
			d.addEventListener('mousedown', clickOutsideHandler, true)
		}
	}

	/**
	 * Attaches a keydown listener that closes the popover on Escape. Covers
	 * both the main document and the editor document (when iframed) so the
	 * keypress is observed regardless of focus location.
	 *
	 * @returns {void}
	 */
	const attachEscapeKeyHandler = () => {
		const docs = getListenerDocuments()

		if (escapeKeyHandler) {
			for (const d of docs) {
				d.removeEventListener('keydown', escapeKeyHandler, true)
			}
		}

		escapeKeyHandler = (e) => {
			if ('Escape' === e.key) {
				truSeoHighlighterStore.cancelAdvance()
				hidePopover()
			}
		}

		for (const d of docs) {
			d.addEventListener('keydown', escapeKeyHandler, true)
		}
	}

	/**
	 * Whether the wheel target sits inside a vertically scrollable region of the
	 * popover (e.g. the suggestions list), so native scroll should handle it.
	 *
	 * @param   {HTMLElement} popoverNode The popover container node.
	 * @param   {EventTarget} target      The wheel event target.
	 * @returns {boolean}                 True when a scrollable region is under the cursor.
	 */
	const isOverScrollableRegion = (popoverNode, target) => {
		let el = (target && 1 === target.nodeType) ? target : null
		while (el) {
			const overflowY = window.getComputedStyle(el).overflowY
			if (('auto' === overflowY || 'scroll' === overflowY) && el.scrollHeight > el.clientHeight) {
				return true
			}

			if (el === popoverNode) {
				break
			}
			el = el.parentElement
		}

		return false
	}

	/**
	 * Creates the popover Vue app and mounts it to the DOM.
	 *
	 * @returns {boolean} False if editor wrapper is not found.
	 */
	const mountPopoverApp = () => {
		truSeoHighlighterStore.clearHighlightPopover()
		truSeoHighlighterStore.sanitizeHighlightMarks()

		const app = createApp({
			name : 'TruSeoHighlightPopover',
			render () {
				return h(
					TruSeoHighlightPopover,
					{
						placement : popoverPlacement.value
					}
				)
			}
		})

		const node = createHighlightPopoverNode()
		node.classList.add('aioseo-highlight-popover-root')

		const editorWrapper = getEditorNode('wrapper')
		if (!editorWrapper) {
			return false
		}

		if (isClassicEditor) {
			// Mount outside TinyMCE's `.mce-edit-area` so its DOM churn on
			// caret/selection changes can't remove the popover.
			getClassicPopoverContainer().appendChild(node)
		} else {
			// Append to <body> so the fixed popover escapes the editor canvas's
			// containing block/overflow clip. It stays in the main document, so its
			// scoped styles still apply; `repositionHoverPopover` keeps it clear of
			// the surrounding chrome (admin bar, header, meta boxes).
			document.body.appendChild(node)
		}

		app.mount(node)

		attachClickOutsideHandler(node)
		attachEscapeKeyHandler()

		if (isClassicEditor || isIframed.value) {
			// The popover is mounted in the main document, layered over the editor.
			// Trap wheel events so they scroll the popover's own scrollable region
			// (the suggestions list) rather than the editor/page behind it. When
			// nothing inside the popover can scroll, swallow the event entirely.
			node.addEventListener('wheel', (e) => {
				if (isOverScrollableRegion(node, e.target)) {
					return
				}
				e.preventDefault()
			}, { passive: false })
		}

		truSeoHighlighterStore.highlightPopover.app  = app
		truSeoHighlighterStore.highlightPopover.node = node

		repositionHoverPopover()
	}

	const formatBlockContent = ({ block, node }) => {
		try {
			let content = ''
			if (node) {
				// Build a canonical text stream from the node's text nodes
				// in document order. The returned `text` is exactly what a
				// `SHOW_TEXT` TreeWalker would visit, so regex offsets into
				// `text` map 1:1 to DOM ranges via the cached `segments`.
				// This avoids `outerText`'s synthetic `\n` between block
				// children (e.g. `<li>`) — which previously caused offset
				// drift for matches in later list items.
				const stream = buildTextStream(node)
				streamCache.set(node, stream)
				content = stream.text
			} else if (block) {
				// Shared with the re-anchoring pass so a rebuilt range lands in the
				// same coordinate space the original one was measured in.
				content = getNativeBlockText(block)
			}

			return normalizeWhitespaces(content)
		} catch (_e) {
			return ''
		}
	}

	const getEditorNode = (which) => {
		if ('closest-relative' === which) {
			return getClosestNodeByPropertyValue({
				element  : getEditorNode('wrapper')?.parentElement,
				property : 'position',
				value    : 'relative'
			})
		}

		if ('navigable' === which) {
			return getClosestNodeByPropertyValue({
				element  : getEditorNode('wrapper')?.parentElement,
				property : 'overflow-y',
				value    : 'auto'
			})
		}

		if (isClassicEditor) {
			if ('wrapper' === which) {
				return document.getElementById('content_ifr')
			}

			if ('first-block' === which) {
				return tinymceEditor.value?.getBody()?.firstElementChild || {}
			}
		}

		if (isBlockEditor) {
			if ('wrapper' === which) {
				return getEditorDocument().querySelector('.editor-styles-wrapper .is-root-container')
			}

			if ('first-block' === which) {
				const firstBlock = selectBlockEditor.getBlocks()[0]

				return getEditorDocument().getElementById(`block-${firstBlock?.clientId}`) || {}
			}
		}
	}

	// The Classic popover mounts and positions against this element: the
	// WordPress-owned, position:relative editor container that sits OUTSIDE
	// TinyMCE's `.mce-edit-area`. TinyMCE redraws its own edit area on caret
	// and selection changes, which would tear an in-area popover down; this
	// container is never touched by TinyMCE. Falls back to the closest
	// positioned ancestor if the WordPress wrapper isn't found.
	const getClassicPopoverContainer = () => {
		return getEditorNode('wrapper')?.closest('.wp-editor-container') || getEditorNode('closest-relative')
	}

	const highlightClassicEditor = () => {
		highlightClassic({
			editor               : tinymceEditor.value,
			store                : truSeoHighlighterStore,
			sourcePrefix         : truSeoHighlighterStore.source,
			registeredAnnotators : registeredTinyMceAnnotators,
			setHighlightMarks,
			streamCache
		})

		// `annotateTinyMce` inserts each span synchronously (`surroundContents`),
		// so every mark's node exists the moment the pass above returns — no
		// MutationObserver needed to discover them. Associate each mark with its
		// span and (re)attach the click listeners here. reset() runs this on
		// every re-scan after clearing the old listener map, so re-annotated
		// nodes always get fresh listeners.
		const body = tinymceEditor.value?.getBody()
		if (body) {
			for (const hm of truSeoHighlighterStore.highlightMarks) {
				const span = body.querySelector(`[data-mce-annotation-uid="${hm.id}"]`)
				if (span) {
					hm.node = span
				}
			}
		}

		attachMarkClickListeners()
	}

	const highlightBlockEditor = () => {
		highlightBlock({
			blocks               : selectBlockEditor.getBlocks(),
			store                : truSeoHighlighterStore,
			sourcePrefix         : truSeoHighlighterStore.source,
			registeredAnnotators : registeredTinyMceAnnotators,
			setHighlightMarks,
			observeMarkParent,
			onMarksReady         : attachMarkClickListeners,
			streamCache
		})
	}

	const listenWindowCopy = (event) => {
		const editorWin = getEditorWindow()
		const modifyData = () => {
			event.preventDefault()
			event.clipboardData.setData('text/html', editorWin.getSelection().toString())
		}
		const selection = editorWin.getSelection() || {}
		if (!selection?.rangeCount) {
			return false
		}

		const text = event.clipboardData?.getData('text/html') || ''
		if (text && (text.includes(truSeoHighlighterStore.source) || text.includes(BLOCK_HIGHLIGHT_PREFIX))) {
			modifyData()

			return false
		}

		const range = selection.getRangeAt(0) || {}
		for (const child of Object.values(range?.cloneContents()?.children || [])) {
			if (Object.values(child?.classList || []).some(c => isHighlightClass(c))) {
				modifyData()

				return false
			}
		}
	}

	const listenWindowKeyup = (event) => {
		const modifySelection = ($selection, node) => {
			$selection.collapse(node.firstChild, node.firstChild.length)
			$selection.deleteFromDocument()
		}

		if (-1 === [ 'Delete', 'Backspace' ].indexOf(event.key)) {
			return false
		}

		const selection = getEditorWindow().getSelection() || null
		if (!selection?.toString()) {
			return false
		}

		const parent = selection?.anchorNode?.parentElement || null
		const sibling = selection?.anchorNode?.nextElementSibling || null
		if (Object.values(parent?.classList || []).some(c => isHighlightClass(c))) {
			modifySelection(selection, parent)
		} else if (Object.values(sibling?.classList || []).some(c => isHighlightClass(c))) {
			modifySelection(selection, sibling)
		}
	}

	const observeEditor = () => {
		editorObserver.value = new MutationObserver((list) => {
			if (resetInProgress) {
				return
			}

			let shouldReset = false

			for (const mutation of list) {
				for (const removedNode of (mutation?.removedNodes || [])) {
					// Only reset when a content parent node is removed (user edit),
					// not when our own annotation spans are removed (TinyMCE normalization).
					if (
						truSeoHighlighterStore.highlightMarks.some(hm => removedNode.isEqualNode(hm.parent))
					) {
						shouldReset = true
					}
				}
			}

			if (shouldReset) {
				reset()
			}
		})

		const targetElement = getEditorNode('first-block')?.parentElement
		if ('object' !== typeof targetElement) {
			return false
		}

		editorObserver.value.observe(targetElement, {
			attributes : false,
			childList  : true,
			subtree    : true
		})
	}

	/**
	 * Watches a highlight mark's parent element for DOM mutations.
	 * When annotation spans are added or modified, associates the
	 * resulting DOM node with its highlight mark via `setHighlightMarkNode`,
	 * which attaches the mark's click listener as its node arrives.
	 *
	 * @param {HTMLElement} parent The parent element to observe.
	 * @returns {void}
	 */
	const observeMarkParent = (parent) => {
		const mutationCallback = (list, obs) => {
			obs.disconnect()

			for (const mutation of list) {
				if (mutation?.target?.classList.contains('is-hovered')) {
					break
				}

				if (Object.values(mutation?.target?.classList || []).some(c => isHighlightClass(c))) {
					setHighlightMarkNode(mutation.target)
				}

				// Also walk addedNodes — when a mark is wrapped INSIDE an
				// existing annotation span (nested marks like sentenceLength
				// within paragraphLength), the mutation's target is the outer
				// span and the new inner span is in addedNodes. Without this,
				// the inner mark never gets its `hm.node` set, no hover
				// listener is attached, and hovering it shows the outer mark.
				for (const addedNode of (mutation?.addedNodes || [])) {
					if (Object.values(addedNode?.classList || []).some(c => isHighlightClass(c))) {
						setHighlightMarkNode(addedNode)
					}
				}
			}
		}

		if ('object' !== typeof parent?.parentElement) {
			return false
		}

		const observer = new MutationObserver(mutationCallback)

		observer.observe(parent, {
			attributes : true,
			childList  : true,
			subtree    : true
		})
	}

	// Whether highlighting is currently allowed, from the editor's visibility
	// and mode. Pure read — mirrors the checks that used to run inside the
	// #wpbody-content mutation callback, but evaluated once on demand instead
	// of once per DOM mutation (the per-mutation computed-style walk below was
	// the source of the long-running-handler warnings).
	const evaluateHighlightingAllowed = () => {
		const editorWrapper = getEditorNode('wrapper')
		if (!editorWrapper) {
			return false
		}

		// An ancestor with `display: none` means the editor is hidden.
		const hiddenEditorParent = getClosestNodeByPropertyValue({
			element  : editorWrapper.parentElement,
			property : 'display',
			value    : 'none'
		})
		const editorDocElement = (editorWrapper.ownerDocument || document).documentElement
		if (!hiddenEditorParent?.isEqualNode(editorDocElement)) {
			return false
		}

		if (isBlockEditor) {
			// The user switched to the "Code editor", or is editing the
			// selected block as HTML.
			if (
				'visual' !== selectEditPost.getEditorMode() ||
				'html' === selectBlockEditor.getBlockMode(selectBlockEditor.getSelectedBlock()?.clientId)
			) {
				return false
			}
		}

		if (isClassicEditor) {
			setTinymceEditor()

			// The user switched to the "Text" tab (the raw textarea is visible).
			if (
				'TEXTAREA' === document.getElementById('content')?.nodeName &&
				'none' !== document.getElementById('content').style.display
			) {
				return false
			}
		}

		return true
	}

	// Applies the current allow/disallow state. Guarded so unrelated editor
	// activity (typing, selection) never re-toggles the analyzer store. Suspends
	// on switching away from a paintable editor (e.g. the Code Editor) and resumes
	// — restoring the prior selection — on switching back.
	const syncHighlightingAllowed = () => {
		const allowed = evaluateHighlightingAllowed()
		if (allowed === truSeoHighlighterStore.allowHighlighting) {
			return
		}

		if (allowed) {
			truSeoHighlighterStore.resumeHighlighting()
		} else {
			truSeoHighlighterStore.suspendHighlighting()
		}
	}

	// Enables/disables highlighting when the editor's mode or visibility
	// changes. Replaces a broad #wpbody-content attribute observer — which also
	// woke on the popover's own style mutations — with targeted signals: the
	// Block Editor's data store, and the Classic editor's single
	// `tmce-active`/`html-active` class toggle on #wp-content-wrap.
	const watchEditorMode = () => {
		const sync = debounce(syncHighlightingAllowed, 250)

		if (isBlockEditor && window.wp?.data?.subscribe) {
			truSeoHighlighterStore.editorModeUnsubscribe = window.wp.data.subscribe(sync)
		}

		if (isClassicEditor) {
			const contentWrap = document.getElementById('wp-content-wrap')
			if (contentWrap) {
				truSeoHighlighterStore.wpBodyContentObserver = new MutationObserver(sync)
				truSeoHighlighterStore.wpBodyContentObserver.observe(contentWrap, {
					attributes      : true,
					attributeFilter : [ 'class' ],
					subtree         : false
				})
			}
		}

		syncHighlightingAllowed()
	}

	/**
	 * Visible vertical bounds (main-viewport coords) the fixed popover must stay
	 * within, so it never paints over the WP admin bar / editor header above or
	 * the meta boxes below.
	 *
	 * @returns {{top: number, bottom: number}} Safe top and bottom edges.
	 */
	const getPopoverViewportBounds = () => {
		const viewportBottom = window.innerHeight

		if (isBlockEditor) {
			// The block editor's scroll region already sits below the admin bar and
			// header; its top is the highest the popover may go.
			const content = document.querySelector('.interface-interface-skeleton__content')
			if (content) {
				const contentRect = content.getBoundingClientRect()
				let bottom = contentRect.bottom

				// Meta boxes render below the canvas inside that same scroll region —
				// clamp to their top so the popover can't spill onto them.
				const metaboxes = document.querySelector('.edit-post-layout__metaboxes')
				if (metaboxes) {
					const mbRect = metaboxes.getBoundingClientRect()
					if (0 < mbRect.height && mbRect.top < bottom) {
						bottom = mbRect.top
					}
				}

				return {
					top    : Math.max(0, contentRect.top),
					bottom : Math.min(viewportBottom, bottom)
				}
			}
		}

		// Classic editor / page builders / fallback: at minimum stay clear of the
		// fixed WP admin bar at the top.
		const adminBar = document.getElementById('wpadminbar')
		const adminBarBottom = adminBar ? adminBar.getBoundingClientRect().bottom : 0

		return {
			top    : Math.max(0, adminBarBottom),
			bottom : viewportBottom
		}
	}

	/**
	 * Positions the popover anchored to its mark's current on-screen box, so it
	 * follows the mark as the content scrolls. Prefers below the mark; flips
	 * above when there isn't enough room below. Clamped to the editor's visible
	 * content region and hidden while the mark scrolls out of it.
	 *
	 * @returns {boolean} False if no hovered mark node or popover node.
	 */
	const repositionHoverPopover = () => {
		const markNode = getLiveMarkNode(truSeoHighlighterStore.hoveredMark)
		if (!markNode || !truSeoHighlighterStore.highlightPopover.node) {
			return false
		}

		const markRect = markNode.getBoundingClientRect()
		const popoverNode = truSeoHighlighterStore.highlightPopover.node
		const popoverHeight = popoverNode.offsetHeight || 80
		const popoverWidth = popoverNode.offsetWidth || 320
		const gap = 8

		// The popover is position:fixed in the main document, so anchor it to the
		// mark's main-viewport box. Marks inside an editor iframe (block or classic)
		// need the iframe's own viewport offset added; non-iframed marks are already
		// in main-document viewport coordinates.
		let anchorTop, anchorBottom, anchorCenterX, placement

		if (isIframed.value) {
			const iframeRect = getEditorIframe().getBoundingClientRect()

			anchorTop     = iframeRect.top + markRect.top
			anchorBottom  = iframeRect.top + markRect.bottom
			anchorCenterX = iframeRect.left + markRect.left + (markRect.width / 2)
		} else if (isClassicEditor) {
			// Classic marks are in TinyMCE iframe space; lift them into the main
			// viewport with the editor wrapper's offset.
			const editorNodePos = getEditorNode('wrapper').getBoundingClientRect()

			anchorTop     = editorNodePos.top + markRect.top
			anchorBottom  = editorNodePos.top + markRect.bottom
			anchorCenterX = editorNodePos.left + markRect.left + (markRect.width / 2)
		} else {
			anchorTop     = markRect.top
			anchorBottom  = markRect.bottom
			anchorCenterX = markRect.left + (markRect.width / 2)
		}

		// Constrain the popover to the editor's visible content region so it can't
		// paint over the admin bar/header above or the meta boxes below.
		const bounds = getPopoverViewportBounds()

		// Hide (but keep mounted) while the anchored mark is scrolled out of the
		// safe region — a popover pinned to the edge with no mark in view reads as
		// broken. It reappears when the mark scrolls back in.
		if (anchorBottom <= bounds.top || anchorTop >= bounds.bottom) {
			popoverNode.style.visibility = 'hidden'

			return
		}
		popoverNode.style.visibility = ''

		// Prefer below the mark's last line so we don't cover the text; flip above
		// when there isn't enough room below, then fall back to the roomier side.
		const spaceBelow = bounds.bottom - anchorBottom - gap
		const spaceAbove = anchorTop - bounds.top - gap

		if (spaceBelow >= popoverHeight) {
			placement = 'below'
		} else if (spaceAbove >= popoverHeight) {
			placement = 'above'
		} else {
			placement = spaceBelow >= spaceAbove ? 'below' : 'above'
		}

		popoverPlacement.value = placement
		popoverNode.dataset.popoverPlacement = placement

		const rawTop = 'below' === placement
			? anchorBottom + gap
			: anchorTop - popoverHeight - gap

		// Keep the whole popover inside the safe region.
		const top = Math.max(bounds.top, Math.min(rawTop, bounds.bottom - popoverHeight))

		const left = Math.max(0, Math.min(anchorCenterX - (popoverWidth / 2), window.innerWidth - popoverWidth))

		popoverNode.style.top = top + 'px'
		popoverNode.style.left = left + 'px'
		popoverNode.style.transform = 'translate(0, 0)'
	}

	/**
	 * Main reset cycle: clears all highlights, re-injects styles, and
	 * re-applies highlights for the active editor. For TinyMCE editors,
	 * suppresses events during the entire clear+apply cycle to prevent
	 * WordPress handlers from triggering editor re-initialization.
	 *
	 * Uses `resetInProgress` guard + deferred unlock (nextTick + rAF)
	 * to prevent cascading resets from DOM normalization.
	 *
	 * @returns {void}
	 */
	const reset = () => {
		if (resetInProgress) {
			return
		}

		// TinyMCE boots asynchronously. If an upstream watcher (e.g. the
		// analyzer's `watchHighlightSentences`) fires before the editor
		// ref is populated, bail out *before* claiming `resetInProgress`.
		// The `tinymceEditor` watcher below re-invokes `reset()` once the
		// ref transitions to non-null, so no work is lost. Without this
		// guard, `highlightClassicEditor` would throw on `editor.getBody()`
		// and leave `resetInProgress` stuck — blocking every later reset.
		if (isClassicEditor && !tinymceEditor.value) {
			return
		}

		// A second composable instance (the sidebar app mounts when the panel is
		// first opened) runs its first reset before the async detection interval in
		// `onMounted` has flipped `isIframed`. Resolve it synchronously here so the
		// paint targets the editor iframe — otherwise mark parents resolve against
		// the main document, come back null, and no click listeners attach, leaving
		// the highlights (and their AI-suggestion popover) dead to clicks until reload.
		syncIframeState()

		resetInProgress = true

		const editorWin = getEditorWindow()
		editorWin.removeEventListener('copy', listenWindowCopy)
		editorWin.removeEventListener('keyup', listenWindowKeyup)

		detachMarkClickListeners()
		editorObserver.value?.disconnect()

		nextTick().then(() => {
			const editor = isClassicEditor ? tinymceEditor.value : null
			let originalFire = null

			if (editor) {
				originalFire = suppressTinyMceEvents(editor)
			}

			try {
				truSeoHighlighterStore.clearAll()
				// The cache references DOM nodes whose text content (and even
				// existence) may change between resets. Drop it here so the
				// upcoming `setHighlightMarks` pass rebuilds fresh streams.
				streamCache.clear()

				if (!truSeoHighlighterStore.highlightSentences) {
					// No sentences to render right now (e.g. all analyzers
					// unchecked). Bail out without disabling the master toggle —
					// the user controls that flag exclusively from the UI.
					return
				}

				injectHighlightStyles()

				if (isBlockEditor) {
					highlightBlockEditor()
				}

				if (isClassicEditor) {
					highlightClassicEditor()
				}

				observeEditor()

				const editorWinInner = getEditorWindow()
				editorWinInner.addEventListener('copy', listenWindowCopy)
				editorWinInner.addEventListener('keyup', listenWindowKeyup)
			} catch (error) {
				// Never let an editor exception poison the global lock —
				// that is what produced the silent "highlighter dead for the
				// rest of the session" bug on slow Gutenberg boots. Surfacing
				// the warning gives us breadcrumbs without breaking the user.
				console.warn('[AIOSEO TruSEO highlighter] reset failed:', error)
			} finally {
				if (editor && originalFire) {
					restoreTinyMceEvents(editor, originalFire)
				}

				// Wait for Vue flush + browser paint before allowing the observer to react,
				// preventing async TinyMCE DOM normalization from triggering a cascading reset.
				nextTick().then(() => {
					requestAnimationFrame(() => {
						resetInProgress = false
					})
				})
			}
		})
	}

	/**
	 * Associates a DOM node with its corresponding highlight mark(s) in the store.
	 * Supports both TinyMCE annotation spans (`data-mce-annotation-uid`) and
	 * Block Editor format marks (CSS class + element id).
	 *
	 * @param {HTMLElement} node The DOM node to match against highlight marks.
	 * @returns {void}
	 */
	const setHighlightMarkNode = (node) => {
		const findIndexes = []
		truSeoHighlighterStore.highlightMarks.forEach((hm, i) => {
			const hmId = String(hm.id)

			// For the Classic editor (TinyMCE annotator).
			if (node.hasAttribute('data-mce-annotation-uid') && node.dataset.mceAnnotationUid === hmId) {
				findIndexes.push(i)

				return
			}

			// For the Block editor (custom format type marks). The format mark's
			// element id is suffixed with the mark id (e.g. `aioseo-highlight-12345`).
			const className = getFormatClassName(hm.analyzer)
			if (node.classList.contains(className) && node.id.endsWith(`-${hmId}`)) {
				findIndexes.push(i)
			}
		})

		if (findIndexes.length) {
			findIndexes.forEach(i => { truSeoHighlighterStore.highlightMarks[i].node = node })

			// Reached from the mutation observer (block-editor freeform blocks),
			// where a node can arrive after an earlier attach pass. (Re)attach
			// here as each node is associated so none is left without a listener.
			// (The Classic editor attaches directly in highlightClassicEditor.)
			attachMarkClickListeners()
		}
	}

	/**
	 * Builds highlight mark entries by matching assessment sentences against
	 * the text content of an editor node or block. Uses regex matching
	 * to find character offset ranges, then pushes mark objects to the store.
	 * Recursively processes inner blocks.
	 *
	 * @param {Object}      options       The options object.
	 * @param {Object|null} options.block The Gutenberg block (null for Classic Editor).
	 * @param {HTMLElement|null} options.node The DOM node (null for Block Editor).
	 * @returns {void}
	 */
	const setHighlightMarks = ({ block, node }) => {
		const content = formatBlockContent({ block, node })
		if (content) {
			const existingSentenceKeys = new Set(
				truSeoHighlighterStore.highlightMarks.map(hm => hm.sentenceIndex)
			)

			const allSentences = truSeoHighlighterStore.allHighlightSentences
			for (const [ analyzer, sentences ] of Object.entries(allSentences)) {
				for (const [ index, sentence ] of Object.entries(sentences)) {
					const sentenceKey = `${analyzer}-${index}`
					const isSingleWord = !sentence.includes(' ')
					const pattern = isSingleWord ? wordBoundaryPattern(sentence) : escapeRegex(sentence)
					const regex = new RegExp(pattern, isSingleWord ? 'gu' : 'g')
					let match
					while (null !== (match = regex.exec(content))) {
						if (existingSentenceKeys.has(sentenceKey)) {
							break
						}

						const range = {
							start : match.index,
							end   : (match.index + match[0].length) || 1
						}
						const highlightMarkExists = truSeoHighlighterStore.highlightMarks.find(hm => {
							return node
								? hm.analyzer === analyzer && (hm.range.start === range.start && hm.range.end === range.end) && hm.parent.isSameNode(node)
								: hm.analyzer === analyzer && (hm.range.start === range.start && hm.range.end === range.end) && hm.block.clientId === block.clientId
						})
						if (highlightMarkExists) {
							continue
						}

						truSeoHighlighterStore.highlightMarks.push({
							id            : random(1, 999999999),
							range         : range,
							block         : block,
							parent        : node || getEditorDocument().getElementById(`block-${block.clientId}`),
							active        : 0 === truSeoHighlighterStore.highlightMarks.length,
							sentenceIndex : sentenceKey,
							sentence      : sentence,
							analyzer      : analyzer,
							node          : null
						})

						existingSentenceKeys.add(sentenceKey)
					}
				}
			}
		}

		if (block) {
			for (const innerBlock of (block?.innerBlocks || [])) {
				setHighlightMarks({ block: innerBlock, node: null })
			}
		}
	}

	const setTinymceEditor = () => {
		// `reset()` may have already fired with `tinymceEditor.value` still null
		// (sentence data arriving before TinyMCE finishes loading), in which case
		// `highlightClassicEditor` bailed silently. Re-run reset once the editor
		// is ready so the pending highlights actually land.
		initTinymceEditor(tinymceEditor, () => {
			reset()
		})
	}

	const watchHighlightSentences = (value, oldValue) => {
		const parsedValue = JSON.stringify(value)
		const parsedOldValue = JSON.stringify(oldValue)
		if (parsedValue !== parsedOldValue) {
			reset()
		}
	}

	// Trigger a reset once TinyMCE finishes booting. `initTinymceEditor`
	// polls every 500ms and populates `tinymceEditor` when ready; if the
	// analyzer produced highlights before that, the first `reset()` bailed
	// early (see the early-return in `reset`) and this watcher fires the
	// retry. Vue tears the watcher down with the parent component.
	watch(tinymceEditor, (editor, prevEditor) => {
		if (editor && !prevEditor) {
			reset()
		}
	})

	// Follow the popover's prev/next pager and the advance-after-fix flow: when a
	// sibling/target mark is picked, highlight it, scroll it into view, and
	// (re)open the popover on it. Keyed off the nav counter — not hoveredMarkId —
	// so a plain click-to-open never scrolls.
	watch(() => truSeoHighlighterStore.markNavigationSeq, () => {
		const markNode = getLiveMarkNode(truSeoHighlighterStore.hoveredMark)
		if (!markNode) {
			return
		}

		setActiveMark(truSeoHighlighterStore.hoveredMarkId)

		try {
			markNode.scrollIntoView({ block: 'center', inline: 'nearest' })
		} catch (_e) {
			markNode.scrollIntoView()
		}

		// showPopover mounts the popover when advancing after a fix (the fix's
		// re-analysis tore the previous one down) and otherwise repositions +
		// re-reveals the existing one. Reposition again next frame to catch any
		// smooth-scroll settle or iframe reflow.
		showPopover()
		scheduleReposition()
	})

	// Advance-after-fix: once the re-analysis rebuild repaints the target issue,
	// re-open the popover on it. If it never repaints (e.g. the issue is no longer
	// flagged), nothing happens and the popover simply stays closed.
	watch(() => truSeoHighlighterStore.pendingAdvanceMark, (markId) => {
		if (markId) {
			truSeoHighlighterStore.resolveAdvance(markId)
		}
	})

	// Hide the popover on demand (e.g. right after accepting a fix) so it closes
	// cleanly instead of flickering with emptied content while the rebuild runs.
	watch(() => truSeoHighlighterStore.popoverHideSeq, () => {
		hidePopover()
	})

	onMounted(() => {
		if (!truSeoHighlighterStore.enabled) {
			return
		}

		// Hide the popover the moment content starts changing so it
		// doesn't linger with stale analysis data during the debounce
		// window before the analysis re-runs.
		window.aioseoBus.$on('aioseo-content-changing', hidePopover)

		if (truSeoHighlighterStore.wpBodyContentObserver) {
			truSeoHighlighterStore.wpBodyContentObserver?.disconnect()
		}

		if (truSeoHighlighterStore.editorModeUnsubscribe) {
			truSeoHighlighterStore.editorModeUnsubscribe()
			truSeoHighlighterStore.editorModeUnsubscribe = null
		}

		const interval = window.setInterval(() => {
			if (syncIframeState()) {
				injectHighlightStyles()
			}

			if (null !== getEditorNode('wrapper')) {
				window.clearInterval(interval)

				watchEditorMode()
			}
		}, 1000)
	})

	onBeforeMount(() => {
		truSeoHighlighterStore.initTruSeoHighlighting()

		if (
			isPageBuilderEditor() ||
			(
				!isBlockEditor &&
				!isClassicEditor
			)
		) {
			truSeoHighlighterStore.enabled = false
		}

		if (
			isBlockEditor &&
			(
				!window?.wp?.richText?.registerFormatType ||
				!selectBlockEditor ||
				!selectEditPost
			)
		) {
			truSeoHighlighterStore.enabled = false
		}

		if (isBlockEditor) {
			// Safety net for editor contexts not covered by the eager entry
			// registration; idempotent, so a double-call here is a no-op.
			registerHighlightFormats()
		}
	})

	return {
		watchHighlightSentences
	}
}