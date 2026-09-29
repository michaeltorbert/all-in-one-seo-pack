import {
	usePostEditorStore
} from '@/vue/stores'

import { maybeUpdatePost } from '@/vue/plugins/tru-seo/components/helpers'
import { createThrottle } from '@/vue/utils/debounce'
import { generateCacheKey } from '@/app/tru-seo/helpers/hash'

/**
 * Minimum interval between analysis triggers in milliseconds.
 * This prevents excessive calls from wp.data.subscribe which fires on every Redux state change.
 *
 * @since 5.0.0
 * @type {number}
 */
const MIN_UPDATE_INTERVAL = 300

/**
 * Cached content hash to detect actual content changes.
 *
 * @since 5.0.0
 * @type {string|null}
 */
let lastContentHash = null

/**
 * Generates a hash from the current editor content.
 * Used to detect if the content has actually changed.
 *
 * @since 5.0.0
 *
 * @returns {string} A hash of the current content.
 */
const getContentHash = () => {
	try {
		const editor = window.wp.data.select('core/editor')
		const content = editor.getEditedPostContent() || ''
		const title = editor.getEditedPostAttribute('title') || ''
		const excerpt = editor.getEditedPostAttribute('excerpt') || ''
		const slug = 'function' === typeof editor.getEditedPostSlug
			? editor.getEditedPostSlug()
			: editor.getEditedPostAttribute('slug') || ''

		return generateCacheKey(content, title, excerpt, slug)
	} catch (e) {
		return Date.now().toString()
	}
}

/**
 * Handles content changes with change detection.
 * Only triggers analysis if the content has actually changed.
 *
 * @since 5.0.0
 *
 * @returns {void}
 */
const handleContentChange = () => {
	const currentHash = getContentHash()

	// Skip if content hasn't changed.
	if (lastContentHash === currentHash) {
		return
	}

	lastContentHash = currentHash
	maybeUpdatePost(500)
}

/**
 * Throttled version of the content change handler.
 * Ensures we don't process more than once per MIN_UPDATE_INTERVAL.
 *
 * @since 5.0.0
 */
const throttledContentChange = createThrottle(handleContentChange, MIN_UPDATE_INTERVAL)

export const watchBlockEditor = () => {
	// Initial page load.
	maybeUpdatePost()

	// Initialize content hash.
	lastContentHash = getContentHash()

	// Subscribe to block editor changes with throttling and change detection.
	window.wp.data.subscribe(() => {
		// Use throttled handler for regular content changes.
		throttledContentChange()

		// Post save/update - handle immediately without throttling.
		const isSavingPost     = window.wp.data.select('core/editor').isSavingPost()
		const isAutosavingPost = window.wp.data.select('core/editor').isAutosavingPost()
		if (isSavingPost && !isAutosavingPost) {
			const postEditorStore   = usePostEditorStore()
			postEditorStore.isDirty = false

			// Update hash and trigger analysis on save.
			lastContentHash = getContentHash()
			maybeUpdatePost()
		}
	})
}