<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarSocial from './sidebar/Social'
import MetaboxSocial from './metabox/Social'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxSocial
			}

			return SidebarSocial
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarSocial,
		MetaboxSocial
	},
	props : {
		parentComponentContext : String
	}
}
</script>
<style lang="scss">
// Shared styles for both sidebar and metabox contexts
.aioseo-post-social {

	.aioseo-row {
		&:has(.no-name) {
			row-gap: 0;
		}
	}

	.aioseo-col.col-md-9 {
		position: relative;
	}

	.aioseo-tabs {
		background: #fff!important;
		border: none!important;
		border-bottom: 2px solid $border !important;
	}

	svg.aioseo-pencil {
		width: 12px;
		height: 12px;
		color: $black2;
	}

	.aioseo-select .multiselect__tags {
		padding: 9px 40px 9px 16px;
	}
}

// Modal-specific styles
.aioseo-modal-content {

	.tab-facebook,
	.tab-twitter {

		.aioseo-html-tags-editor .aioseo-description {
			display: none;
		}
	}
}
</style>

<style lang="scss">
.aioseo-post-social {

	.aioseo-row {
		&:has(.no-name) {
			row-gap: 0;
		}
	}

	.aioseo-col.col-md-9 {
		position: relative;
	}

	.aioseo-tabs {
		background: #fff!important;
		border: none!important;
		border-bottom: 2px solid $border !important;
	}

	svg.aioseo-pencil {
		width: 12px;
		height: 12px;
		color: $black2;
	}

	.aioseo-select .multiselect__tags {
		padding: 9px 40px 9px 16px;
	}
}

.aioseo-modal-content {

	.tab-facebook,
	.tab-twitter {

		.aioseo-html-tags-editor .aioseo-description {
			display: none;
		}
	}
}
</style>