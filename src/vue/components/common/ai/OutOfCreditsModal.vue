<template>
	<core-modal
		:show="show"
		:classes="[ 'aioseo-out-of-credits-modal' ]"
		@close="emit('close')"
	>
		<template #headerTitle>
			<div class="aioseo-out-of-credits-modal__title">
				<svg-circle-exclamation />

				{{ strings.title }}
			</div>
		</template>

		<template #body>
			<div class="aioseo-modal-body">
				<out-of-credits-upsell :feature="feature" />
			</div>
		</template>
	</core-modal>
</template>

<script setup>
import CoreModal from '@/vue/components/common/core/modal/Index'
import OutOfCreditsUpsell from '@/vue/components/common/ai/OutOfCreditsUpsell'
import SvgCircleExclamation from '@/vue/components/common/svg/circle/Exclamation'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

defineProps({
	feature : {
		type     : Object,
		required : true
	},
	show : {
		type    : Boolean,
		default : false
	}
})

const emit = defineEmits([ 'close' ])

const strings = {
	title : __('You\'re out of AI credits', td)
}
</script>

<style lang="scss">
.aioseo-out-of-credits-modal {
	.modal-wrapper .modal-container {
		max-width: 520px;
	}

	&__title {
		display: flex;
		align-items: center;
		gap: 9px;
		font-weight: $font-bold;

		svg {
			width: 20px;
			height: 20px;
			color: $orange;
		}
	}

	.aioseo-modal-body {
		padding: 20px;
	}
}
</style>