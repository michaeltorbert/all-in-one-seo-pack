<template>
	<div
		v-if="'hero' === variant"
		class="aioseo-ai-feature aioseo-ai-feature--hero"
	>
		<span class="aioseo-ai-feature__icon">
			<component :is="icon" />
		</span>

		<span class="aioseo-ai-feature__name">
			{{ feature.strings.name }}

			<base-badge
				v-if="feature.badge"
				:text="feature.badge.text"
				:color="feature.badge.color"
			/>
		</span>

		<credit-counter
			class="aioseo-ai-feature__counter"
			:parent-component-context="parentComponentContext"
			tooltip-placement="bottom-end"
			tooltip-offset="0, 6px"
		/>

		<span class="aioseo-ai-feature__desc">{{ feature.strings.description }}</span>

		<core-tooltip
			v-if="disabledReason"
			class="aioseo-ai-feature__action"
			type="action"
			placement="top-end"
		>
			<base-button
				size="medium"
				type="blue"
				disabled
			>
				{{ feature.strings.buttonSubmit }}

				<credit-badge
					v-if="resolvedCost"
					:cost="resolvedCost"
				/>
			</base-button>

			<template #tooltip>
				{{ disabledReason }}
			</template>
		</core-tooltip>

		<base-button
			v-else
			class="aioseo-ai-feature__action"
			size="medium"
			type="blue"
			@click="emit('activate')"
		>
			{{ feature.strings.buttonSubmit }}

			<credit-badge
				v-if="resolvedCost"
				:cost="resolvedCost"
			/>
		</base-button>
	</div>

	<div
		v-else
		class="aioseo-ai-feature aioseo-ai-feature--row"
	>
		<span class="aioseo-ai-feature__icon">
			<component :is="icon" />
		</span>

		<span class="aioseo-ai-feature__text">
			<span class="aioseo-ai-feature__name">
				{{ feature.strings.name }}

				<base-badge
					v-if="feature.badge"
					:text="feature.badge.text"
					:color="feature.badge.color"
				/>
			</span>

			<span class="aioseo-ai-feature__hint">{{ feature.strings.hint }}</span>
		</span>

		<span
			v-if="resolvedCost"
			class="aioseo-ai-feature__cost"
		>
			<svg-ai-sparkles />
			{{ resolvedCost.toLocaleString() }}
		</span>

		<svg-caret class="aioseo-ai-feature__caret" />
	</div>
</template>

<script setup>
import { computed } from 'vue'

import { getFeatureCost } from '@/vue/composables/AiContent'
import { getFeatureIcon } from './utils'

import BaseBadge from '@/vue/components/common/base/Badge'
import BaseButton from '@/vue/components/common/base/Button'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import CreditBadge from '@/vue/components/common/ai/CreditBadge'
import CreditCounter from '@/vue/components/common/ai/CreditCounter'
import SvgAiSparkles from '@/vue/components/common/svg/ai/Sparkles'
import SvgCaret from '@/vue/components/common/svg/Caret'

const props = defineProps({
	feature : {
		type     : Object,
		required : true
	},
	variant : {
		type    : String,
		default : 'row'
	},
	// The hero carries the credit counter, whose tooltip holds links and a purchase button,
	// so it can't be wrapped in a click target the way a row is. It owns its own button and
	// therefore needs the reason to disable it.
	disabledReason : {
		type    : String,
		default : ''
	},
	parentComponentContext : String,
	// Optimize's price moves with whether the post needs spelling work, so its host resolves
	// it rather than letting the static costKey lookup answer.
	cost                   : {
		type    : Number,
		default : undefined
	}
})

const emit = defineEmits([ 'activate' ])

const icon = computed(() => getFeatureIcon(props.feature))

// The Image Generator's price varies by model and quality, so it quotes nothing here
// rather than a figure the run might not match.
const resolvedCost = computed(() => {
	if (undefined !== props.cost) {
		return props.cost
	}

	if (props.feature.costIsMinimum || !props.feature.costKey) {
		return 0
	}

	return getFeatureCost(props.feature.costKey)
})
</script>