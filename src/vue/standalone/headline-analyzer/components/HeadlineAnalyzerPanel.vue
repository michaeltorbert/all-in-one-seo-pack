<template>
	<div
		ref="root"
		class="aioseo-headline-analyzer-panel aioseo-headline-analyzer-sidebar"
	>
		<main-view />
	</div>
</template>

<script setup>
import { onMounted, nextTick, ref } from 'vue'

import MainView from './Main'

import '../assets/scss/main.scss'

const root = ref(null)

// Opening replaces the (tall) Optimization content in place, so reset the
// sidebar's scroll to start the analyzer at the top instead of wherever the tab
// was scrolled to.
onMounted(() => {
	nextTick(() => {
		let el = root.value?.parentElement

		while (el) {
			const overflowY = getComputedStyle(el).overflowY

			if (('auto' === overflowY || 'scroll' === overflowY) && el.scrollHeight > el.clientHeight) {
				el.scrollTop = 0

				break
			}

			el = el.parentElement
		}
	})
})
</script>