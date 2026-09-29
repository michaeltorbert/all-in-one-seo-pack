<template>
	<draggable
		class="aioseo-toc-list"
		:class="[
			{ 'orderable' : allowReorder }
		]"
		v-bind="dragOptions"
		handle=".aioseo-drag-handle"
		:list="props.headings"
		@change="(value) => setReorder(value)"
		:item-key="(element) => element?.id || element.blockClientId"
	>
		<template #item="{element}">
			<li
				:class="[
					'aioseo-toc-list-item',
					{ 'heading-hidden' : element.hidden }
				]"
			>
				<div class="aioseo-toc-list-item__inner">
					<button
						class="aioseo-drag-handle has-icon"
						v-if="allowReorder"
					>
						<svg-drag />
					</button>

					<base-input
						class="row-input row-input--content"
						:modelValue="element.editedContent || element.content"
						@update:modelValue="value => setEditedContent(value, element)"
						:placeholder="element.content"
					>
						<template #append-icon>
							<div
								class="append-icon"
								v-if="!allowReorder"
								@click.native="handleAnchorInput"
							>
								<svg-toc-link />
							</div>
						</template>
					</base-input>

					<base-input
						v-if="!allowReorder"
						class="row-input row-input--anchor"
						:spellcheck=false
						:modelValue="element.anchor"
						@update:modelValue="value => setAnchor(value, element)"
					>
						<template #append-icon>
							<div class="append-icon">
								<core-tooltip>
									<div>
										<svg-info />
									</div>

									<template #tooltip>
										<p class="aioseo-tooltip__header">{{strings.tooltipHeader}}</p>

										<p>{{strings.tooltipDescription}}</p>
									</template>
								</core-tooltip>

								<div @click.native="handleAnchorInput">
									<svg-close />
								</div>
							</div>
						</template>
					</base-input>

					<button
						v-if="!allowReorder"
						:class="[
							{ 'active' : element.hidden },
							'aioseo-hide-heading-toggle',
							'has-icon'
						]"
						@click="setHiddenStatus(element)"
					>
						<svg-eye-off v-if="element.hidden" />
						<svg-eye v-else />
					</button>

					<List
						v-if="element.headings"
						class="aioseo-toc-list-nested"
						:headings="element.headings"
						:allowReorder="allowReorder"
						:client-id="clientId"
						:group="element.anchor"
					/>
				</div>
			</li>
		</template>
	</draggable>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, defineAsyncComponent } from 'vue'
import {
	useRootStore
} from '@/vue/stores'

import { cleanHtml, deepCopy } from '@/vue/standalone/blocks/utils'
import { cleanForSlug } from '@/vue/utils/cleanForSlug'
import { findHeadingBlockClientId, orderHeadings, replaceHeadingAnchor } from '../helpers'

import BaseInput from '@/vue/components/common/base/Input'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import SvgClose from '@/vue/components/common/svg/Close'
import SvgDrag from '@/vue/components/common/svg/Drag'
import SvgEye from '@/vue/components/common/svg/Eye'
import SvgEyeOff from '@/vue/components/common/svg/EyeOff'
import SvgInfo from '@/vue/components/common/svg/Info'
import SvgTocLink from '@/vue/components/common/svg/Link'

import { __, sprintf } from '@/vue/plugins/translations'

const Draggable = defineAsyncComponent(() => import('vuedraggable'))

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	headings : {
		required : true,
		type     : Array
	},
	clientId : {
		required : true,
		type     : String
	},
	allowReorder : {
		required : false,
		type     : Boolean,
		default  : false
	},
	group : {
		required : false,
		type     : String,
		default  : 'description'
	}
})

const rootStore = useRootStore()

// The characters cleanForSlug() turns into a hyphen, matched at the end of the typed anchor.
const TRAILING_SEPARATOR = /[-\s./]$/

const blockAttributes = ref(window.wp.data.select('core/block-editor').getBlockAttributes(props.clientId) || {})

const strings = {
	tooltipHeader      : __('Edit HTML Anchor:', td),
	tooltipDescription : sprintf(
		// Translators: 1 - The plugin short name ("AIOSEO").
		__('The HTML anchor allows %1$s to link directly to your header from this table of contents block. Feel free to edit if you want, but an anchor is required. For headings without an anchor, %1$s will automatically generate them.', td),
		import.meta.env.VITE_SHORT_NAME
	)
}

const dragOptions = computed(() => ({
	tag        : blockAttributes.value.listStyle,
	animation  : 300,
	group      : props.group,
	disabled   : !props.allowReorder,
	ghostClass : 'aioseo-drag-ghost',
	dragClass  : 'aioseo-dragging'
}))

const setEditedContent = (newValue, heading) => {
	heading.editedContent = newValue === heading.content ? '' : cleanHtml(newValue, true, false)

	// Always use the full headings tree from the block attributes to avoid
	// overwriting the entire tree with a nested sub-array.
	const currentAttributes = window.wp.data.select('core/block-editor').getBlockAttributes(props.clientId)
	const updatedHeadings = getHeadings(currentAttributes.headings, heading)

	window.wp.data.dispatch('core/block-editor').updateBlockAttributes(props.clientId, {
		...currentAttributes,
		headings : updatedHeadings
	})
}

const setReorder = (value) => {
	blockAttributes.value.reOrdered = true

	const movedElement = value?.moved?.element
	if (!movedElement) {
		return
	}

	// Draggable already applied the move to the tree in place, so this only has to renumber it.
	const newHeadings = orderHeadings(deepCopy(blockAttributes.value.headings))

	window.wp.data.dispatch('core/block-editor').updateBlockAttributes(props.clientId, {
		...blockAttributes.value,
		headings : newHeadings
	})
}

const setAnchor = (newValue, heading) => {
	const blockEditor = window.wp.data.select('core/block-editor')

	// The heading's stored client ID goes stale as soon as the post is reloaded, so look the block up again.
	const headingClientId = blockEditor.getBlock(heading.blockClientId)
		? heading.blockClientId
		: findHeadingBlockClientId(heading, blockEditor.getBlocks())

	if (!headingClientId) {
		return
	}

	let anchor = cleanForSlug(newValue)
	if (!anchor) {
		const blockIndex = blockEditor.getBlockIndex(headingClientId)
		anchor = rootStore.aioseo.data.blocks.toc.hashPrefix + cleanForSlug(`${heading.content}-${blockIndex}`)
	} else if (TRAILING_SEPARATOR.test(newValue)) {
		// The field mirrors the anchor we store, and cleanForSlug() drops the trailing separator -
		// keeping it is what lets the next word be typed instead of running into the previous one.
		anchor += '-'
	}

	const currentAttributes = blockEditor.getBlockAttributes(props.clientId)

	// The table of contents has to carry the new anchor itself. Leaving that to the re-parse would
	// cost the heading its custom label, visibility and position, none of which survive an anchor change.
	window.wp.data.dispatch('core/block-editor').updateBlockAttributes(props.clientId, {
		...currentAttributes,
		headings : replaceHeadingAnchor(currentAttributes.headings, heading, anchor)
	})

	window.wp.data.dispatch('core/block-editor').updateBlockAttributes(headingClientId, { anchor })

	window.aioseoBus.$emit('updateToc' + props.clientId)
}

const getHeadings = (headings, heading) => {
	return headings?.map((h) => {
		if (
			h.content === heading.content &&
			h.level === Number(heading.level) &&
			h.anchor === heading.anchor
		) {
			// Preserve the store's nested headings to avoid overwriting
			// with potentially stale data from the component state.
			return { ...heading, headings: h.headings || [] }
		} else if (h.headings?.length) {
			return { ...h, headings: getHeadings(h.headings, heading) }
		} else {
			return h
		}
	})
}

const setHiddenStatus = (heading) => {
	heading.hidden = !heading.hidden

	if ('nested' === props.group) {
		window.wp.data.dispatch('core/block-editor').updateBlockAttributes(props.clientId, blockAttributes.value)
		return
	}

	window.wp.data.dispatch('core/block-editor').updateBlockAttributes(props.clientId, getHeadings(blockAttributes.value.headings, heading))
}

const handleAnchorInput = (event) => {
	const inputRow = event.target.closest('.aioseo-toc-list-item')
	const anchorInput = inputRow?.querySelector('.row-input--anchor input')

	if (!anchorInput) {
		return
	}

	if (!inputRow.classList.contains('anchor-edit')) {
		anchorInput.focus({ preventScroll: true })
		inputRow.classList.add('anchor-edit', 'anchor-is-animating')

		anchorInput.addEventListener('animationend', function anchorIn () {
			inputRow.classList.remove('anchor-is-animating')
			inputRow.classList.add('done')

			anchorInput.removeEventListener('animationend', anchorIn, false)
		})
	} else {
		inputRow.classList.add('anchor-is-animating')
		inputRow.classList.remove('anchor-edit')
		inputRow.classList.remove('done')

		anchorInput.addEventListener('animationend', function anchorOut () {
			inputRow.classList.remove('anchor-is-animating')

			inputRow.removeEventListener('animationend', anchorOut, false)
		})
	}
}

onMounted(() => {
	nextTick(() => {
		window.aioseoBus.$on('updateToc' + props.clientId, () => {
			blockAttributes.value = window.wp.data.select('core/block-editor').getBlockAttributes(props.clientId) || {}
		})
	})
})
</script>