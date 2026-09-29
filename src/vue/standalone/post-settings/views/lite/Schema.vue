<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarSchema from './sidebar/Schema'
import MetaboxSchema from './metabox/Schema'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxSchema
			}

			return SidebarSchema
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarSchema,
		MetaboxSchema
	},
	props : {
		parentComponentContext : String
	}
}
</script>

<style lang="scss">
// Shared styles for both sidebar and metabox contexts
.aioseo-post-schema {

	.no-graphs {
		margin-bottom: 15px;
	}

	.graphs {
		max-width: 1000px;
		margin-bottom: 20px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 20px 16px;

		&:empty {
			display: none;
		}
	}

	.buttons {
		margin-top: 20px;

		&.no-margin {
			margin-top: 0;
		}

		button {
			margin-right: 8px;
		}

		&:has(.no-graphs) {
			margin-top: 0;
		}
	}

	&.sidebar {
		div.sidebar-description {
			margin-bottom: 15px;
		}

		.graphs {
			display: block;

			.graph {
				margin: 0 0 12px 0;
			}
		}

		.buttons {
			button {
				width: 100%;

				&:not(:first-of-type) {
					margin-top: 8px;
				}
			}
		}
	}
}

.aioseo-modal.aioseo-post-schema-modal-cta {
	.modal-wrapper {
		.modal-container {
			max-width: 1000px;
			overflow: visible;

			.modal-header {
				padding: 0 0 0 18px;

				display: flex;
				align-items: center;
			}

			.modal-body {
				position: unset;
			}

			svg.aioseo-circle-question-mark {
				width: 16px;
				height: 16px;
				color: $placeholder-color;

				&:hover {
					cursor: pointer;
				}
			}
		}
	}
}

.aioseo-post-schema,
.aioseo-modal.aioseo-post-schema-modal,
.aioseo-modal.aioseo-post-schema-modal-cta {
		svg {
		&.aioseo-article,
		&.aioseo-dataset,
		&.aioseo-custom-schema,
		&.aioseo-web-page {
			width: 12.50px;
			height: 12.50px;
		}

		&.aioseo-book {
			width: 15px;
			height: 11px;
		}

		&.aioseo-course {
			width: 15px;
			height: 12.5px;
		}

		&.aioseo-event {
			width: 15px;
			height: 12px;
		}

		&.aioseo-faq-page {
			width: 14px;
			height: 14px;
		}

		&.aioseo-fact-check {
			margin-top: 2px;
			width: 14px;
			height: 11px;
		}

		&.aioseo-how-to {
			width: 12.5px;
			height: 14.5px;
		}

		&.aioseo-job-posting {
			width: 14px;
			height: 13.5px;
		}

		&.aioseo-movie {
			width: 14px;
			height: 11.2px;
		}

		&.aioseo-music {
			width: 8.5px;
			height: 12.5px;
		}

		&.aioseo-person {
			width: 11.2px;
			height: 11.5px;
		}

		&.aioseo-product {
			width: 13.2px;
			height: 13.5px;
		}

		&.aioseo-recipe {
			width: 12.7px;
			height: 13.7px;
		}

		&.aioseo-restaurant {
			width: 10.75px;
			height: 13.6px;
		}

		&.aioseo-service {
			width: 14.75px;
			height: 14.1px;
		}

		&.aioseo-software {
			width: 13.85px;
			height: 11.2px;
		}

		&.aioseo-video {
			width: 13.8px;
			height: 11.15px;
		}
	}
}

.aioseo-post-schema-confirmation-modal,
.aioseo-post-schema-naming-modal {
	.modal-container {
		max-width: 650px !important;
	}

	.aioseo-button:not(.close) {
		margin-top: 16px;
	}

	.aioseo-modal-body {
		padding: 20px 40px 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		position: relative;
	}

	h3 {
		font-size: 20px;
		margin-bottom: 16px;
		text-align: center;
	}

	.reset-description {
		font-size: 16px;
		color: $black;
		margin-bottom: 16px;
		text-align: center;
		max-width: 515px;
	}

	button.close {
		position: absolute;
		right: 11px;
		top: 11px;
		width: 24px;
		height: 24px;
		background-color: #fff;
		border: none;
		display: flex;
		align-items: center;

		svg.aioseo-close {
			cursor: pointer;
			width: 14px;
			height: 14px;
		}
	}

	.aioseo-description {
		max-width: 510px;
		text-align: center;
	}
}
</style>