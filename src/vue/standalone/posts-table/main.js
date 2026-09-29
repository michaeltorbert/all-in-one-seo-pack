import { h, createApp } from 'vue'

import loadPlugins from '@/vue/plugins'

import loadComponents from '@/vue/components/common'
import loadVersionedComponents from '@/vue/components/AIOSEO_VERSION'

import {
	loadPiniaStores,
	useOptionsStore,
	useSpellCheckerDictionaryStore
} from '@/vue/stores'

import http from '@/vue/utils/http'
import links from '@/vue/utils/links'

import { allowed } from '@/vue/utils/AIOSEO_VERSION'

import App from './App'
import TermApp from './TermApp'
import BatchScanManager from './BatchScanManager'
import mountDictionaryDownloadBar from './mountDictionaryDownloadBar'

import './AIOSEO_VERSION/urlInspection.js'

// We need to load the Pinia here since we will use the store outside an App.
// links.restUrl method that we use below uses rootStore to get the rest URL.
loadPiniaStores()

// Kick off the background dictionary install (no-op when not needed) and mount
// its progress bar at the top of the page. BatchScanManager awaits the same
// promise before starting its queue.
useSpellCheckerDictionaryStore().ensureDownloaded()
mountDictionaryDownloadBar()

const localCreateApp = (app) => {
	app = loadPlugins(app)
	app = loadComponents(app)
	app = loadVersionedComponents(app)

	// Use the pinia store.
	loadPiniaStores(app)

	return app
}

const localUnmountApp = (id) => {
	const $el = document.getElementById(id)

	if ($el?.__vue_app__) {
		$el.__vue_app__.unmount()
	}
}

// Checks if the app div target is already in the DOM. If not, it creates a new one.
const localCheckAppTarget = (obj, type) => {
	const $el = document.getElementById(`${obj.columnName}-${obj.id}`)
	if (!$el) {
		const $row = document.querySelector(`tr#${type}-${obj.id}`)
		const $col = $row?.querySelector('.column-aioseo-details')

		if ($col) {
			const newApp = document.createElement('div')
			newApp.id = `aioseo-details-${obj.id}`

			$col.appendChild(newApp)
		}
	}
}

const loadPostsTable = (post) => {
	localUnmountApp(`${post.columnName}-${post.id}`)
	localCheckAppTarget(post, 'post')

	const app = localCreateApp(createApp({
		name : 'Standalone/PostsTable/' + post.id,
		data () {
			return {
				screen : window.aioseo.screen
			}
		},
		render : () => h(App)
	}, { post }))

	app.mount(`#${post.columnName}-${post.id}`)
}

const addHiddenField = (wrapper) => {
	if (!wrapper) {
		return
	}

	const input = document.createElement('input')
	input.setAttribute('type', 'hidden')
	input.setAttribute('name', 'aioseo-has-details-column')
	input.setAttribute('value', true)

	wrapper.append(input)
}

if (window.aioseo.posts && 0 < window.aioseo.posts.length && (allowed('aioseo_page_general_settings') || allowed('aioseo_page_analysis'))) {
	http.post(links.restUrl('posts-list/load-details-column'))
		.send({
			ids : window.aioseo.posts.map((p) => p.id)
		})
		.then(response => {
			window.aioseo.posts = window.aioseo.posts.map(item => {
				return {
					...item,
					...response.body.posts.find(p => p.id === item.id)
				}
			})

			window.aioseo.posts.forEach((post) => {
				loadPostsTable(post)
			})

			// Initialize batch scanning for posts without scores
			// Only run on post list pages (not media library) and if batch scanning is enabled
			if (shouldInitializeBatchScan()) {
				const maxWorkers = window.aioseo?.batchScanConcurrency || 3
				const startDelay = window.aioseo?.batchScanStartDelay || 2000
				const batchScanManager = new BatchScanManager({
					maxWorkers,
					startDelay,
					posts : window.aioseo.posts
				})
				batchScanManager.start()
			}
		})
}

const loadTermsTable = (term) => {
	localUnmountApp(`${term.columnName}-${term.id}`)
	localCheckAppTarget(term, 'tag')

	const app = localCreateApp(createApp({
		name : 'Standalone/TermsTable/' + term.id,
		data () {
			return {
				screen : window.aioseo.screen
			}
		},
		render : () => h(TermApp)
	}, { term }))

	app.mount(`#${term.columnName}-${term.id}`)
}

if (window.aioseo.terms && 0 < window.aioseo.terms.length && 0 === window.aioseo.posts.length && (allowed('aioseo_page_general_settings') || allowed('aioseo_page_analysis'))) {
	http.post(links.restUrl('terms-list/load-details-column'))
		.send({
			ids : window.aioseo.terms.map((t) => t.id)
		})
		.then(response => {
			window.aioseo.terms = window.aioseo.terms.map(item => {
				return {
					...item,
					...response.body.terms.find(t => t.id === item.id)
				}
			})

			window.aioseo.terms.forEach((term) => {
				loadTermsTable(term)
			})

			startTermBatchScan(window.aioseo.terms)
		})
}

/**
 * Starts a TruSEO batch scan over the given terms.
 *
 * Terms only get a score when someone opens the editor, so the list backfills them the same way
 * posts do. Ineligible taxonomies come back without an analysis payload and are filtered out by
 * the manager.
 *
 * @param {Array} terms The terms to scan.
 * @returns {void}
 */
const startTermBatchScan = (terms) => {
	if (!shouldInitializeTermBatchScan(terms)) {
		return
	}

	const batchScanManager = new BatchScanManager({
		maxWorkers : window.aioseo?.batchScanConcurrency || 3,
		startDelay : window.aioseo?.batchScanStartDelay || 2000,
		posts      : terms,
		objectType : 'term'
	})
	batchScanManager.start()
}

/**
 * Determines if term batch scanning should be initialized.
 * Only enable on term list pages for TruSEO-eligible taxonomies.
 *
 * @param {Array} terms The terms about to be scanned.
 * @returns {boolean} Whether to initialize term batch scanning.
 */
const shouldInitializeTermBatchScan = (terms = []) => {
	if (!window.aioseo?.batchScanEnabled) {
		return false
	}

	if ('edit-tags' !== window.aioseo?.screen?.base) {
		return false
	}

	return !!terms.length
}

/**
 * Determines if batch scanning should be initialized.
 * Only enable on post list pages where TruSEO is supported.
 *
 * @since 5.0.0
 * @returns {boolean} Whether to initialize batch scanning.
 */
const shouldInitializeBatchScan = () => {
	// Batch scan is disabled (e.g. TruSEO turned off). wp_localize_script stringifies the
	// PHP boolean, so a disabled flag arrives as '' rather than false — treat any falsy value
	// as disabled instead of comparing strictly against a boolean that never arrives.
	if (!window.aioseo?.batchScanEnabled) {
		return false
	}

	// Only run on 'edit' screen (post list), not 'upload' (media library)
	if ('edit' !== window.aioseo?.screen?.base) {
		return false
	}

	// Check for required post data
	if (!window.aioseo?.posts || 0 === window.aioseo.posts.length) {
		return false
	}

	// Verify we're on a supported post type (not attachment/media)
	const postType = window.aioseo?.screen?.postType
	if (!postType || 'attachment' === postType) {
		return false
	}

	// All checks passed
	return true
}

// Quick Edit renders one hidden fieldset for the whole table, so the current values
// have to be copied in each time the form is opened for a row.
const syncQuickEditRobots = (postId) => {
	const form = document.getElementById('edit-' + postId)
	if (!form) {
		return
	}

	const post   = (window.aioseo?.posts || []).find((p) => p.id === postId)
	const robots = post?.robots || { default: true, noindex: false, nofollow: false }

	// Special pages — the homepage, blog page, the WooCommerce pages — take their robots
	// meta from Search Appearance, so a per-post override here would do nothing. The column
	// already hides its own indexing row for them.
	const fieldset = form.querySelector('.aioseo-inline-edit-robots')
	if (fieldset) {
		fieldset.hidden = !!post?.isSpecialPage
	}

	const useDefault = form.querySelector('[name="aioseo-quick-robots-default"]')
	const noindex    = form.querySelector('[name="aioseo-quick-robots-noindex"]')
	const nofollow   = form.querySelector('[name="aioseo-quick-robots-nofollow"]')
	if (!useDefault || !noindex || !nofollow) {
		return
	}

	useDefault.checked = !!robots.default
	noindex.checked    = !!robots.noindex
	nofollow.checked   = !!robots.nofollow

	const applyDefaultState = () => {
		const disabled = useDefault.checked
		noindex.disabled  = disabled
		nofollow.disabled = disabled
		noindex.closest('.aioseo-inline-edit-robots__options')?.classList.toggle('is-disabled', disabled)
	}

	applyDefaultState()
	useDefault.removeEventListener('change', applyDefaultState)
	useDefault.addEventListener('change', applyDefaultState)
}

// WP has no hook for "quick edit opened", so wrap its handler.
if (window.inlineEditPost?.edit) {
	const wpInlineEdit = window.inlineEditPost.edit
	window.inlineEditPost.edit = function (id) {
		const result = wpInlineEdit.apply(this, arguments)
		const postId = parseInt('object' === typeof id ? this.getId(id) : id)
		if (postId) {
			syncQuickEditRobots(postId)
		}

		return result
	}
}

// Adds a flag to the quick-edit form to re-render the component when it finishes.
addHiddenField(document.querySelector('#inline-edit div'))

// Adds a flag to the add-tag form to render the component when it finishes.
addHiddenField(document.getElementById('addtag'))

// Re-renders the component when the quick-edit finishes.
;(function ($) {
	$(document).on('ajaxComplete', (_event, jqXHR, ajaxOptions) => {
		const data   = new URLSearchParams(ajaxOptions.data)
		const action = data?.get('action')
		if (!data || !action) {
			return
		}

		// Quick-edit on posts table.
		if ('inline-save' === action) {
			const { post_ID : postId } = Object.fromEntries(data.entries())
			const post = window.aioseo.posts.find((p) => p.id === parseInt(postId))

			// The submitted robots values aren't in the response, so fold them back into
			// the cached post — otherwise the column's noindex badge renders stale.
			if (post && data.has('aioseo-quick-robots-submitted')) {
				const useDefault = data.has('aioseo-quick-robots-default')

				post.robots = {
					default  : useDefault,
					noindex  : !useDefault && data.has('aioseo-quick-robots-noindex'),
					nofollow : !useDefault && data.has('aioseo-quick-robots-nofollow')
				}

				post.isNoindexed = useDefault
					? !!window.aioseo?.postTypeIsNoindexed
					: post.robots.noindex
			}

			loadPostsTable({
				...post,
				reload : true
			})
		}

		// Quick-edit on terms table.
		if ('inline-save-tax' === action) {
			const { tax_ID : termId } = Object.fromEntries(data.entries())
			const term = window.aioseo.terms.find((t) => t.id === parseInt(termId))

			loadTermsTable({
				...term,
				reload : true
			})
		}

		// Add new tag.
		if ('add-tag' === action) {
			const termId       = parseInt($(jqXHR.responseXML).find('term_id').text())
			const taxonomy     = $(jqXHR.responseXML).find('term taxonomy').text()
			const optionsStore = useOptionsStore()

			if (!termId) {
				return
			}

			// The taxonomy's templates seed the editors; they are not the term's own values, so
			// they'd otherwise show as a custom title/description on a term nobody has touched.
			// titleParsed/descriptionParsed are left for the reload to fetch — a brand new term
			// has nothing rendered yet.
			const term = {
				id                 : termId,
				columnName         : 'aioseo-details',
				taxonomy,
				title              : '',
				description        : '',
				defaultTitle       : optionsStore.dynamicOptions.searchAppearance.taxonomies[taxonomy]?.title,
				defaultDescription : optionsStore.dynamicOptions.searchAppearance.taxonomies[taxonomy]?.metaDescription,
				showTitle          : true,
				showDescription    : true,
				reload             : true
			}

			loadTermsTable(term)

			// The row is created after the page's own batch scan has already finished, so fetch its
			// payload and give it a scan of its own — otherwise its score only turns up on the next
			// page load. Also registers it for the quick-edit branch above.
			http.post(links.restUrl('terms-list/load-details-column'))
				.send({ ids: [ termId ] })
				.then(response => {
					const hydrated = {
						...term,
						...response.body?.terms?.find(t => t.id === termId),
						reload : false
					}

					window.aioseo.terms = [ ...(window.aioseo.terms || []), hydrated ]

					loadTermsTable(hydrated)
					startTermBatchScan([ hydrated ])
				})
		}
	})
})(window.jQuery)