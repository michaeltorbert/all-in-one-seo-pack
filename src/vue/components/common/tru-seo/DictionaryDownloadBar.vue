<template>
	<div
		v-if="dictStore.downloading || dictStore.failed"
		class="aioseo-dictionary-download"
	>
		<div class="aioseo-dictionary-download__row">
			<div class="aioseo-dictionary-download__title">
				{{ titleText }}
			</div>

			<button
				v-if="dictStore.failed"
				type="button"
				class="aioseo-dictionary-download__dismiss"
				:aria-label="strings.dismiss"
				@click="dictStore.dismissFailure()"
			>
				<svg-close width="12" />
			</button>
		</div>

		<loading-bar
			v-if="dictStore.downloading"
			:percent="dictStore.percent"
			:show-number="false"
		/>

		<div
			v-if="dictStore.failed && dictStore.errorMessage"
			class="aioseo-dictionary-download__error"
		>
			{{ dictStore.errorMessage }}
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'

import { useSpellCheckerDictionaryStore } from '@/vue/stores'

import { __, sprintf } from '@/vue/plugins/translations'

import LoadingBar from '@/vue/components/common/core/LoadingBar'
import SvgClose from '@/vue/components/common/svg/Close'

const td = import.meta.env.VITE_TEXTDOMAIN

const dictStore = useSpellCheckerDictionaryStore()

const strings = {
	installing : __('Installing spell-check dictionary…', td),
	failed     : __('We couldn\'t download the spell-check dictionary. Continuing without spell-check.', td),
	dismiss    : __('Dismiss', td)
}

const titleText = computed(() => {
	if (dictStore.failed) {
		return strings.failed
	}

	if (dictStore.activeLabel) {
		return sprintf(
			// Translators: 1 - Language label (e.g. "English").
			__('Installing %1$s spell-check dictionary…', td),
			dictStore.activeLabel
		)
	}

	return strings.installing
})
</script>

<style lang="scss">
.aioseo-dictionary-download {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 0;

	&__row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	&__title {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		color: $black;
	}

	&__dismiss {
		background: transparent;
		border: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		color: $black;
		opacity: 0.6;

		&:hover,
		&:focus-visible {
			opacity: 1;
		}

		svg {
			display: block;
		}
	}

	&__error {
		font-size: 12px;
		color: $red;
	}
}
</style>