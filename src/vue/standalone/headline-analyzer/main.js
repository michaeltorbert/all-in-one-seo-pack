import { h, createApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router'

import loadPlugins from '@/vue/plugins'

import loadComponents from '@/vue/components/common'
import loadVersionedComponents from '@/vue/components/AIOSEO_VERSION'

import { loadPiniaStores, usePostEditorStore } from '@/vue/stores'

import { elemLoaded } from '@/vue/utils/elemLoaded'
import HeadLineAnalyzer from './registerHeadlineAnalyzer'
import { HeadlineCurrentScore } from './assets/js/HeadlineCurrentScore'
import { debounceContext } from './assets/js/initAnalyzerData'

import App from './App'

// import scss
import './assets/scss/main.scss'

// Register Headline Analyzer Plugin
HeadLineAnalyzer()

const vueAppId = '#aioseo-headline-analyzer-sidebar-vue'

let app
const localCreateApp = () => {
	if (app) {
		app.unmount()
	}

	// Load App
	app = createApp({
		name : 'Standalone/HeadlineAnalyzer/Sidebar',
		data () {
			return {
				tableContext  : 'post',
				screenContext : 'sidebar'
			}
		},
		render : () => h(App)
	})

	app = loadPlugins(app)
	app = loadComponents(app)
	app = loadVersionedComponents(app)

	// Use the pinia store.
	loadPiniaStores(app)

	// unmount postSettingsSidebar if it exists
	if (window.aioseo.postSettingsSidebarApp) {
		window.aioseo.postSettingsSidebarApp.unmount()
	}

	HeadlineCurrentScore()

	app.mount(vueAppId)

	window.aioseo.headlineAnalyzerSidebarApp = app

	return app
}

if (window.aioseo.currentPost) {
	const currentContext = window.aioseo.currentPost.context

	if (!window.wp.blockEditor && window.wp.blocks && window.wp.oldEditor) {
		window.wp.blockEditor = window.wp.editor
	}

	if ('post' === currentContext) {
		const sidebar = document.querySelector(vueAppId)
		if (!sidebar) {
			elemLoaded(vueAppId, 'headlineAnalyzerSidebarLoaded')
			document.addEventListener('animationstart', function (event) {
				if ('headlineAnalyzerSidebarLoaded' === event.animationName) {
					localCreateApp()
				}
			}, { passive: true })
		} else {
			localCreateApp()
		}
	}
}

const { select } = window.wp.data

// Re-run the analysis when the post title changes so the Content Analysis card
// stays current even when the Headline Analyzer sidebar is never opened.
const headlineState = { last: select('core/editor').getEditedPostAttribute('title') }
window.wp.data.subscribe(() => {
	const headline = select('core/editor').getEditedPostAttribute('title')
	if (headlineState.last === headline) {
		return
	}

	headlineState.last = headline

	debounceContext(() => {
		const postEditorStore = usePostEditorStore()
		if (postEditorStore.currentPost?.headlineAnalyzer?.newData) {
			postEditorStore.toggleShowNewHeadlineAnalyzerPreview(false)
		}

		if (postEditorStore.currentPost?.headlineAnalyzer?.showNewData) {
			postEditorStore.toggleShowNewHeadlineAnalyzerData(false)
		}

		HeadlineCurrentScore()
	}, 2000)
})