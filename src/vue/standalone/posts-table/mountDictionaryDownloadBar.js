import { h, createApp, watch } from 'vue'

import loadPlugins from '@/vue/plugins'
import loadComponents from '@/vue/components/common'

import {
	loadPiniaStores,
	useSpellCheckerDictionaryStore
} from '@/vue/stores'

import DictionaryDownloadBar from '@/vue/components/common/tru-seo/DictionaryDownloadBar'

/**
 * Mounts the dictionary download bar at the top of the admin posts list page,
 * mirroring the placement used by BatchScanManager's progress notice. Unmounts
 * itself once the bar's own v-if hides (download settled).
 *
 * @since 5.0.0
 * @returns {void} Nothing to return.
 */
export default () => {
	const dictStore = useSpellCheckerDictionaryStore()

	if (!dictStore.shouldDownload()) {
		return
	}

	const wrap = document.querySelector('.wrap')
	if (!wrap) {
		return
	}

	const host = document.createElement('div')
	host.className = 'aioseo-dictionary-download-host'

	const subsubsub = wrap.querySelector('.subsubsub')
	if (subsubsub) {
		wrap.insertBefore(host, subsubsub)
	} else if (wrap.firstChild) {
		wrap.insertBefore(host, wrap.firstChild)
	} else {
		wrap.appendChild(host)
	}

	const app = createApp({
		name   : 'Standalone/PostsTable/DictionaryDownloadBar',
		render : () => h(DictionaryDownloadBar)
	})

	loadPlugins(app)
	loadComponents(app)
	loadPiniaStores(app)

	app.mount(host)

	const stop = watch(
		() => dictStore.downloading || dictStore.failed,
		isVisible => {
			if (isVisible) {
				return
			}

			stop()
			app.unmount()
			host.remove()
		}
	)
}