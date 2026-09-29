<template>
	<component
		:is="currentComponent"
		:parentComponentContext="parentComponentContext"
	/>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'

import SidebarLinks from './sidebar/Links'
import MetaboxLinks from './metabox/Links'

export default {
	setup (props) {
		const screenContext = computed(() => {
			return getCurrentInstance().root.data.screenContext
		})

		const currentComponent = computed(() => {
			// Load metabox component if in metabox context OR if modal is opened
			if ('metabox' === screenContext.value || 'modal' === props.parentComponentContext) {
				return MetaboxLinks
			}

			return SidebarLinks
		})

		return {
			currentComponent
		}
	},
	components : {
		SidebarLinks,
		MetaboxLinks
	},
	props : {
		parentComponentContext : String
	}
}
</script>
<style lang="scss">
// Shared styles for both sidebar and metabox contexts
.aioseo-link-assistant,
.aioseo-modal.aioseo-link-assistant-modal {
	padding: 0 !important;

	.link-assistant-inner-table {
		padding-inline: 16px;
	}

	.aioseo-wp-table {

		tbody {
			th.check-column,
			td {
				font-size: 14px;
			}

			.date {
				font-size: 13px;
			}
		}

		tr.edit-row .edit-row-content {
			padding: 0;

			.wrapper .border {
				padding: 0;
			}

		}

		.aioseo-wp-table-header {
			row-gap: 16px;
		}

		.tablenav.top {
			margin-bottom: 16px;
		}

		button.toggle-row-button {
			display: flex;
			width: 30px;
			height: 26px;
			padding: 0;
			justify-content: center;
			align-items: center;
			background-color: white;
			border: 1px solid $gray;
			border-radius: 3px;

			&:hover {
				cursor: pointer;
				background-color: #F9F9FA;
			}

			&.active {
				background-color: $blue;
				border: 1px solid $blue;

				&:hover {
					background-color: $blue2;
				}

				svg {
					&.aioseo-caret {
						color: white;
						transform: rotate(-180deg);
					}
				}
			}

			svg {
				&.aioseo-caret {
					margin: 0;
					height: 20px;
					width: 20px;
					transform: rotate(-90deg);
					color: $placeholder-color;
					transition: transform 0.3s;
				}
			}
		}

		.row-actions {
			a {
				font-size: 13px;
				line-height: 150%;

				&.delete-all-links {
					color: $red;
				}
			}
		}

		svg {
			margin-right: 11.22px;

			&.aioseo-link-external {
				color: $blue;
				width: 10.5px;
				height: 10.5px;
			}
			&.aioseo-new-page {
				color: $black2;
				width: 9.33px;
				height: 11.67px;
			}
		}
	}

	.aioseo-tooltip .popper.action {
		a.tooltip-url {
			white-space: normal !important;
		}
	}

	.aioseo-wp-table.link-assistant-inner-table {

		.wp-table table {

			tbody {
				.aioseo-tooltip {
					display: inline-block;
					margin-left: 0;
				}

				svg {
					&.aioseo-trash {
						width: 18px;
						height: 22px;
						color: $placeholder-color;
						cursor: pointer;
						transition: color 0.1s ease;
						margin-top: 2px;

						&:hover {
							color: $red;
						}
					}
				}
			}
		}
	}

	.aioseo-tabs {
		&.link-tabs {
			border-bottom: 1px solid $border;
			background-color: white;

			.aioseo-mobile-tabs {
				margin-left: 10px;
			}

			.var-tab {
				display: flex;
				align-items: center;
				column-gap: 11.75px;
			}

			svg {
				width: 11px;
				height: 11px;
				margin-top: 3px;
				margin-right: 0;

				&.aioseo-link-internal-inbound,
				&.aioseo-link-internal-outbound {
					color: $green;
				}
				&.aioseo-link-external {
					color: $blue;
				}
				&.aioseo-link-affiliate {
					color: $orange;
					width: 12px;
					height: 12px;
					margin-top: 2px;
				}
				&.aioseo-link-suggestion {
					color: $black2-hover;
					width: 16.67px;
					height: 8.33px;
				}
			}
		}

		svg {
			display: inline-block !important;
		}
	}

	div.links-bottom {
		display: flex;
		flex-direction: row;

		&:has(a,button) {
			padding: 17px 17px 24px 17px;
		}

		a {
			text-decoration: underline;

			&.link-delete {
				color: $red !important;
			}

			&:hover{
				text-decoration: none;
				cursor: pointer;
			}
		}

		.links-bottom-left {
			display: flex;
			flex: 1 1 auto;
			column-gap: 28px;
			align-items: center;
			div {
				display:flex;
				align-items: center;
				svg {
					margin-right: 10px;
				}
			}

			button {
				svg {
					margin-top: 2.5px;
					margin-right: 10px;
					width: 14px;
					height: 14px;
					color: white;
				}
			}

			svg.aioseo-link-external {
				margin-top: 3.5px;
				width: 11px;
				height: 11px;
				color: $blue;
			}
		}

		.links-bottom-right {
			display: flex;
			align-items: center;
		}
	}
}

.aioseo-modal.aioseo-link-assistant-modal {
	.modal-wrapper .modal-container {
		max-width: 1300px;
	}

	.modal-body {
		align-items: start;
		padding: 0 0 20px !important;

		.title-header {
			margin: 45px 0 0 0;
			align-self: start;
			span {
			font-weight: bold;
			font-size: 20px;
			line-height: 140%;
			color: $black;
			}
		}
	}
}

@media (max-width: 1500px) {
	.aioseo-modal.aioseo-link-assistant-modal {
		.modal-wrapper .modal-container {
			max-width: 1000px;
		}
	}
}

@media (max-width: 1150px) {
	.aioseo-modal.aioseo-link-assistant-modal {
		.modal-wrapper .modal-container {
			max-width: 750px;

			.modal-body {
				padding: 0 50px 50px;
			}
		}
	}
}
</style>