<template>
	<core-popper
		ref="popper"
		class="aioseo-truseo-locale-control"
		:class="`variant-${variant}`"
		trigger="clickToToggle"
		:visible-arrow="false"
		append-to-body
		root-class="aioseo-truseo-locale-menu-wrapper"
		@show="isOpen = true"
		@hide="isOpen = false"
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
		<div class="aioseo-truseo-locale-menu">
			<div class="aioseo-truseo-locale-menu__search">
				<svg-search class="aioseo-truseo-locale-menu__search-icon" />

				<input
					ref="searchInput"
					v-model="query"
					type="text"
					class="aioseo-truseo-locale-menu__search-input"
					:placeholder="strings.searchPlaceholder"
				>
			</div>

			<ul>
				<template
					v-for="(item, index) in filteredOptions"
					:key="index"
				>
					<li
						v-if="'divider' === item.type"
						class="aioseo-truseo-locale-menu__separator"
					></li>

					<template v-else-if="'group' === item.type">
						<li class="aioseo-truseo-locale-menu__group">{{ item.label }}</li>

						<li
							v-for="option in item.options"
							:key="option.value"
							class="aioseo-truseo-locale-menu__option aioseo-truseo-locale-menu__option--indent"
							:class="{ active: option.value === selectedValue }"
							@click="selectOption(option)"
						>
							<span class="aioseo-truseo-locale-menu__label">{{ option.label }}</span>
						</li>
					</template>

					<li
						v-else
						class="aioseo-truseo-locale-menu__option"
						:class="{ active: item.value === selectedValue }"
						@click="selectOption(item)"
					>
						<span class="aioseo-truseo-locale-menu__label">{{ item.label }}</span>

						<small
							v-if="!item.hasSpellChecker"
							class="aioseo-truseo-locale-menu__hint"
						>
							{{ strings.noSpellCheck }}
						</small>
					</li>
				</template>

				<li
					v-if="!filteredOptions.length"
					class="aioseo-truseo-locale-menu__empty"
				>
					{{ strings.noResults }}
				</li>
			</ul>

			<div
				v-if="footer"
				class="aioseo-truseo-locale-menu__footer"
			>
				{{ footer }}
			</div>
		</div>

		<template #reference>
			<button
				type="button"
				class="aioseo-truseo-locale-trigger"
			>
				<svg-globe
					v-if="showGlobe"
					class="aioseo-truseo-locale-trigger__globe"
				/>

				<span
					v-if="prefix"
					class="aioseo-truseo-locale-trigger__prefix"
				>
					{{ prefix }}
				</span>

				<span class="aioseo-truseo-locale-trigger__name">{{ triggerLabel }}</span>

				<svg-caret
					class="aioseo-truseo-locale-trigger__caret"
					:class="{ rotated: isOpen }"
				/>
			</button>
		</template>
	</core-popper>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

import { __ } from '@/vue/plugins/translations'

import CorePopper from '@/vue/components/common/core/Popper'
import SvgCaret from '@/vue/components/common/svg/Caret'
import SvgGlobe from '@/vue/components/common/svg/Globe'
import SvgSearch from '@/vue/components/common/svg/Search'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	variant : {
		type    : String,
		default : 'pill'
	},
	options : {
		type    : Array,
		default : () => []
	},
	selectedValue : {
		type    : String,
		default : ''
	},
	triggerLabel : {
		type    : String,
		default : ''
	},
	prefix : {
		type    : String,
		default : ''
	},
	footer : {
		type    : String,
		default : ''
	},
	showGlobe : {
		type    : Boolean,
		default : true
	}
})

const emit = defineEmits([ 'select' ])

const popper      = ref(null)
const searchInput = ref(null)
const isOpen      = ref(false)
const query       = ref('')

const strings = {
	noSpellCheck      : __('no spell-check', td),
	searchPlaceholder : __('Search languages…', td),
	noResults         : __('No languages found', td)
}

// Groups match on their own keywords (show every dialect) or filter to the
// dialects that match; flat languages match on their keywords.
const filteredOptions = computed(() => {
	const q       = query.value.trim().toLowerCase()
	const matches = (item) => (item.keywords || item.label || '').toLowerCase().includes(q)

	const result = props.options.reduce((acc, item) => {
		if ('group' === item.type) {
			const options = !q || matches(item) ? item.options : item.options.filter(matches)
			if (options.length) {
				acc.push(options === item.options ? item : { ...item, options })
			}
		} else if (!q || matches(item)) {
			acc.push(item)
		}

		return acc
	}, [])

	// Divider between the grouped languages and the flat ones.
	const firstFlat = result.findIndex(item => 'option' === item.type)
	if (0 < firstFlat && result.some(item => 'group' === item.type)) {
		result.splice(firstFlat, 0, { type: 'divider' })
	}

	return result
})

// Focus the field when the menu opens; clear the query on close so the full
// list is back next time.
watch(isOpen, (open) => {
	if (open) {
		// preventScroll: the popper has already placed the menu inside the viewport, so letting focus
		// scroll the input into view can only shift the page out from under the pointer.
		nextTick(() => searchInput.value?.focus({ preventScroll: true }))

		return
	}

	query.value = ''
})

const selectOption = (option) => {
	popper.value?.doClose()

	if (option.value === props.selectedValue) {
		return
	}

	emit('select', option)
}

const handleOutsideClick = (event) => {
	const root = popper.value?.$el
	// The menu is appended to a body-level portal, so it lives outside $el; treat
	// clicks inside it as inside to avoid closing before an option is selected.
	const insideMenu = event.target.closest?.('.aioseo-truseo-locale-menu')
	if (root && !root.contains(event.target) && !insideMenu) {
		popper.value?.doClose()
	}
}

// The menu carries a z-index above the admin bar so it can sit over the card. Once its trigger
// scrolls out of view the popper keeps following it, which leaves the menu floating over the admin
// bar with nothing to anchor it to. Close it instead of letting it detach.
const closeIfTriggerOffScreen = () => {
	const root = popper.value?.$el
	if (!root) {
		return
	}

	const rect      = root.getBoundingClientRect()
	// WP pins the admin bar over the top of the page, so anything beneath it is effectively hidden.
	const adminBar  = document.getElementById('wpadminbar')
	const topEdge   = adminBar ? adminBar.getBoundingClientRect().height : 0

	if (rect.bottom <= topEdge || rect.top >= window.innerHeight) {
		popper.value?.doClose()
	}
}

watch(isOpen, (open) => {
	if (open) {
		window.addEventListener('scroll', closeIfTriggerOffScreen, { passive: true })

		return
	}

	window.removeEventListener('scroll', closeIfTriggerOffScreen)
})

onMounted(() => {
	document.addEventListener('mousedown', handleOutsideClick)
})

onBeforeUnmount(() => {
	document.removeEventListener('mousedown', handleOutsideClick)
	window.removeEventListener('scroll', closeIfTriggerOffScreen)
})
</script>

<style lang="scss">
.aioseo-truseo-locale-control {
	display: inline-flex;

	&.variant-row {
		display: block;
		width: 100%;
		max-width: 100%;

		// core-popper wraps the reference (trigger) in an unclassed div; make it
		// fill the row so the button can size to the container and truncate.
		> div:not(.aioseo-truseo-locale-menu-wrapper) {
			width: 100%;
			min-width: 0;
		}

		.aioseo-truseo-locale-trigger {
			width: 100%;
			max-width: 100%;
			min-width: 0;
			box-sizing: border-box;
			justify-content: flex-start;
			overflow: hidden;
		}

		.aioseo-truseo-locale-trigger__prefix {
			flex-shrink: 0;
		}

		.aioseo-truseo-locale-trigger__name {
			flex: 0 1 auto;
		}
	}
}

.aioseo-truseo-locale-trigger {
	appearance: none;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	// !important guards against page-builder themes (e.g. Divi/Extra) whose global
	// button styles otherwise win on specificity, painting a grey fill, inflating
	// the padding, dropping the border and recoloring the label.
	padding: 6px 10px !important;
	border: 1px solid $border !important;
	border-radius: 4px;
	background: #fff !important;
	font: inherit;
	font-size: 13px;
	font-weight: $font-bold;
	color: $black !important;
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		border-color: $placeholder-color;
		background: $box-background !important;
	}

	&__globe {
		width: 15px;
		height: 15px;
		color: $placeholder-color !important;
		flex-shrink: 0;
	}

	&__prefix {
		font-weight: 500;
		color: $placeholder-color !important;
	}

	&__name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__caret {
		width: 16px;
		height: 16px;
		color: $black !important;
		flex-shrink: 0;
		margin-left: auto;
		transition: transform 0.3s;
	}
}

// In the metabox this control renders inside a <core-card> header, whose own
// toggle rule (`.header svg.aioseo-caret`: 24px, rotate -180deg / -90deg) leaks
// onto our caret through a descendant selector. Win on specificity so the caret
// stays ours: 16px, down when closed, up when open.
.aioseo-truseo-locale-control .aioseo-truseo-locale-trigger svg.aioseo-caret.aioseo-truseo-locale-trigger__caret {
	width: 16px;
	height: 16px;

	// Closed: undo the card's rotation so the chevron points down. Scoped with
	// :not(.rotated) so it out-weighs the card's [dir]-prefixed rule, which ties
	// on plain specificity.
	&:not(.rotated) {
		transform: none;
	}

	// Open: point up.
	&.rotated {
		transform: rotate(-180deg);
	}
}

.aioseo-truseo-locale-menu-wrapper {
	z-index: 200000;
}

.aioseo-truseo-locale-menu {
	// popper positions this element (position: absolute); the z-index must live
	// here, not on the static wrapper, so the menu overlaps the keyword fields.
	z-index: 200000;
	width: 250px;
	background: #fff;
	border: 1px solid $border;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(20, 27, 56, .14);
	padding: 6px;

	&__search {
		position: relative;
		margin-bottom: 6px;
	}

	&__search-icon {
		position: absolute;
		left: 9px;
		top: 50%;
		transform: translateY(-50%);
		width: 14px;
		height: 14px;
		color: $placeholder-color;
		pointer-events: none;
	}

	&__search-input {
		width: 100%;
		box-sizing: border-box;
		padding: 7px 10px 7px 30px;
		border: 1px solid $border;
		border-radius: 6px;
		font: inherit;
		font-size: 13px;
		color: $black;

		&:focus {
			outline: none;
			border-color: $blue;
			box-shadow: 0 0 0 1px $blue;
		}

		&::placeholder {
			color: $placeholder-color;
		}
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		max-height: 260px;
		overflow-y: auto;
	}

	&__group {
		padding: 8px 10px 2px;
		font-size: 11px;
		font-weight: $font-bold;
		text-transform: uppercase;
		letter-spacing: .04em;
		color: $placeholder-color;
	}

	&__empty {
		padding: 12px 10px;
		font-size: 13px;
		color: $placeholder-color;
		text-align: center;
	}

	&__separator {
		height: 1px;
		margin: 6px 8px;
		background: $border;
	}

	&__option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: $black;
		cursor: pointer;

		&:hover {
			background: $box-background;
		}

		&.active {
			background: #eef4ff;
			color: $blue;
			font-weight: $font-bold;
		}

		&--indent {
			padding-left: 22px;
		}
	}

	&__label {
		white-space: nowrap;
	}

	&__hint {
		margin-left: auto;
		color: $placeholder-color;
		font-weight: 500;
		white-space: nowrap;
	}

	&__footer {
		font-size: 11px;
		font-weight: 400;
		color: $placeholder-color;
		line-height: 1.4;
		padding: 6px 10px 4px;
		border-top: 1px solid $border;
		margin-top: 4px;
	}
}
</style>