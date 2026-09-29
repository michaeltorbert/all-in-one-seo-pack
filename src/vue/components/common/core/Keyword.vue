<template>
	<div
		class="aioseo-keyword"
		:class="{ 'aioseo-keyword--expanded': displayItems }"
	>
		<div class="aioseo-keyword-row">
			<core-tooltip
				:type="keyword.isFocus ? '' : 'action'"
				class="aioseo-keyword-focus"
			>
				<button
					type="button"
					class="aioseo-keyword-focus__btn"
					:class="{ 'is-active': keyword.isFocus || focusHovered, 'is-focus': keyword.isFocus }"
					@click.stop="onFocusClick()"
					@mouseenter="focusHovered = true"
					@mouseleave="focusHovered = false"
				>
					<svg-target />
				</button>

				<template #tooltip>
					{{ keyword.isFocus ? strings.focusKeyword : strings.setAsFocus }}
				</template>
			</core-tooltip>

			<span
				v-if="!edit"
				class="aioseo-keyword-name"
				:class="{ 'is-clickable': keyword?.hasItems }"
				@click="toggleItems()"
			>
				{{ keyword.word }}
			</span>

			<input
				v-else
				ref="editInput"
				class="aioseo-keyword-name-input"
				:value="keyword.word"
				@click.stop
				@blur="closeEdit"
				@keydown.enter="pressEnter"
			/>

			<span
				class="aioseo-keyword-score"
				:class="scoreClass(keyword.score)"
			>
				{{ keyword.score }}
			</span>

			<core-popper
				ref="actionsPopper"
				class="aioseo-keyword-more-wrap"
				trigger="clickToToggle"
				append-to-body
				:visible-arrow="false"
				root-class="aioseo-keyword-menu-wrapper"
				:options="{
					placement : 'bottom-end',
					modifiers : {
						preventOverflow : {
							escapeWithReference : true
						},
						offset : {
							offset : '0,6'
						}
					}
				}"
			>
				<div
					ref="actionsMenu"
					class="aioseo-keyword-menu"
				>
					<button
						type="button"
						class="aioseo-keyword-menu__item"
						@click="onRankTracker"
					>
						<svg-statistics />
						<span>{{ strings.rankTracker }}</span>
					</button>

					<button
						type="button"
						class="aioseo-keyword-menu__item"
						@click="onEdit"
					>
						<svg-pencil />
						<span>{{ strings.edit }}</span>
					</button>

					<button
						type="button"
						class="aioseo-keyword-menu__item aioseo-keyword-menu__item--danger"
						@click="onRemove"
					>
						<svg-trash />
						<span>{{ strings.remove }}</span>
					</button>
				</div>

				<template #reference>
					<button
						type="button"
						class="aioseo-keyword-more"
						:aria-label="strings.moreActions"
					>
						<svg-more />
					</button>
				</template>
			</core-popper>

			<button
				v-if="keyword?.hasItems"
				type="button"
				class="aioseo-keyword-caret"
				:class="{ rotated: displayItems }"
				@click.stop="toggleItems()"
			>
				<svg-caret />
			</button>
		</div>

		<div
			v-if="keyword?.hasItems"
			class="aioseo-keyword-items"
		>
			<transition-slide
				tag="div"
				class="wrapper"
				:active="displayItems"
			>
				<metabox-analysis-detail
					:analysisItems="keyword.items"
				/>
			</transition-slide>
		</div>
	</div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
	useKeywordRankTrackerStore
} from '@/vue/stores'

import CorePopper from '@/vue/components/common/core/Popper'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import SvgCaret from '@/vue/components/common/svg/Caret'
import SvgMore from '@/vue/components/common/svg/More'
import SvgPencil from '@/vue/components/common/svg/Pencil'
import SvgStatistics from '@/vue/components/common/svg/Statistics'
import SvgTarget from '@/vue/components/common/svg/Target'
import SvgTrash from '@/vue/components/common/svg/Trash'
import TransitionSlide from '@/vue/components/common/transition/Slide'
import MetaboxAnalysisDetail from '@/vue/standalone/post-settings/views/partials/general/MetaboxAnalysisDetail'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	keyword : {
		type : Object
	},
	displayItems : {
		type    : Boolean,
		default : false
	}
})

const emit = defineEmits([ 'deleted', 'toggleItems', 'setFocus', 'updated' ])

const keywordRankTrackerStore = useKeywordRankTrackerStore()

const edit = ref(false)
const editInput = ref(null)
const focusHovered = ref(false)
const actionsPopper = ref(null)
const actionsMenu = ref(null)
const strings = {
	remove       : __('Remove', td),
	edit         : __('Edit', td),
	rankTracker  : __('Rank Tracker', td),
	moreActions  : __('More actions', td),
	focusKeyword : __('Your focus keyword. This is the primary keyword that you want to rank for with this post.', td),
	setAsFocus   : __('Set as focus keyword', td)
}

const scoreClass = (score) => {
	if (79 < score) {
		return 'score-green'
	}

	if (49 < score) {
		return 'score-orange'
	}

	if (0 < score) {
		return 'score-red'
	}

	return 'score-none'
}

const onFocusClick = () => {
	if (props.keyword.isFocus) {
		return
	}

	emit('setFocus', props.keyword.id)
}

const toggleItems = () => {
	if (!props.keyword?.hasItems) {
		return
	}

	emit('toggleItems', props.keyword.id)
}

const editKeyword = () => {
	edit.value = true
	nextTick(() => {
		editInput.value?.focus()
		editInput.value?.select()
	})
}

const deleteKeyword = () => {
	edit.value = false
	emit('deleted', props.keyword.id)
}

const onRankTracker = () => {
	actionsPopper.value?.doClose()
	keywordRankTrackerStore.toggleModal({ modal: 'modalOpenPostEdit', open: true })
}

const onEdit = () => {
	actionsPopper.value?.doClose()
	editKeyword()
}

const onRemove = () => {
	actionsPopper.value?.doClose()
	deleteKeyword()
}

const closeEdit = (event) => {
	const value = event.target?.value.trim()

	edit.value = false

	if (!value) {
		deleteKeyword()
		return
	}

	emit('updated', { id: props.keyword.id, word: value })
}

const pressEnter = (event) => {
	event.preventDefault()
	// Blur commits the value through closeEdit (also the leave-focus path).
	event.target.blur()
}

// The menu is appended to the body-level popper portal, so it isn't a
// descendant of the popper's `$el`; check the teleported node too. Popper's own
// document-click close doesn't fire reliably here (see TruSeoLocaleControl).
const handleOutsideClick = (event) => {
	const reference = actionsPopper.value?.$el
	const menu = actionsMenu.value

	if ((reference && reference.contains(event.target)) || (menu && menu.contains(event.target))) {
		return
	}

	actionsPopper.value?.doClose()
}

onMounted(() => {
	document.addEventListener('mousedown', handleOutsideClick)
})

onBeforeUnmount(() => {
	document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<style lang="scss">
.aioseo-keyword {
	border-top: 1px solid $border;

	&:first-child {
		border-top: none;
	}

	// core-tooltip's base `.aioseo-tooltip` adds a 12px left margin; the row's own
	// gap handles spacing, so zero it (keeps the star flush-left and actions tight).
	.aioseo-tooltip {
		margin: 0;
	}

	&-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
	}

	&-focus {
		display: inline-flex;
		flex-shrink: 0;
		margin: 0;

		&__btn {
			appearance: none;
			border: 0;
			// !important guards against page-builder themes (e.g. Divi/Extra) whose
			// global button styles otherwise win on specificity: the fill paints a grey
			// box, the padding inflates the row height, and the color hides the icon.
			background: none !important;
			padding: 0 !important;
			display: inline-flex;
			align-items: center;
			cursor: pointer;
			color: #c7cad1 !important;

			&.is-active {
				color: $blue !important;
			}

			&.is-focus {
				cursor: default;
			}

			svg {
				width: 16px;
				height: 16px;
			}
		}
	}

	&-name {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		color: $black;

		&.is-clickable {
			cursor: pointer;
		}
	}

	&-name-input {
		flex: 1 1 auto;
		min-width: 0;
		padding: 4px 8px;
		border: 1px solid $border;
		border-radius: 3px;
		font-size: 13px;
	}

	&-score {
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 700;

		&.score-green {
			color: $green;
		}

		&.score-orange {
			color: $orange;
		}

		&.score-red {
			color: $red;
		}

		&.score-none {
			color: $placeholder-color;
		}
	}

	&-more-wrap {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	&-more {
		appearance: none;
		border: 0;
		// !important guards against page-builder themes (e.g. Divi/Extra) whose global
		// button styles otherwise paint a grey fill and, worse, override the icon
		// color so the three dots disappear against the panel.
		background: none !important;
		padding: 0 !important;
		width: 20px;
		height: 20px;
		// Block-level (not inline-flex) so the button doesn't sit on the wrapping
		// <div>'s text baseline, which would add descender space above the icon.
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: $placeholder-color !important;
		border-radius: 4px;

		&:hover {
			color: $black !important;
			background: $box-background !important;
		}

		svg {
			width: 18px;
			height: 18px;
		}
	}

	&-caret {
		appearance: none;
		border: 0;
		// !important guards against page-builder themes (e.g. Divi/Extra) whose global
		// button styles otherwise paint a grey fill, inflate the row via padding, and
		// override the caret color.
		background: none !important;
		padding: 0 !important;
		flex-shrink: 0;
		display: inline-flex;
		cursor: pointer;
		color: $placeholder-color !important;

		svg {
			width: 20px;
			height: 20px;
			transform: rotate(-90deg);
			transition: transform 0.3s ease;
		}

		&.rotated svg {
			transform: rotate(0deg);
		}
	}

	&-items {
		.aioseo-analysis-detail {
			border-top: 1px solid $border;
			padding-top: 12px !important;
			padding-bottom: 12px !important;
		}
	}
}

// The menu teleports into the body-level popper portal, so it can't be nested
// under `.aioseo-keyword` — it's no longer a descendant of the row once shown.
.aioseo-keyword-menu-wrapper {
	z-index: 200000;
}

.aioseo-keyword-menu {
	z-index: 200000;
	min-width: 180px;
	// This menu teleports to the body-level popper portal, so a page-builder theme's
	// global styles reach it; !important keeps the panel white instead of grey.
	background: #fff !important;
	border: 1px solid $border;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(20, 27, 56, .14);
	padding: 6px;

	&__item {
		appearance: none;
		border: 0;
		background: none !important;
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: $black;
		cursor: pointer;
		text-align: left;

		&:hover {
			background: $box-background !important;
		}

		svg {
			width: 16px;
			height: 16px;
			color: $placeholder-color;
			flex-shrink: 0;
		}

		&--danger {
			color: $red;

			svg {
				color: $red;
			}

			&:hover {
				background: rgba($red, .08) !important;
			}
		}
	}
}
</style>