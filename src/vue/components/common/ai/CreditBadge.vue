<template>
	<span
		class="aioseo-ai-credit-badge"
		:title="label"
		:aria-label="label"
	>
		<svg-ai-sparkles
			width="11"
			height="11"
			aria-hidden="true"
		/>

		{{ formattedCost }}
	</span>
</template>

<script setup>
import { computed } from 'vue'

import SvgAiSparkles from '@/vue/components/common/svg/ai/Sparkles'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	cost : {
		type     : Number,
		required : true
	}
})

const formattedCost = computed(() => props.cost.toLocaleString())

const label = computed(() => sprintf(
	// Translators: 1 - Number of AI credits an action costs.
	__('This action costs %1$s AI credits.', td),
	formattedCost.value
))
</script>

<style lang="scss">
.aioseo-ai-credit-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-left: 8px;
	padding: 3px 7px 3px 6px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 700;
	// The app-wide 1.4 line-height in main.scss outranks this class and would
	// inflate the pill, lifting the cost above the button label's centerline.
	line-height: 1 !important;
	font-variant-numeric: tabular-nums;

	svg.aioseo-ai-sparkles {
		width: 11px;
		height: 11px;
	}
}

.aioseo-button.blue .aioseo-ai-credit-badge {
	background: rgba(#fff, 0.26);
	color: #fff;
}

.aioseo-button.gray .aioseo-ai-credit-badge {
	background: rgba($blue, 0.2);
	color: $blue;
}

// Keep the badge muted when its button is disabled — the primary blue/gray
// backgrounds both collapse to the light disabled fill.
.aioseo-button:disabled .aioseo-ai-credit-badge,
.aioseo-button.disabled .aioseo-ai-credit-badge {
	background: rgba($black, 0.08);
	color: $placeholder-color;
}
</style>