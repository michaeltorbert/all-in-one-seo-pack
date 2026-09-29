<template>
	<core-alert
		v-if="notice"
		class="aioseo-page-builder-notice"
		type="yellow"
	>
		<span v-html="notice" />
	</core-alert>
</template>

<script setup>
import { computed } from 'vue'

import {
	usePostEditorStore,
	useRootStore
} from '@/vue/stores'

import { __, sprintf } from '@/vue/plugins/translations'
import { isPageBuilderEditor } from '@/vue/utils/context'

import CoreAlert from '@/vue/components/common/core/alert/Index'

const td = import.meta.env.VITE_TEXTDOMAIN

const postEditorStore = usePostEditorStore()
const rootStore       = useRootStore()

// A page builder created this post, but it's being analyzed in a standard editor
// (block or classic), where the content won't match what the builder renders.
// Point the user back to the builder for an accurate analysis — but not inside the
// builder itself, since there's nothing to switch to there.
const notice = computed(() => {
	const integration = rootStore.aioseo.integration
	const editLink    = postEditorStore.currentPost?.editlink

	if (isPageBuilderEditor() || !integration || !editLink) {
		return false
	}

	const pageBuilderName = integration.charAt(0).toUpperCase() + integration.slice(1)

	return sprintf(
		// Translators: 1 - The Page Builder name, 2 - Opening anchor tag, 3 - Closing anchor tag.
		__('We have detected that you are currently using the %1$s Page Builder. Please click %2$shere%3$s to use the %1$s editor for a most accurate result.', td),
		pageBuilderName,
		'<a href="' + editLink + '">',
		'</a>'
	)
})
</script>