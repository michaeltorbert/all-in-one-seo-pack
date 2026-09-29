<template>
	<span
		class="aioseo-truseo-locale-controls"
		:class="`variant-${variant}`"
	>
		<tru-seo-locale-menu
			:variant="variant"
			:options="menuItems"
			:selected-value="selectedLocaleValue"
			:trigger-label="selectedLocaleLabel"
			:prefix="'row' === variant ? strings.language : ''"
			:footer="localeStrings.description"
			@select="onSelect"
		/>
	</span>
</template>

<script setup>
import { __ } from '@/vue/plugins/translations'
import { useTruSeoLocale } from '../../../composables/TruSeoLocale'

import TruSeoLocaleMenu from './TruSeoLocaleMenu'

const td = import.meta.env.VITE_TEXTDOMAIN

defineProps({
	variant : {
		type    : String,
		default : 'pill'
	}
})

const {
	menuItems,
	selectedLocaleValue,
	selectedLocaleLabel,
	onSelect,
	strings : localeStrings
} = useTruSeoLocale()

const strings = {
	language : __('Language:', td)
}
</script>

<style lang="scss">
.aioseo-truseo-locale-controls {
	&.variant-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	&.variant-row {
		display: block;
		width: 100%;
		max-width: 100%;
	}
}
</style>