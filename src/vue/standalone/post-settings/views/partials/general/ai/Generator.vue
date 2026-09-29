<template>
	<div class="aioseo-ai-generator">
		<core-tooltip
			type="action"
			:offset="'-30px,0'"
		>
			<button
				type="button"
				@click="onClick"
			>
				<svg-ai-content
					width="18"
					height="18"
				/>
			</button>

			<template #tooltip>
				{{ strings.useAiGenerator }}
			</template>
		</core-tooltip>

		<component
			:is="`${feature.slug}-modal`"
			:feature="feature"
			:show="showModal"
			@closeModal="showModal = false"
		/>

		<out-of-credits-modal
			:show="showOutOfCreditsModal"
			:feature="upsellFeature"
			@close="showOutOfCreditsModal = false"
		/>
	</div>
</template>

<script>
import { toRef } from 'vue'

import { useAiFeatureGate } from '@/vue/composables/AiFeatureGate'

import {
	useSettingsStore
} from '@/vue/stores'

import CoreTooltip from '@/vue/components/common/core/Tooltip'
import OutOfCreditsModal from '@/vue/components/common/ai/OutOfCreditsModal'
import SvgAiContent from '@/vue/components/common/svg/ai/AiContent'

import MetaTitleModal from '@/vue/standalone/post-settings/views/partials/ai-content/MetaTitleModal'
import MetaDescriptionModal from '@/vue/standalone/post-settings/views/partials/ai-content/MetaDescriptionModal'

import { __ } from '@/vue/plugins/translations'
const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	setup (props) {
		const { shouldUpsell, upsellFeature } = useAiFeatureGate(toRef(props, 'feature'))

		return {
			settingsStore : useSettingsStore(),
			shouldUpsell,
			upsellFeature
		}
	},
	components : {
		CoreTooltip,
		MetaTitleModal,
		MetaDescriptionModal,
		OutOfCreditsModal,
		SvgAiContent
	},
	props : {
		feature : {
			type     : Object,
			required : true
		}
	},
	data () {
		return {
			strings : {
				useAiGenerator : __('Use AI Generator', td)
			},
			showModal             : false,
			showOutOfCreditsModal : false
		}
	},
	methods : {
		// The same gate the AI Copilot tab applies, so an unaffordable run sells from here too
		// instead of opening a generator whose only button is disabled.
		onClick () {
			if (this.shouldUpsell) {
				this.showOutOfCreditsModal = true

				return
			}

			this.showModal = true
		}
	}
}
</script>

<style lang="scss">
.aioseo-post-general {
	.aioseo-ai-generator {
		button {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 6px !important;

			svg {
				width: 18px;
				height: 18px;
				color: $black;

				&:hover {
					color: $black2;
				}
			}
		}
	}

	.snippet-title-row {
		.aioseo-editor .aioseo-editor-single .ql-editor {
			padding: 7px 55px 7px 10px;
		}
	}

	.snippet-description-row {
		.aioseo-editor .ql-editor {
			padding: 15px 55px 15px 15px;
		}
	}
}
</style>