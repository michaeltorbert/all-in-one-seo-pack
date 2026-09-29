import {
	annotateTinyMce,
	registerTinyMceAnnotators
} from './tinymce'

/**
 * Polls for the TinyMCE 'content' editor instance and stores it in the
 * provided Vue ref once available. Optionally invokes `onReady` once the
 * editor is fully initialized, so callers can run a highlight pass that
 * would have been skipped earlier when the ref was still null.
 *
 * @param {any}      editorRef - Vue ref to store the TinyMCE editor instance.
 * @param {Function} [onReady] - Callback fired once after the editor lands.
 * @returns {void}
 */
export const initTinymceEditor = (editorRef, onReady) => {
	if (editorRef.value) {
		return false
	}

	const interval = window.setInterval(() => {
		editorRef.value = window?.tinymce?.get('content') || null
		if (!editorRef.value || !editorRef.value.dom) {
			return false
		}

		window.clearInterval(interval)

		if ('function' === typeof onReady) {
			onReady()
		}
	}, 500)
}

/**
 * Groups highlight marks by their parent node, returning a Map preserving
 * insertion order of first-seen parents.
 *
 * @param {Array} marks Highlight marks to group.
 * @returns {Map<HTMLElement, Array>} Marks grouped by `mark.parent`.
 */
const groupMarksByParent = (marks) => {
	const grouped = new Map()
	for (const hm of marks) {
		if (!grouped.has(hm.parent)) {
			grouped.set(hm.parent, [])
		}
		grouped.get(hm.parent).push(hm)
	}

	return grouped
}

/**
 * Orchestrates highlighting for the Classic Editor (TinyMCE).
 * Registers annotators, builds highlight marks from editor content,
 * and applies annotations via direct DOM manipulation.
 *
 * @param {Object}   options                       The options object.
 * @param {Object}   options.editor                The TinyMCE editor instance.
 * @param {Object}   options.store                 The TruSeoHighlighter Pinia store.
 * @param {string}   options.sourcePrefix          The annotation source prefix.
 * @param {Set}      options.registeredAnnotators  Set tracking registered editor:source pairs.
 * @param {Function} options.setHighlightMarks     Callback to build highlight marks for a node.
 * @param {Map}      [options.streamCache]         Optional `Map<parentNode, {text, segments}>` for O(log n) range resolution.
 * @returns {void}
 */
export const highlightClassicEditor = ({ editor, store, sourcePrefix, registeredAnnotators, setHighlightMarks, streamCache }) => {
	// Defensive bail: TinyMCE may still be booting (or already destroyed).
	// The composable's `tinymceEditor` watcher will re-invoke us once the
	// editor ref becomes available.
	if (!editor || 'function' !== typeof editor.getBody) {
		return false
	}

	const editorChildren = editor.getBody()?.children || []
	if (!editorChildren.length) {
		return false
	}

	registerTinyMceAnnotators(editor, {
		analyzers     : store.highlightAnalyzers,
		sourcePrefix  : sourcePrefix,
		registeredSet : registeredAnnotators
	})

	for (const node of editorChildren) {
		setHighlightMarks({ block: null, node })
	}

	editor.undoManager.ignore(() => {
		// Annotate marks per-parent in descending offset order. Each
		// `surroundContents` call splits a text node; descending order
		// means splits only ever happen after segments we no longer need,
		// keeping the cached stream-segment node references valid for
		// every unprocessed mark.
		const marksByParent = groupMarksByParent(store.highlightMarks)
		for (const [ parent, marks ] of marksByParent) {
			marks.sort((a, b) => b.range.start - a.range.start)
			const segments = streamCache?.get(parent)?.segments || null
			for (const hm of marks) {
				annotateTinyMce(hm, editor, sourcePrefix, segments)
			}
		}
	})

	editor.setDirty(false)
}