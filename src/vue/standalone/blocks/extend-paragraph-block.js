import aiAssistantIcon from '@/vue/standalone/blocks/ai-assistant/icon'

import { __ } from '@/vue/plugins/translations'
import { getEditorDocument } from '@/vue/utils/editor'

import { Button } from '@wordpress/components'
import { createElement, createRoot, flushSync } from '@wordpress/element'
import { createHigherOrderComponent } from '@wordpress/compose'

// Hooks must come from the WP runtime React (shared dispatcher); a bundled copy
// would hit a null dispatcher and crash the block. The helpers above are only used
// for the detached inserter-button render, which intentionally uses its own React.
const { useMemo }   = window.wp?.element || {}
const { useSelect } = window.wp?.data || {}

const td      = import.meta.env.VITE_TEXTDOMAIN
const strings = {
	placeholder : __('Type / to choose a block or // to use AI Assistant', td)
}

let $cachedAiAssistantButton = null

/**
 * Check if a block is a root-level paragraph block.
 *
 * @param {Object} block       The block object to check.
 * @param {Object} blockEditor The block editor selector object.
 *
 * @returns {boolean} True if the block is a root-level paragraph block.
 */
const isRootLevelParagraphBlock = (block, blockEditor) => {
	return (
		block &&
		'core/paragraph' === block.name &&
		!blockEditor.getBlockRootClientId(block.clientId)
	)
}

/**
 * Extend the paragraph block placeholder for root-level blocks only.
 *
 * Uses an editor.BlockEdit HOC to inject the placeholder as a render-only prop;
 * the block's stored attributes are never mutated, so nothing is persisted to the
 * post's content.
 *
 * NOTE: the injected `attributes` object is memoized on the block's own attributes
 * reference. Handing downstream filters (e.g. AI Engine's own editor.BlockEdit HOC)
 * a fresh object on every render is what caused the infinite re-render loop; a stable
 * reference breaks that cascade without changing what the placeholder does.
 *
 * @param {Object} options                  Options object.
 * @param {Object} options.aiAssistantStore The AI Assistant store instance.
 *
 * @returns {void}
 */
export const extendParagraphPlaceholder = ({ aiAssistantStore }) => {
	if (!aiAssistantStore.extend.paragraphPlaceholder) {
		return
	}

	const { addFilter } = window.wp?.hooks || {}
	if (!addFilter) {
		return
	}

	addFilter(
		'editor.BlockEdit',
		'aioseo/paragraph-placeholder',
		createHigherOrderComponent(
			(BlockEdit) => (props) => {
				const isRootLevelParagraph = useSelect(
					(select) => 'core/paragraph' === props.name &&
						!select('core/block-editor').getBlockRootClientId(props.clientId),
					[ props.name, props.clientId ]
				)

				const isBlockAvailable = aiAssistantStore.isBlockAvailable

				const attributes = useMemo(() => {
					if (!isRootLevelParagraph || !isBlockAvailable || props.attributes?.placeholder) {
						return props.attributes
					}

					return {
						...props.attributes,
						placeholder : strings.placeholder
					}
				}, [ props.attributes, isRootLevelParagraph, isBlockAvailable ])

				if (attributes === props.attributes) {
					return createElement(BlockEdit, props)
				}

				return createElement(BlockEdit, { ...props, attributes })
			},
			'aioseoExtendParagraphPlaceholder'
		)
	)
}

/**
 * Check for "//" shortcut and insert AI Assistant block if detected.
 *
 * @param {Object} options                  Options object.
 * @param {Object} options.aiAssistantStore The AI Assistant store instance.
 *
 * @returns {void}
 */
export const checkAiAssistantShortcut = ({ aiAssistantStore }) => {
	if (!aiAssistantStore.extend.paragraphPlaceholder) {
		return
	}

	const { select, dispatch } = window.wp?.data || {}
	const { createBlock }      = window.wp?.blocks || {}
	if (!select || !dispatch || !createBlock) {
		return
	}

	const blockEditor   = select('core/block-editor')
	const selectedBlock = blockEditor.getSelectedBlock()

	// Only trigger for root-level paragraph blocks.
	if (!isRootLevelParagraphBlock(selectedBlock, blockEditor)) {
		return
	}

	const content = selectedBlock.attributes?.content || ''

	// Only trigger if the content is "//" and the cursor is at the end (position 2).
	if ('//' === content.trim()) {
		const selectionEnd = blockEditor.getSelectionEnd()
		if (2 === selectionEnd?.offset) {
			const aiAssistantBlock = createBlock('aioseo/ai-assistant')

			// Replace the paragraph block with the AI Assistant block.
			dispatch('core/block-editor').replaceBlock(
				selectedBlock.clientId,
				aiAssistantBlock
			)
		}
	}
}

/**
 * Inject a custom AI Assistant button next to the "Add Block" button.
 *
 * @returns {void}
 */
export const extendBlockEditorInserterButton = ({ aiAssistantStore }) => {
	if (!aiAssistantStore.extend.blockEditorInserterButton) {
		return
	}

	if (!$cachedAiAssistantButton) {
		const $tempContainer = document.createElement('div')
		const root           = createRoot($tempContainer)

		flushSync(() => {
			root.render(
				createElement(Button, {
					className             : 'aioseo-ai-assistant-inserter-btn',
					icon                  : aiAssistantIcon,
					iconSize              : '18',
					variant               : 'secondary',
					size                  : 'small',
					__next40pxDefaultSize : true,
					title                 : __('Insert AI Assistant Block', td),
					style                 : {
						marginLeft      : '8px',
						verticalAlign   : 'top',
						padding         : '0',
						minWidth        : 'auto',
						width           : '24px',
						backgroundColor : '#fff',
						display         : 'inline-flex'
					}
				})
			)
		})

		$cachedAiAssistantButton = $tempContainer.firstChild?.cloneNode(true)

		$cachedAiAssistantButton.addEventListener('click', e => {
			e.preventDefault()
			e.stopPropagation()

			const wpSelect      = window.wp?.data?.select
			const wpDispatch    = window.wp?.data?.dispatch
			const { createBlock } = window.wp?.blocks || {}
			if (!wpSelect || !wpDispatch || !createBlock) {
				return
			}

			const aiAssistantBlock = createBlock('aioseo/ai-assistant')
			const wpBlockEditor    = wpSelect('core/block-editor')
			const currentBlock     = wpBlockEditor.getSelectedBlock()

			if (
				isRootLevelParagraphBlock(currentBlock, wpBlockEditor) &&
				!currentBlock?.attributes?.content?.trim()
			) {
				wpDispatch('core/block-editor').replaceBlock(
					currentBlock.clientId,
					aiAssistantBlock
				)
			} else {
				const insertionPoint = wpBlockEditor.getBlockInsertionPoint() || {}

				wpDispatch('core/block-editor').insertBlock(
					aiAssistantBlock,
					insertionPoint.index,
					insertionPoint.rootClientId
				)
			}
		})

		$tempContainer.remove()
	}

	const { select } = window.wp?.data || {}
	if (!select) {
		return
	}

	const $editor = document.getElementById('editor')
	if (!$editor) {
		return
	}

	const editorDoc       = getEditorDocument()
	const blockEditor     = select('core/block-editor')
	const selectedBlock   = blockEditor.getSelectedBlock()
	const $existingButton = $editor.querySelector('.aioseo-ai-assistant-inserter-btn') ||
		editorDoc.querySelector('.aioseo-ai-assistant-inserter-btn')

	// Remove the button immediately if the selected block is not a root-level paragraph block.
	if (!isRootLevelParagraphBlock(selectedBlock, blockEditor)) {
		$existingButton?.remove()
		return
	}

	setTimeout(() => {
		// Don't add the button if it already exists (check both parent and iframe contexts).
		if (
			$editor.querySelector('.aioseo-ai-assistant-inserter-btn') ||
			editorDoc.querySelector('.aioseo-ai-assistant-inserter-btn')
		) {
			return
		}

		// In WP 7.0+, the inserter toggle lives inside the editor iframe.
		const $addBlockButton = $editor.querySelector('.block-editor-inserter__toggle') ||
			editorDoc.querySelector('.block-editor-inserter__toggle')
		if (!$addBlockButton || $addBlockButton.closest('.is-vertical')) {
			return
		}

		$addBlockButton.after($cachedAiAssistantButton)
	})
}