<template>
	<core-popper
		:classes="[
			'aioseo-tooltip'
		]"
		:trigger="trigger"
		:force-show="forceShow"
		:disabled="disabled"
		append-to-body
		:options="{
			placement,
			modifiers : {
				flip: {
					enabled : flip
				},
				preventOverflow : {
					// Keep the tooltip inside the viewport. It's appended to the body,
					// so escaping the boundary would extend the document and spawn a
					// scrollbar — which reflows the page into a show/hide flicker loop.
					escapeWithReference : false,
					boundariesElement : 'viewport'
				},
				offset : {
					offset : offset
				}
			}
		}"
	>
		<span
			class="popper"
			:class="{ [type]: type }"
			:style="{
				zIndex
			}"
		>
			<component
				:is="tag"
				v-if="tooltip"
			>{{ tooltip }}</component>

			<slot name="tooltip" />
		</span>

		<template #reference>
			<slot />
		</template>
	</core-popper>
</template>

<script>
import CorePopper from '@/vue/components/common/core/Popper'
export default {
	components : {
		CorePopper
	},
	props : {
		tooltip   : String,
		type      : String,
		disabled  : Boolean,
		placement : {
			type : String,
			default () {
				return 'top'
			}
		},
		trigger : {
			type : String,
			default () {
				return 'hover'
			}
		},
		forceShow : {
			type : Boolean,
			default () {
				return false
			}
		},
		tag : {
			type : String,
			default () {
				return 'span'
			}
		},
		offset : {
			type : String,
			default () {
				return '0,0'
			}
		},
		flip : {
			type : Boolean,
			default () {
				return false
			}
		},
		zIndex : String
	}
}
</script>

<style lang="scss">
.aioseo-tooltip {
	margin-left: 12px;
	display: inline-flex;
	align-items: center;
	justify-content: center;

	> div:nth-of-type(2) {
		display: flex;
	}
}
</style>