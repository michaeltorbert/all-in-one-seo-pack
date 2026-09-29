import { escapeRegex } from '@/vue/utils/regex'

import { useRootStore } from '@/vue/stores'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

// Phrases are extracted from content the scanner already normalized (`&nbsp;` collapsed to a plain
// space), so a literal match against the editor's raw HTML misses every phrase whose paragraph
// carried one. `\s` covers the U+00A0 character on top of the entity forms.
const WHITESPACE_PATTERN = '(?:\\s|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)+'

export const useCommon = () => {
	const getBlockContent = (block) => {
		const content = block.attributes.content
		if ('string' === typeof content) {
			return content
		}

		// Rich text is a RichTextData instance, and blocks like `core/block` store an array of overrides.
		return content && !Array.isArray(content) ? content.toString() : ''
	}

	const phrasePattern = (phraseHtml) => {
		return new RegExp(escapeRegex(phraseHtml).replace(/\s+/g, WHITESPACE_PATTERN), 'i')
	}

	const findTargetBlock = (blocks, phraseHtml) => {
		const pattern = phrasePattern(phraseHtml)

		let targetBlockId  = null
		blocks.forEach(block => {
			if (targetBlockId || !block.attributes) {
				return
			}

			const content = getBlockContent(block)
			if (content && pattern.test(content)) {
				targetBlockId = block.clientId
				return
			}

			// Check if we can find the link in an inner block.
			if (!block.innerBlocks) {
				return
			}

			const possibleTargetBlockId = findTargetBlock(block.innerBlocks, phraseHtml)
			if (possibleTargetBlockId) {
				targetBlockId = possibleTargetBlockId
			}
		})

		return targetBlockId
	}

	const isPhraseInPostContent = (phraseHtml) => {
		const postContent = window.wp?.data?.select('core/editor')?.getEditedPostContent() || ''
		if (!phraseHtml || !postContent) {
			return false
		}

		return phrasePattern(phraseHtml).test(postContent)
	}

	const phraseNotFoundMessage = (phraseHtml) => {
		// AIOSEO's own detection: when it names a builder, that builder owns the content and is where
		// the link has to be added, whichever editor we happen to be in.
		const integration = useRootStore().aioseo.integration
		if (integration) {
			return sprintf(
				// Translators: 1 - The page builder name, e.g. "Divi".
				__('This post was built with %1$s, so the link can\'t be added here. Please add it from the %1$s editor.', td),
				integration.charAt(0).toUpperCase() + integration.slice(1)
			)
		}

		// The phrase is in the post, just not in a block we can write to. Page builders keep their
		// content in markup the block editor only round-trips, and they leave it behind when disabled,
		// so we can't name the builder here — the detection above needs it to still be active.
		if (isPhraseInPostContent(phraseHtml)) {
			return __('This phrase isn\'t stored in a block All in One SEO can edit — it may belong to a page builder or a custom block. Please add the link from the editor that manages this content.', td)
		}

		return __('All in One SEO couldn\'t find this phrase in your content. It may have been edited since the last scan.', td)
	}

	// Nothing in the table hints at a failed match, so without this the row just sits there as if the
	// click never happened.
	const notifyPhraseNotFound = (phraseHtml) => {
		window.wp?.data?.dispatch('core/notices')?.createNotice(
			'error',
			phraseNotFoundMessage(phraseHtml),
			{
				type          : 'snackbar',
				isDismissible : true
			}
		)
	}

	return {
		findTargetBlock,
		getBlockContent,
		notifyPhraseNotFound,
		phrasePattern
	}
}