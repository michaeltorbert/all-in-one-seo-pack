<template>
	<component
		:is="currentComponent"
		:disabled="disabled"
		:parentComponentContext="parentComponentContext"
		@changeTab="newTab => $emit('changeTab', newTab)"
	/>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

import SidebarGeneral from './sidebar/General'
import MetaboxGeneral from './metabox/General'

defineEmits([ 'changeTab' ])

const props = defineProps({
	disabled : {
		type : Boolean,
		default () {
			return false
		}
	},
	parentComponentContext : String
})

const screenContext = computed(() => {
	return getCurrentInstance().root.data.screenContext
})

const currentComponent = computed(() => {
	// Load metabox component if in metabox context OR if modal is opened
	if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
		return MetaboxGeneral
	}

	return SidebarGeneral
})
</script>

<style lang="scss">
.aioseo-post-general {
	.aioseo-tooltip {
		line-height: normal;
		vertical-align: middle;

		:has(.aioseo-circle-question-mark) {
			display: inline-flex;
		}
	}

	svg.aioseo-circle-question-mark {
		width: 17px;
		height: 17px;
		color: $placeholder-color;
	}

	svg.aioseo-pencil {
		width: 12px;
		height: 12px;
		color: $black2;
	}

	.edit-snippet,
	.add-keyphrase {
		margin-top: 12px;
		border: 1px solid $gray;

		svg {
			margin-right: 11px;
		}
	}

	.disabled-button {
		margin-top: 12px;
		border: 1px solid #dcdde1;
		color: #8c8f9a;
		background-color: #f3f4f5;
		cursor: default;
		height: 40px;
		font-size: 14px;
		padding: 0 12px;
		flex-shrink: 0;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		border-radius: 4px;
		appearance: none;
		-webkit-appearance: none;
		transition: background-color .2s ease;
		position: relative;
		overflow: hidden;
		text-decoration: none;
		white-space: nowrap;

		svg {
			margin-right: 11px;
		}
	}

	.aioseo-analysis-detail {
		margin: 16px 0;

		&:last-child {
			margin-bottom: 0;
		}

		+ .aioseo-tooltip {
			margin-left: 0;

			.add-keyphrase {
				margin-top: 4px;
			}
		}
	}

	.analysis-wrapper {
		border-top: 1px solid $border;
	}

	.analysis-loading {
		position: relative;
		margin-top: 16px;
		margin-bottom: 16px;
	}

	.meta-keywords-alert {
		margin-bottom: 20px;
	}

	.snippet-description-row {
		.aioseo-modal-content & {
			border: none;
			margin-bottom: 0 !important;
			padding-bottom: 0 !important;
		}
	}

	.snippet-preview-row {
		.snippet-preview-row-label {
			vertical-align: middle;
		}

		.aioseo-google-search-preview {
			border: 1px solid $input-border;
			border-radius: 3px;
			padding: 10px;
			max-width: 610px;

			&--mobile {
				max-width: 375px;
			}
		}

		.settings-name .name {
			align-items: start;
			flex-direction: column;
			gap: 12px;
			white-space: nowrap;

			.aioseo-modal-content & {
				align-items: center;
				display: grid;
				grid-template-columns: auto 1fr;
				justify-items: end;
			}

			.aioseo-radio-toggle {
				gap: 10px;
			}
		}

		.edit-post-sidebar &,
		.editor-sidebar & {
			padding-bottom: 0 !important;
			border-bottom: none;
		}
	}

	.aioseo-alert {
		margin-bottom: 5px;

		&.inline-upsell {
			margin-top: 10px;
		}
	}

	.popper {
		max-width: 260px !important;
	}
}
</style>