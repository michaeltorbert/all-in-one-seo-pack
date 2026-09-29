<template>
	<div
		v-if="truSeoHighlighterStore.enabled"
		class="aioseo-truseo-highlight-control"
		:class="`variant-${variant}`"
		@click="truSeoHighlighterStore.toggleGlobalHighlighting()"
	>
		<span class="aioseo-truseo-highlight-control__label">{{ strings.highlight }}</span>

		<base-toggle
			:modelValue="truSeoHighlighterStore.highlightingEnabled"
			@update:modelValue="truSeoHighlighterStore.toggleGlobalHighlighting()"
			@click.stop
		/>
	</div>
</template>

<script setup>
import { __ } from '@/vue/plugins/translations'
import { useTruSeoHighlighterStore } from '@/vue/stores'

import BaseToggle from '@/vue/components/common/base/Toggle'

const td = import.meta.env.VITE_TEXTDOMAIN

defineProps({
	variant : {
		type    : String,
		default : 'pill'
	}
})

const truSeoHighlighterStore = useTruSeoHighlighterStore()

const strings = {
	highlight : __('Highlight', td)
}
</script>

<style lang="scss">
.aioseo-truseo-highlight-control {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;

	&.variant-pill {
		box-sizing: border-box;
		height: 34px;
		padding: 0 12px;
		border: 1px solid $border;
		border-radius: 4px;
		background: #fff;
	}

	&__label {
		font-size: 13px;
		font-weight: $font-bold;
		color: $black;
		white-space: nowrap;
	}
}
</style>