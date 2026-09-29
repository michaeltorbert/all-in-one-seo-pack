/**
 * Returns the block editor iframe element if it exists.
 *
 * @since 4.9.6
 *
 * @returns {HTMLIFrameElement|null} The editor iframe element.
 */
export const getEditorIframe = () => {
	return document.querySelector('iframe[name="editor-canvas"]')
}

/**
 * Detects if the block editor is rendered inside an iframe (WordPress 6.3+).
 *
 * @since 4.9.6
 *
 * @returns {boolean} Whether the editor is in iframe mode.
 */
export const isIframedEditor = () => {
	// WordPress renders `iframe[name="editor-canvas"]` only when the canvas is
	// actually iframed, so the element alone identifies the mode. This used to
	// also require `.editor-visual-editor.is-iframed`, which WP 7.1 removed —
	// leaving every consumer below reading the admin page instead of the canvas.
	//
	// The body class is the readiness guard the removed class used to provide:
	// core portals that body in only once the iframe's document exists, so until
	// then `contentDocument` is a blank document that WordPress replaces.
	return !!getEditorIframe()?.contentDocument?.body?.classList.contains('block-editor-iframe__body')
}

/**
 * Returns the document context for the block editor content.
 * In iframe mode, returns the iframe's contentDocument; otherwise, the main document.
 *
 * @since 4.9.6
 *
 * @returns {Document} The editor document.
 */
export const getEditorDocument = () => {
	if (isIframedEditor()) {
		return getEditorIframe()?.contentDocument || document
	}

	return document
}

/**
 * Returns the window context for the block editor content.
 * In iframe mode, returns the iframe's contentWindow; otherwise, the main window.
 *
 * @since 4.9.6
 *
 * @returns {Window} The editor window.
 */
export const getEditorWindow = () => {
	if (isIframedEditor()) {
		return getEditorIframe()?.contentWindow || window
	}

	return window
}