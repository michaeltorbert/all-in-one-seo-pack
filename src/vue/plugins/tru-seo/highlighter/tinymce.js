import { darken, getAssessmentColor, hexToRgba } from '@/vue/plugins/tru-seo/helpers/assessmentColors'
import { buildTextStream, rangeFromStream } from './textStream'

/**
 * Class applied to the mark(s) whose popover is currently open.
 */
export const HIGHLIGHT_ACTIVE_CLASS = 'aioseo-highlight-active'

/**
 * Style-agnostic CSS properties shared by highlight marks in both editors.
 * The visual treatment (underline vs. background) is added by
 * buildHighlightStateCss based on the highlighter-style setting.
 */
export const HIGHLIGHT_CSS_PROPERTIES = `
		display: inline !important;
		font-size: inherit !important;
		font-weight: inherit !important;
		letter-spacing: inherit !important;
		line-height: inherit !important;
		position: static !important;`

// Site-wide highlight style, read at paint time (default 'underline').
const getHighlightStyle = () => window.aioseo?.options?.advanced?.highlighterStyle || 'underline'

/**
 * Builds the base, hover, and active-state rules for a highlight selector.
 * Renders either a saturated underline (default) or a translucent background
 * fill, per the highlighter-style setting. Hover and active progressively
 * strengthen the treatment so adjacent same-analyzer marks stay
 * distinguishable and the open-popover mark stands out.
 *
 * NOTE: every declaration is forced. Theme editor styles reach the block editor
 * as `.editor-styles-wrapper mark`, which ties `mark.<class>` on specificity and
 * is resolved by source order inside an iframe `<head>` React owns — so order is
 * not ours to win. Forcing is safe because the selectors are namespaced to our
 * own classes, but it must be uniform: an `!important` base rule with a normal
 * hover/active rule would leave the states unable to override it.
 *
 * @param {string} selector The CSS selector targeting the mark element.
 * @param {string} color    The analyzer's assessment color (hex).
 * @returns {string} CSS rule string.
 */
export const buildHighlightStateCss = (selector, color) => {
	if ('background' === getHighlightStyle()) {
		return `
		${selector} {
			${HIGHLIGHT_CSS_PROPERTIES}
			color: #334155 !important;
			background-color: ${hexToRgba(color, 0.3)} !important;
			border-radius: 2px !important;
			box-decoration-break: clone !important;
			-webkit-box-decoration-break: clone !important;
		}
		${selector}:hover {
			background-color: ${hexToRgba(color, 0.45)} !important;
		}
		${selector}.${HIGHLIGHT_ACTIVE_CLASS} {
			background-color: ${hexToRgba(color, 0.55)} !important;
			box-shadow: 0 0 0 1px ${color} !important;
		}
		`
	}

	return `
		${selector} {
			${HIGHLIGHT_CSS_PROPERTIES}
			color: inherit !important;
			background-color: transparent !important;
			text-decoration: underline !important;
			text-decoration-color: ${color} !important;
			text-decoration-thickness: 2px !important;
			text-underline-offset: 3px !important;
		}
		${selector}:hover {
			text-decoration-thickness: 3px !important;
			text-decoration-color: ${darken(color, 0.15)} !important;
		}
		${selector}.${HIGHLIGHT_ACTIVE_CLASS} {
			text-decoration-thickness: 3px !important;
			text-decoration-color: ${darken(color, 0.3)} !important;
			background-color: ${hexToRgba(color, 0.12)} !important;
		}
		`
}

/**
 * Builds a CSS rule for TinyMCE annotation spans.
 *
 * @param {string} source  The annotation source identifier.
 * @param {string} color   The highlight background color (hex).
 * @returns {string} CSS rule string.
 */
export const buildTinyMceCss = (source, color) => {
	return buildHighlightStateCss(`span.annotation-text.annotation-text-${source}`, color)
}

/**
 * Converts character offsets within a DOM element to a browser Range object.
 *
 * Rebuilds a fresh text stream from the live DOM and resolves the offsets
 * through it, so the range stays aligned with the same emoji-aware character
 * space `buildTextStream` produces (an emoji `<img>` counts as its `alt`).
 * Used as the fallback when the cached stream has gone stale.
 *
 * @param {HTMLElement} parent      The parent element containing the text.
 * @param {number}      startOffset Character offset for the range start.
 * @param {number}      endOffset   Character offset for the range end.
 * @returns {Range} A DOM Range spanning the specified character offsets.
 */
export const createRangeFromCharOffsets = (parent, startOffset, endOffset) => {
	const { segments } = buildTextStream(parent)

	return rangeFromStream(parent.ownerDocument, segments, startOffset, endOffset)
}

/**
 * Wraps text in a TinyMCE editor at the given highlight mark range using
 * direct DOM manipulation (Range API). This bypasses TinyMCE's Selection
 * and Annotator APIs to prevent internal state corruption and event
 * cascades that can trigger editor re-initialization.
 *
 * When `segments` are provided (from `buildTextStream`), the range is
 * resolved via O(log n) binary search over the cached map — keeping the
 * regex-matched offsets in lockstep with the DOM, with no `outerText`
 * layout reflow. Without segments, falls back to the legacy text-node
 * walker for backwards compatibility.
 *
 * @param {Object}     highlightMark The highlight mark with range, parent, analyzer, and id.
 * @param {Object}     editor        The TinyMCE editor instance.
 * @param {string}     sourcePrefix  The annotation source prefix (e.g. 'aioseo-tru-seo-highlighter').
 * @param {Array|null} [segments]    Optional cached text-stream segments for `highlightMark.parent`.
 * @returns {void}
 */
export const annotateTinyMce = (highlightMark, editor, sourcePrefix, segments = null) => {
	if (!editor) {
		return false
	}

	const source = `${sourcePrefix}-${highlightMark.analyzer}`
	const doc = editor.getDoc()

	let range = segments
		? rangeFromStream(doc, segments, highlightMark.range.start, highlightMark.range.end)
		: null

	// Stream segments go stale when an earlier `surroundContents` in the
	// same parent splits or empties one of the cached text nodes (common
	// with overlapping marks across analyzers). When that happens the
	// stream-resolved range comes back collapsed even though the source
	// offsets are non-empty — walk the live DOM as a fallback so the mark
	// still gets annotated.
	const wantsRange = highlightMark.range.start < highlightMark.range.end
	if (!range || (wantsRange && range.collapsed)) {
		range = createRangeFromCharOffsets(
			highlightMark.parent,
			highlightMark.range.start,
			highlightMark.range.end
		)
	}

	const span = doc.createElement('span')
	span.className = `mce-annotation annotation-text annotation-text-${source}`
	span.setAttribute('data-mce-annotation', source)
	span.setAttribute('data-mce-annotation-uid', String(highlightMark.id))

	try {
		range.surroundContents(span)
	} catch (_e) {
		const fragment = range.extractContents()
		span.appendChild(fragment)
		range.insertNode(span)
	}
}

/**
 * Registers TinyMCE annotator sources and injects per-analyzer CSS
 * inside the TinyMCE iframe. Uses `editor.annotator.register()` with
 * `persistent: false` so the serializer strips annotation spans from
 * `getContent()` output (prevents highlights from being saved).
 *
 * Each editor+source combination is tracked via `registeredSet` to
 * avoid duplicate registration.
 *
 * @param {Object} editor                The TinyMCE editor instance.
 * @param {Object} options               The options object.
 * @param {Array}  options.analyzers     Active analyzer identifiers.
 * @param {string} options.sourcePrefix  The annotation source prefix.
 * @param {Set}    options.registeredSet Set tracking already-registered editor:source pairs.
 * @returns {void}
 */
export const registerTinyMceAnnotators = (editor, { analyzers, sourcePrefix, registeredSet }) => {
	const editorId = editor.id || 'default'

	for (const analyzer of analyzers) {
		const source = `${sourcePrefix}-${analyzer}`
		const key = `${editorId}:${source}`

		if (registeredSet.has(key)) {
			continue
		}

		const color = getAssessmentColor(analyzer)

		editor.annotator.register(source, {
			persistent : false,
			decorate   : () => ({ classes: [ 'annotation-text', `annotation-text-${source}` ] })
		})

		editor.dom.addStyle(buildTinyMceCss(source, color).trim())
		registeredSet.add(key)
	}
}

/**
 * Removes all TinyMCE annotation spans across all active TinyMCE editors
 * via direct DOM unwrapping. This avoids using TinyMCE's annotator.remove()
 * and selection manipulation which can corrupt editor state.
 *
 * @returns {void}
 */
export const clearTinyMceAnnotations = () => {
	if ('object' !== typeof window?.tinymce?.editors) {
		return
	}

	for (const editor of window.tinymce.editors) {
		try {
			const body = editor.getBody()
			if (!body) {
				continue
			}

			const annotationSpans = body.querySelectorAll('[data-mce-annotation]')
			if (!annotationSpans.length) {
				continue
			}

			editor.undoManager.ignore(() => {
				for (const span of annotationSpans) {
					const parent = span.parentNode
					while (span.firstChild) {
						parent.insertBefore(span.firstChild, span)
					}
					parent.removeChild(span)
				}

				body.normalize()
			})

			editor.setDirty(false)
		} catch (_e) {
			// Skip editors that are not ready or have been destroyed.
		}
	}
}

/**
 * Temporarily intercepts TinyMCE's `editor.fire()` to block events
 * that can trigger WordPress handlers during annotation operations.
 * Returns the original fire method for later restoration.
 *
 * @param {Object} editor The TinyMCE editor instance.
 * @returns {Function} The original `editor.fire` method.
 */
export const suppressTinyMceEvents = (editor) => {
	const originalFire = editor.fire
	const suppressed = [ 'change', 'nodechange', 'setcontent', 'beforesetcontent' ]

	editor.fire = function (name, ...args) {
		if (suppressed.includes(name.toLowerCase())) {
			return this
		}
		return originalFire.call(this, name, ...args)
	}

	return originalFire
}

/**
 * Restores TinyMCE's original `editor.fire()` method and resets the
 * dirty flag so WordPress doesn't consider the content changed.
 *
 * @param {Object}   editor       The TinyMCE editor instance.
 * @param {Function} originalFire The original fire method from `suppressTinyMceEvents`.
 * @returns {void}
 */
export const restoreTinyMceEvents = (editor, originalFire) => {
	editor.fire = originalFire
	editor.setDirty(false)
}