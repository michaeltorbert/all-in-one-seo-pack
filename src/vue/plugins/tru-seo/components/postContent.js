import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { removeHtmlBlocks } from '@/app/tru-seo/languageProcessing/helpers'
import { flattenBlocks } from '@/vue/utils/helpers'
import { getEditorDocument } from '@/vue/utils/editor'
import {
	isBlockEditor,
	isClassicEditor,
	isPageBuilderEditor,
	isElementorEditor,
	isDiviEditor,
	isSeedProdEditor,
	isWPBakeryEditor,
	isAvadaEditor,
	isSiteOriginEditor,
	isThriveArchitectEditor,
	isBricksEditor,
	isOxygenEditor
} from '@/vue/utils/context'
import { isTinyMceEmpty } from '@/vue/standalone/post-settings/utils/classicEditor'
import { customFieldsContent } from '@/vue/plugins/tru-seo/components/customFields'
import { getEditorData as getElementorData } from '@/vue/standalone/page-builders/elementor/helpers'
import { getEditorData as getDiviData } from '@/vue/standalone/page-builders/divi/helpers'
import { getEditorData as getSeedProdData } from '@/vue/standalone/page-builders/seedprod/helpers'
import { getEditorData as getWPBakeryData } from '@/vue/standalone/page-builders/wpbakery/helpers'
import { getEditorData as getAvadaData } from '@/vue/standalone/page-builders/avada/helpers'
import { getEditorData as getSiteOriginData } from '@/vue/standalone/page-builders/siteorigin/helpers'
import { getEditorData as getThriveArchitectData } from '@/vue/standalone/page-builders/thrive-architect/helpers'
import { getEditorData as getBricksData } from '@/vue/standalone/page-builders/bricks/helpers'
import { getEditorData as getOxygenData } from '@/vue/standalone/page-builders/oxygen/helpers'
import { getPostContent, getPostEditedContent } from '@/vue/utils/postData/postContent'

// Re-export getter functions from utils for backward compatibility.
export { getPostContent, getPostEditedContent } from '@/vue/utils/postData/postContent'

const base64regex = /base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)/g

/**
 * Retrieves the content from the active page builder editor.
 *
 * @returns {string} The content from the active page builder editor.
 */
const getEditorContent = () => {
	const editorMap = [
		{ isEditor: isElementorEditor, getData: getElementorData },
		{ isEditor: isDiviEditor, getData: getDiviData },
		{ isEditor: isSeedProdEditor, getData: getSeedProdData },
		{ isEditor: isWPBakeryEditor, getData: getWPBakeryData },
		{ isEditor: isAvadaEditor, getData: getAvadaData },
		{ isEditor: isSiteOriginEditor, getData: getSiteOriginData },
		{ isEditor: isThriveArchitectEditor, getData: getThriveArchitectData },
		{ isEditor: isBricksEditor, getData: getBricksData },
		{ isEditor: isOxygenEditor, getData: getOxygenData }
	]

	for (const editor of editorMap) {
		if (editor.isEditor()) {
			return editor.getData()?.content ?? ''
		}
	}

	return ''
}

/**
 * Parses postContent for reusable blocks and replaces their refs with content.
 *
 * @param {string} content Content from the block editor.
 *
 * @returns {string} Post content with reusable block refs replaced by their content.
 */
const getReusableBlockContent = (content) => {
	if (!content.includes('<!-- wp:block {"ref":')) {
		return content
	}

	const allBlocks = window.wp.blocks?.rawHandler({ HTML: content })
	const blocksWithChildren = flattenBlocks(allBlocks)
	blocksWithChildren.forEach(block => {
		if ('core/block' === block.name) {
			const reData = window.wp.data.select('core').getEntityRecord('postType', 'wp_block', block.attributes?.ref)

			if (reData?.content?.raw) {
				content = content.replace(`<!-- wp:block {"ref":${block.attributes?.ref}} /-->`, reData.content.raw)
			}
		}
	})

	return content
}

/**
 * Parses postContent for all blocks and replaces their markup with content.
 * This is used for TruSEO analysis and requires the htmlparser2 dependency.
 *
 * @param {string} content Content from the block editor.
 *
 * @returns {string} Post content with block markup replaced by their content.
 */
const getAllProcessedBlockContent = (content) => {
	// If not in block editor context, return content as-is
	if (!window.wp?.data?.select('core/block-editor')?.getBlocks) {
		return content
	}

	const editorDoc = getEditorDocument()
	const blocks = window.wp.data.select('core/block-editor').getBlocks()
	const processBlock = (block) => {
		const element = editorDoc?.getElementById('block-' + block.clientId)
		if (element) {
			let renderedText = ''

			// Special handling for embed blocks because they are not serialized correctly. (missing iframme tags)
			if ('core/embed' === block.name) {
				renderedText = element?.querySelector('iframe')?.contentDocument?.body?.getHTML() || element?.getHTML() || element?.innerText || ''
			} else if ('core/post-excerpt' === block.name) {
				// Dynamic block: serialize() emits no text, so the manual excerpt would otherwise be ignored.
				// Only inject a manually-entered excerpt — an auto-generated one is derived from the content
				// and already analyzed, so injecting it would double-count the opening of the post.
				const manualExcerpt = window.wp?.data?.select('core/editor')?.getEditedPostAttribute?.('excerpt')?.trim() || ''
				renderedText = manualExcerpt ? '<p>' + manualExcerpt + '</p>' : ''
			} else {
				try {
					renderedText = window.wp.blocks.serialize(block)
				} catch {
					// Get the rendered text content from the DOM element
					renderedText = element?.getHTML() || element?.innerText || ''
				}
			}

			if (renderedText) {
				const [ namePrefix, nameSuffix ] = block.name.split('/')
				const blockName = 'core' === namePrefix ? nameSuffix : block.name

				// Strip WordPress block comments from the rendered text to get just the HTML
				const htmlOnly = renderedText.replace(/<!--\s*\/?wp:[^>]*?-->/g, '').trim()

				// Match both self-closing and regular block comments
				const pattern = `<!-- wp:${blockName}(?:\\s+\\{[^}]*\\})?\\s*-->.*?<!-- /wp:${blockName} -->|<!-- wp:${blockName}(?:\\s+\\{[^}]*\\})?\\s*/-->`

				// Use a replacer function so `$` sequences in the content (e.g. "$$", "$&") aren't treated as
				// special replacement patterns by String.prototype.replace.
				content = content.replace(new RegExp(pattern, 's'), () => htmlOnly)
			}
		}

		// Recursively process inner blocks
		if (block.innerBlocks && 0 < block.innerBlocks.length) {
			block.innerBlocks.forEach(processBlock)
		}
	}

	blocks.forEach(processBlock)

	// Strip any remaining WordPress block comments (for blocks that couldn't be processed)
	content = content.replace(/<!--\s*\/?wp:[^>]*?-->/g, '')

	return removeHtmlBlocks(content)
}

const classicContent = () => {
	let cc

	const editor = window.tinyMCE ? window.tinyMCE.get('content') : ''
	if (document.querySelector('#wp-content-wrap.tmce-active') && editor) {
		cc = editor.getContent({ format: isTinyMceEmpty(editor) ? 'html' : 'raw' })
	} else {
		// No tinyMCE. Let's see if there's a proper #content textarea.
		const textEditor = document.querySelector('textarea#content')
		cc = textEditor ? textEditor.value : ''
	}
	return cc
}

/**
 * Returns the edited post content with full block processing for TruSEO analysis.
 * This version uses getAllProcessedBlockContent with removeHtmlBlocks for analysis.
 *
 * @since 5.0.0
 * @param   {boolean} ignoreCustomFields Whether to ignore custom fields.
 * @returns {string}                     Post content with full block processing.
 */
export const getPostEditedContentForAnalysis = (ignoreCustomFields = false) => {
	let postContent = ''

	// A term has no editor — its description is the only body content, and custom
	// fields never apply.
	if ('term' === usePostEditorStore().currentPost.context) {
		return (document.querySelector('#edittag textarea#description')?.value || '').replace(base64regex, '')
	}

	if (isClassicEditor() && !isPageBuilderEditor()) {
		if (window.tinyMCE || document.querySelector('#wp-content-wrap.html-active')) {
			postContent = classicContent()
		} else {
			const classicInterval = window.setInterval(() => {
				if (window.tinyMCE) {
					window.clearInterval(classicInterval)
					postContent = classicContent()
				}
			}, 50)
		}
	}

	if (isBlockEditor()) {
		postContent = window.wp.data.select('core/editor').getEditedPostContent()
		postContent = getReusableBlockContent(postContent)
		postContent = getAllProcessedBlockContent(postContent)
	}

	if (isPageBuilderEditor()) {
		postContent = getEditorContent()
	}

	const postEditorStore = usePostEditorStore()
	if (!ignoreCustomFields && postEditorStore.currentPost.descriptionIncludeCustomFields) {
		postContent = postContent + customFieldsContent()
	}

	// Replace base64 stuff, since we don't need it to analyze the content.
	postContent = postContent.replace(base64regex, '')

	return postContent
}

export const maybeUpdatePostContent = async (run = true) => {
	let postContent      = getPostContent()
	const newPostContent = getPostEditedContent()
	if (postContent !== newPostContent) {
		postContent = newPostContent

		const postEditorStore = usePostEditorStore()
		const tagsStore       = useTagsStore()
		tagsStore.updatePostContent(postContent)

		if (!run) {
			return
		}

		try {
			const truSeo = await getTruSeoInstance()
			const results = await truSeo?.runAnalysis({
				postId : postEditorStore.currentPost.id
			})

			if (results) {
				updateStoreWithResults(results)
			}
		} catch (error) {
			console.error('TruSEO analysis failed:', error)
		}
	}
}