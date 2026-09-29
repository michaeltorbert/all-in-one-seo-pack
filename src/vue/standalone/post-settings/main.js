import { h, createApp } from 'vue'

import loadPlugins from '@/vue/plugins'

import loadComponents from '@/vue/components/common'
import loadVersionedComponents from '@/vue/components/AIOSEO_VERSION'

import { loadPiniaStores } from '@/vue/stores'

import RedirectsSlugMonitor from '@/vue/plugins/redirects'

import App from './App'
import registerScoreToggler from './registerScoreToggler'
import initWatcher from './watcher/main.js'
import { elemLoaded } from '@/vue/utils/elemLoaded'
import { shouldShowMetaBox } from '@/vue/utils/metabox'
import loadTruSeo from '@/vue/standalone/post-settings/loadTruSeo'
import LinkAssistantWatcher from './link-assistant/AIOSEO_VERSION'
import { registerHighlightFormats } from '@/vue/plugins/tru-seo/highlighter/blockFormats'

// Local Business.
import AppLocalBusiness from '../local-business-seo/App'

// Register the TruSEO highlighter store + RichText format types now, at eager
// entry load, before the block editor renders its blocks. They otherwise live
// in the lazily-loaded Analysis sidebar chunk and register after Gutenberg's
// first render, which changes the registered format-type count mid-session and
// trips Gutenberg's `useFormatTypes` "hook dependency array changed size"
// warning. Idempotent and self-gating (no-ops when the RichText API is absent).
registerHighlightFormats()

initWatcher()

const localCreateApp = (app) => {
	// useId() restarts its counter per app, so the metabox and sidebar apps hand the same
	// component the same ids. Namespace each app to keep SVG defs from resolving across them.
	app.config.idPrefix = `aioseo-${++appCount}`

	app = loadPlugins(app)
	app = loadComponents(app)
	app = loadVersionedComponents(app)

	loadPiniaStores(app)

	// The code below requires Pinia to be loaded.
	new RedirectsSlugMonitor()
	new LinkAssistantWatcher()
	registerScoreToggler()

	window.addEventListener('load', () => loadTruSeo(app))

	return app
}

let appCount = 0,
	sidebarApp

const loadSidebarApp = () => {
	if (sidebarApp) {
		sidebarApp.unmount()
	}

	sidebarApp = createApp({
		name : 'Standalone/PostSettings/Sidebar',
		data () {
			return {
				tableContext  : 'post',
				screenContext : 'sidebar'
			}
		},
		render : () => h(App)
	})

	// unmount headlineAnalyzerSidebarApp if it exists
	if (window.aioseo.headlineAnalyzerSidebarApp) {
		window.aioseo.headlineAnalyzerSidebarApp.unmount()
	}

	localCreateApp(sidebarApp).mount('#aioseo-post-settings-sidebar-vue')

	window.aioseo.postSettingsSidebarApp = sidebarApp
}

if (window.aioseo.currentPost) {
	const currentContext = window.aioseo.currentPost.context
	const node           = document.querySelector(`#aioseo-${currentContext}-settings-metabox`)

	if (node && shouldShowMetaBox()) {
		if (!window.wp.blockEditor && window.wp.blocks && window.wp.oldEditor) {
			window.wp.blockEditor = window.wp.editor
		}

		localCreateApp(createApp({
			name : 'Standalone/PostSettings/Metabox',
			data () {
				return {
					tableContext  : currentContext,
					screenContext : 'metabox'
				}
			},
			render : () => h(App)
		})).mount(`#aioseo-${currentContext}-settings-metabox`)

		if ('post' === currentContext) {
			const sidebar = document.getElementById('aioseo-post-settings-sidebar-vue')
			if (!sidebar) {
				elemLoaded('#aioseo-post-settings-sidebar-vue', 'aioseoSidebarVisible')
				document.addEventListener('animationstart', function (event) {
					if ('aioseoSidebarVisible' === event.animationName) {
						loadSidebarApp()
					}
				}, { passive: true })
			} else {
				loadSidebarApp()
			}
		}
	}
}

if (window.aioseo.currentPost && window.aioseo.localBusiness && document.getElementById('aioseo-location-settings-metabox')) {
	localCreateApp(createApp({
		name : 'Standalone/LocalSeo/Metabox',
		data () {
			return {
				screenContext : 'metabox'
			}
		},
		render : () => h(AppLocalBusiness)
	})).mount('#aioseo-location-settings-metabox')
}