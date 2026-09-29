import { ref } from 'vue'

import { isBlockCodeEditor as readBlockCodeEditor } from '@/vue/utils/context'

// Reactive mirror of the Block Editor's "Code Editor" mode. isBlockCodeEditor()
// reads wp.data synchronously, but that store isn't a Vue reactive source, so a
// bare call in a template never re-evaluates when the user toggles Visual/Code
// editor — the v-if goes stale. A single subscription bridges it into a Vue ref.
const isBlockCodeEditor = ref(false)

let subscribed = false

const ensureSubscription = () => {
	if (subscribed) {
		return
	}

	subscribed = true
	isBlockCodeEditor.value = readBlockCodeEditor()

	// The editor store lives for the whole page, so this subscription is never
	// torn down — matching how the block-editor analysis watcher subscribes.
	window.wp?.data?.subscribe?.(() => {
		const next = readBlockCodeEditor()
		if (next !== isBlockCodeEditor.value) {
			isBlockCodeEditor.value = next
		}
	})
}

export const useEditorMode = () => {
	ensureSubscription()

	return {
		isBlockCodeEditor
	}
}