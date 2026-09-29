/* globals ETBuilderBackendDynamic */
import { debounce } from '@/vue/utils/debounce'
import { getDivi5AppWindow, refreshDivi5Content, isRefreshingDivi5Content } from './divi5-helpers'
import { getEditorData, getFeaturedImageId, isDivi5 } from './helpers'
import { handleEditorSave, createEditorChangeHandler } from '@/vue/standalone/page-builders/helpers'

let hasUnsavedChanges = false

const markAsSaved = () => {
	hasUnsavedChanges = false

	handleEditorSave()
}

const editorChangeHandler = createEditorChangeHandler()

/**
 * Handle editor changes.
 *
 * @returns {Promise<void>} Resolves when the change is processed.
 */
const handleEditorChange = async () => {
	// Skip if in wireframe mode (Legacy Divi).
	if (!isDivi5 && document.documentElement.classList.contains('et-fb-preview--wireframe')) {
		return
	}

	if (isDivi5 && !await refreshDivi5Content()) {
		return
	}

	const editorData = {
		...getEditorData({ includeFeaturedImage: false }),
		featuredImage : getFeaturedImageId()
	}

	editorChangeHandler({ editorData })
}

/**
 * Initialize Divi 5 watcher.
 *
 * @returns {void}
 */
const initDivi5Watcher = () => {
	const diviData = getDivi5AppWindow()?.divi?.data
	if (!diviData) {
		return
	}

	const restStore = diviData.select('divi/rest')
	let wasSaving   = false

	diviData.subscribe(() => {
		const isSaving = restStore.isInProgress('sync-to-server')
		if (!isSaving && wasSaving) {
			markAsSaved()
		}

		wasSaving = isSaving

		// Skip content change detection during our own view switches.
		if (!isRefreshingDivi5Content()) {
			debounce(handleEditorChange, 1000)
		}
	})
}

/**
 * Initialize Divi 4 watcher.
 *
 * @param   {Object}   wp               The WordPress object.
 * @param   {Function} addEventListener The event listener function.
 * @returns {void}
 */
const initLegacyWatcher = (wp, addEventListener) => {
	handleEditorChange()

	addEventListener('message', (event) => {
		if (event.origin !== window.location.origin) {
			return
		}

		if ('et_fb_section_content_change' === event.data.eventType) {
			debounce(handleEditorChange, 1000)

			hasUnsavedChanges = true
		}
	})

	if (!wp?.hooks) {
		return
	}

	wp.hooks.addFilter('et.builder.store.setting.update', 'aioseo', (val, setting) => {
		let shouldTriggerChange = true
		switch (setting) {
			case 'et_pb_post_settings_title':
				ETBuilderBackendDynamic.postTitle = val
				break
			case 'et_pb_post_settings_excerpt':
				if (!ETBuilderBackendDynamic.postMeta) {
					ETBuilderBackendDynamic.postMeta = {}
				}
				ETBuilderBackendDynamic.postMeta.post_excerpt = val
				break
			case 'et_pb_post_settings_image':
				if (!ETBuilderBackendDynamic.currentPage) {
					ETBuilderBackendDynamic.currentPage = {}
				}
				ETBuilderBackendDynamic.currentPage.thumbnailId = val
				break
			default:
				shouldTriggerChange = false
		}

		if (shouldTriggerChange) {
			debounce(handleEditorChange, 1000)
		}

		return val
	})
}

/**
 * Initialize the watcher.
 *
 * @param   {Object} window The window object.
 * @returns {void}
 */
export default ({ wp, addEventListener }) => {
	if (isDivi5) {
		initDivi5Watcher()
	} else {
		initLegacyWatcher(wp, addEventListener)

		document.querySelectorAll('.et-fb-button--save-draft, .et-fb-button--publish').forEach(btn => {
			btn.addEventListener('click', markAsSaved)
		})
	}

	window.aioseoPageBuilderHasUnsavedChanges = () => hasUnsavedChanges
}