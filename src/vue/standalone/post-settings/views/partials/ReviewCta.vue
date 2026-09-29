<template>
	<div
		class="aioseo-review-cta"
		:class="screenContext"
	>
		<div class="aioseo-review-cta-card">
			<div class="aioseo-review-cta-graphic">
				<svg-stars-graph />
			</div>

			<div class="aioseo-review-cta-content">
				<div class="aioseo-review-cta-heading">
					{{ strings.heading }}
				</div>

				<div class="aioseo-review-cta-body">
					{{ strings.body }}
				</div>

				<div class="aioseo-review-cta-actions">
					<base-button
						tag="a"
						type="green"
						size="medium"
						:href="ratingUrl"
						target="_blank"
						rel="noopener noreferrer"
						@click="dismiss()"
					>
						{{ strings.leaveReview }}

						<svg-external />
					</base-button>

					<a
						class="aioseo-review-cta-link"
						href="#"
						@click.prevent="dismiss(true)"
					>
						{{ strings.maybeLater }}
					</a>

					<a
						class="aioseo-review-cta-link"
						href="#"
						@click.prevent="dismiss()"
					>
						{{ strings.alreadyDid }}
					</a>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {
	usePostEditorStore,
	useSettingsStore
} from '@/vue/stores'

import BaseButton from '@/vue/components/common/base/Button'
import SvgExternal from '@/vue/components/common/svg/External'
import SvgStarsGraph from '@/vue/components/common/svg/StarsGraph'

import links from '@/vue/utils/links'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

defineProps({
	screenContext : {
		type    : String,
		default : 'metabox'
	}
})

const postEditorStore = usePostEditorStore()
const settingsStore   = useSettingsStore()

const { ratingUrl } = links

// The actions mirror the admin review notice: every explicit choice opts the user out of the
// review prompts, except the snooze, which brings the CTA back after a week.
const dismiss = (delay = false) => {
	// Hides every instance of the CTA (metabox + sidebar) via the shared store flag.
	postEditorStore.currentPost.showReviewCta = false
	settingsStore.dismissReviewCta(delay)
}

const strings = {
	heading : sprintf(
		// Translators: 1 - The plugin short name ("AIOSEO").
		__('Has %1$s helped to improve your rankings?', td),
		import.meta.env.VITE_SHORT_NAME
	),
	body : sprintf(
		// Translators: 1 - The plugin short name ("AIOSEO"), 2 - The plugin short name ("AIOSEO").
		__('Have you seen a boost in rankings, traffic, or user experience since you started optimizing your posts with %1$s? We\'d love to hear your story! Share your experience with us and other potential users of %2$s.', td),
		import.meta.env.VITE_SHORT_NAME,
		import.meta.env.VITE_SHORT_NAME
	),
	leaveReview : __('Leave a 5-star Review', td),
	maybeLater  : __('Nope, maybe later', td),
	alreadyDid  : __('I already did', td)
}
</script>

<style lang="scss">
// The root is the full-width strip that hosts the CTA; the inner card carries the pale-blue
// design. In the metabox the strip shares the tab content's background so the CTA region reads
// as a continuation of it, not as a separate metabox. In the sidebar the card runs full-bleed.
.aioseo-review-cta {
	.aioseo-review-cta-card {
		background: $blue4;
		overflow: hidden;
	}

	.aioseo-review-cta-graphic {
		position: relative;
		background: $blue;
		overflow: hidden;

		svg {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
		}
	}

	.aioseo-review-cta-content {
		padding: 20px;

		.aioseo-review-cta-heading {
			text-transform: uppercase;
			color: $blue;
			font-size: 15px;
			font-weight: 700;
			line-height: 22px;
			margin-bottom: 12px;
		}

		.aioseo-review-cta-body {
			color: $black2;
			font-size: 14px;
			line-height: 22px;
			margin-bottom: 16px;
		}

		.aioseo-review-cta-actions {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 20px;

			.aioseo-button svg {
				width: 14px;
				height: 14px;
				margin-left: 8px;
			}

			.aioseo-review-cta-link {
				color: $placeholder-color;
				font-size: 14px;
				text-decoration: underline;

				&:hover {
					color: $black2;
				}
			}
		}
	}

	// The CTA renders outside the tab content, so --aioseo-gutter here says nothing about how the
	// active tab insets its own cards. Fixed padding instead of tracking it.
	&.metabox {
		padding: 20px;
		background: $background;

		.aioseo-review-cta-card {
			display: flex;
			align-items: stretch;
			max-width: 1140px;
			border: 1px solid $border;
			border-radius: 8px;
		}

		.aioseo-review-cta-graphic {
			flex: 0 0 270px;
		}

		// Below this the content column can no longer hold the button row beside the graphic's
		// fixed basis, and the card clips it. Stack them the way the sidebar already does.
		@media screen and (max-width: 600px) {
			.aioseo-review-cta-card {
				display: block;
			}

			.aioseo-review-cta-graphic {
				height: 90px;
			}
		}

		.aioseo-review-cta-content {
			flex: 1 1 auto;
			padding: 24px 40px 24px 24px;
		}
	}

	// Narrow full-bleed layout for the Gutenberg sidebar panel. The top margin keeps the CTA from
	// ever touching the element above it.
	&.sidebar {
		margin-top: 16px;

		.aioseo-review-cta-graphic {
			height: 90px;
		}

		.aioseo-review-cta-content {
			text-align: center;

			.aioseo-review-cta-actions {
				justify-content: center;
			}
		}
	}
}
</style>