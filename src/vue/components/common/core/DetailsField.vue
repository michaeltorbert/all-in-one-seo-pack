<template>
	<div
		v-if="!editing"
		class="aioseo-details-column__field"
		:class="{ 'aioseo-details-column__field--labelled': labelled }"
	>
		<span
			v-if="labelled"
			class="aioseo-details-column__flabel"
		>{{ label }}</span>

		<core-tooltip
			v-if="!labelled"
			class="aioseo-details-column__dot-tooltip"
		>
			<span
				class="aioseo-details-column__dot"
				:class="`aioseo-details-column__dot--${isCustom ? 'custom' : 'default'}`"
			/>

			<template #tooltip>
				{{ isCustom ? customTooltip : defaultTooltip }}
			</template>
		</core-tooltip>

		<core-tooltip
			v-if="hasText"
			class="aioseo-details-column__tooltip"
		>
			<span :class="valueClass">
				{{ parsed }}
			</span>

			<template #tooltip>
				<strong>{{ label }}:</strong>
				{{ parsed }}
			</template>
		</core-tooltip>

		<span
			v-else
			:class="valueClass"
		>{{ emptyValue }}</span>

		<core-loader
			v-if="loading"
			dark
		/>

		<core-tooltip
			v-if="length"
			class="aioseo-details-column__len-tooltip"
		>
			<span
				class="aioseo-details-column__len"
				:class="`aioseo-details-column__len--${length.rating}`"
			>
				{{ length.count }}{{ length.suffix }}
			</span>

			<template #tooltip>
				{{ length.tooltip }}
			</template>
		</core-tooltip>

		<svg-pencil @click.prevent="emit('edit')" />
	</div>

	<div
		v-else
		class="aioseo-details-column__editor"
	>
		<core-html-tags-editor
			:model-value="modelValue"
			:line-numbers="false"
			:single="single"
			:tags-context="tagsContext"
			default-menu-orientation="bottom"
			tags-description=""
			:default-tags="defaultTags"
			@update:model-value="emit('update:modelValue', $event)"
		/>

		<div class="aioseo-details-column__editor-actions">
			<base-button
				type="gray"
				size="small"
				@click.prevent="emit('cancel')"
			>
				{{ strings.cancel }}
			</base-button>

			<base-button
				type="blue"
				size="small"
				@click.prevent="emit('save')"
			>
				{{ strings.save }}
			</base-button>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'

import BaseButton from '@/vue/components/common/base/Button'
import CoreHtmlTagsEditor from '@/vue/components/common/core/HtmlTagsEditor'
import CoreLoader from '@/vue/components/common/core/Loader'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import SvgPencil from '@/vue/components/common/svg/Pencil'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	// The raw stored value, edited in place. Empty means the default is in effect.
	modelValue : {
		type    : String,
		default : ''
	},
	// The value as the visitor would see it, with tags resolved.
	parsed : {
		type    : String,
		default : ''
	},
	label : {
		type     : String,
		required : true
	},
	isCustom : Boolean,
	editing  : Boolean,
	loading  : Boolean,
	// Media rows are only ~235px wide, so there the label sits above the value instead of
	// a dot sitting beside it.
	labelled : Boolean,
	// Titles are one line; descriptions wrap.
	single   : Boolean,
	// { rating, count, suffix, tooltip }, or null to hide the counter entirely.
	length   : {
		type    : Object,
		default : null
	},
	tagsContext : {
		type    : String,
		default : ''
	},
	defaultTags : {
		type    : Array,
		default : () => []
	},
	customTooltip : {
		type    : String,
		default : ''
	},
	defaultTooltip : {
		type    : String,
		default : ''
	},
	// An unset field would otherwise be a bare dot next to a bare pencil, which reads as
	// broken rather than empty. Terms hit this often, since term descriptions are usually blank.
	emptyValue : {
		type    : String,
		default : '\u2014'
	}
})

const emit = defineEmits([ 'update:modelValue', 'edit', 'save', 'cancel' ])

const strings = {
	cancel : __('Cancel', td),
	save   : __('Save', td)
}

// An empty value gets no tooltip — there'd be nothing in it but the label.
const hasText    = computed(() => !!(props.parsed && String(props.parsed).trim()))
const valueClass = computed(() => [
	'aioseo-details-column__value',
	props.single ? 'aioseo-details-column__value--single' : ''
])
</script>
<style lang="scss">
// The editor and its actions used to sit in .edit-row, whose styles stayed behind in
// PostColumn when the field moved here.
.aioseo-details-column__editor {
	margin-bottom: 10px;

	.aioseo-html-tags-editor {
		margin-bottom: 4px;

		.ql-editor,
		.aioseo-add-template-tag {
			background: $white;
		}

		@media (max-width: 1300px) {
			.add-tags {
				flex-direction: column;
				align-items: start;
			}
		}

		.aioseo-emoji-picker em-emoji-picker {
			right: 0;
			left: auto;
		}
	}
}

.aioseo-details-column__editor-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 8px 0 2px;

	// Stacked full-width at this breakpoint, so the row gap becomes the vertical one.
	@media screen and (max-width: 1366px) {
		.aioseo-button {
			width: 100%;
		}
	}
}
</style>