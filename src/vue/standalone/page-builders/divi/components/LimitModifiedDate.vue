<template>
	<span
		class="et-vb-right-click-option-wrap"
		:class="{ 'et-vb-right-click-option-wrap--active': isHovered }"
		@mouseenter="onMouseEnter"
		@mouseleave="isHovered = false"
	>
		<button
			type="button"
			class="et-vb-right-click-option"
			:aria-label="strings.buttonTitle"
			@click.prevent.stop="initSave"
		>
			{{ strings.buttonTitle }}
		</button>
	</span>
</template>

<script setup>
import { ref } from 'vue'
import { __ } from '@/vue/plugins/translations'
import { getDivi5AppWindow, getDivi5PostId, saveDivi5 } from '../divi5-helpers'

const isHovered = ref(false)

const onMouseEnter = () => {
	isHovered.value = true

	// Deselect native menu items.
	try {
		const diviData = getDivi5AppWindow()?.divi?.data
		if (!diviData) {
			console.warn('Divi data store not available for right-click options.')

			return
		}

		diviData.dispatch('divi/right-click-options').setSelected({
			selected : -1,
			parent   : diviData.select('divi/right-click-options').getState().parent
		})
	} catch (e) {
		console.warn('Failed to deselect native menu items:', e)
	}
}

const cookieName = 'aioseo_limit_modified_date'
const cookiePath = '; path=/; SameSite=Lax'

const strings = {
	buttonTitle : __('Save (Don\'t Modify Date)', import.meta.env.VITE_TEXTDOMAIN)
}

const clearCookie = () => {
	document.cookie = `${cookieName}=${cookiePath}; max-age=0`
}

const initSave = async () => {
	try {
		// Set the cookie value to the post ID so the backend can verify it matches.
		document.cookie = `${cookieName}=${getDivi5PostId()}${cookiePath}; max-age=30`

		// Close the right-click menu. The body click is a legacy fallback;
		// unset() is the Divi 5 API method to properly dismiss the menu.
		document.body.click()
		getDivi5AppWindow()?.divi?.data?.dispatch('divi/right-click-options')?.unset()

		await saveDivi5()
	} finally {
		setTimeout(clearCookie, 100)
	}
}
</script>