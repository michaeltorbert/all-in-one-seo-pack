import { ref, computed, onBeforeMount } from 'vue'

import {
	useLinkAssistantStore,
	usePostEditorStore
} from '@/vue/stores'

import { isBlockEditor, isClassicEditor } from '@/vue/utils/context'
import { escapeRegex } from '@/vue/utils/regex'

import { useCommon } from '@/vue/composables/link-assistant/Common'

import { __ } from '@/vue/plugins/translations'
const td = import.meta.env.VITE_TEXTDOMAIN

export const useLinks = (params = {}) => {
	const {
		emit,
		linkType,
		linksReport,
		metabox,
		pageNumber,
		post,
		postIndex,
		postReport,
		refreshTable = () => {},
		wpTableLoading
	} = params

	const action                 = ref('')
	const changeItemsPerPageSlug = 'linkAssistantPostsReport'
	const selectedRows           = ref([])
	const showModal              = ref(false)

	const rows = computed(() => {
		if (!metabox) {
			return post.links[linkType].rows
		}

		const offset = 1 === pageNumber.value ? 0 : (pageNumber.value - 1) * 10
		return post.links[linkType].rows.slice(offset, offset + 10)
	})

	const strings = {
		frontPage    : __('Front Page', td),
		deleteLink   : __('Delete Link', td),
		noPermission : __('You don\'t have permission to edit this post.', td)
	}

	// Deleting an inbound link rewrites the post the link lives in, so those rows are authorized
	// against their own post; the other link types always mutate the report's post.
	const canEditRow = (row) => {
		const target = 'inboundInternal' === linkType ? row : post
		return false !== target?.context?.canEdit
	}

	const canEditAnyRow = computed(() => rows.value.some(canEditRow))

	const modalStrings = {
		areYouSureSingle     : __('Are you sure you want to delete this link?', td),
		areYouSureMultiple   : __('Are you sure you want to delete these links?', td),
		areYouSureAll        : __('Are you sure you want to delete all links?', td),
		actionCannotBeUndone : __('This action cannot be undone.', td),
		yesSingle            : __('Yes, I want to delete this link', td),
		yesMultiple          : __('Yes, I want to delete these links', td),
		yesAll               : __('Yes, I want to delete all links', td),
		noChangedMind        : __('No, I changed my mind', td)
	}

	const bulkOptions = computed(() => {
		if (!canEditAnyRow.value) {
			return []
		}

		return [
			{ label: __('Delete', td), value: 'delete' }
		]
	})

	const linkAssistantStore = useLinkAssistantStore()
	const postEditorStore    = usePostEditorStore()

	const fetchData = (payload) => {
		window.aioseoBus.$emit('updatingLinks', true)

		const newPayload = {
			...payload,
			additionalFilters : {
				postId    : post.ID || postEditorStore.currentPost.id,
				postIndex : postIndex,
				type      : linkType
			}
		}

		const apiAction = postReport ? 'fetchPostReport' : 'fetchLinksReportInner'
		return linkAssistantStore[apiAction](newPayload).finally(() => {
			window.aioseoBus.$emit('updatingLinks', false)
		})
	}

	const openPostReport = (initialTab) => {
		window.location.href = `#/post-report?postId=${post.ID}&postIndex=${postIndex}&initialTab=${initialTab}`
	}

	const maybeDoBulkAction = ({ action: bulkAction, selectedRows: bulkActionRows }) => {
		if (!bulkActionRows.length || !bulkAction) {
			return
		}

		action.value       = bulkAction
		selectedRows.value = bulkActionRows
		showModal.value    = true
	}

	const doBulkAction = () => {
		showModal.value = false
		if (!selectedRows.value.length) {
			return
		}

		if ('number' === typeof selectedRows.value) {
			doDeleteLink(selectedRows.value)
			return
		}

		if (metabox && 'inboundInternal' !== linkType) {
			const indexes = idsToIndexes(selectedRows.value)
			indexes.forEach((index) => {
				editorRemoveLink(index)
			})
			return
		}

		window.aioseoBus.$emit('updatingLinks', true)
		linkAssistantStore.linksBulk({
			postIndex,
			postId  : post.ID || postEditorStore.currentPost.id,
			action  : action.value,
			linkType,
			linkIds : selectedRows.value,
			linksReport,
			postReport
		}).finally(() => {
			window.aioseoBus.$emit('updatingLinks', false)
			emit('linksUpdated')
			refreshTable()
		})
	}

	const doDeleteLink = (index) => {
		const linkId = post.links[linkType].rows[index].id
		if (!linkId) {
			return
		}

		if (metabox && 'inboundInternal' !== linkType) {
			editorRemoveLink(index)
			return
		}

		window.aioseoBus.$emit('updatingLinks', true)
		linkAssistantStore.linkDelete({
			postIndex,
			postId : post.ID || postEditorStore.currentPost.id,
			linkId,
			linksReport,
			postReport
		}).finally(() => {
			window.aioseoBus.$emit('updatingLinks', false)
			emit('linksUpdated')
			refreshTable()
		})
	}

	const editorRemoveLink = (rowIndex) => {
		if (isBlockEditor()) {
			window.aioseoBus.$emit('updatingLinks', false)
			blockEditorRemoveLink(rowIndex)
			window.aioseoBus.$emit('updatingLinks', false)
			return
		}

		if (isClassicEditor()) {
			classicEditorRemoveLink(rowIndex)
			return
		}

		// Inside a page builder's own editor neither branch can reach the content, so say so.
		const link = postEditorStore.currentPost.linkAssistant.links[linkType].rows[rowIndex]
		useCommon().notifyPhraseNotFound(link ? link.phrase_html.trim() : '')
	}

	const blockEditorRemoveLink = (rowIndex) => {
		const link = postEditorStore.currentPost.linkAssistant.links[linkType].rows[rowIndex]
		if (!link) {
			return
		}

		window.aioseoBus.$emit('updatingLinks', true)

		const escapedAnchor = escapeRegex(link.anchor.trim())
		const phraseHtml    = link.phrase_html.trim()

		const { findTargetBlock, getBlockContent, notifyPhraseNotFound, phrasePattern } = useCommon()

		const blocks        = window.wp.data.select('core/block-editor').getBlocks()
		const targetBlockId = findTargetBlock(blocks, phraseHtml)

		if (!targetBlockId) {
			notifyPhraseNotFound(phraseHtml)
			window.aioseoBus.$emit('updatingLinks', false)
			return
		}

		const targetBlock = window.wp.data.select('core/block-editor').getBlock(targetBlockId)
		if (!targetBlock) {
			notifyPhraseNotFound(phraseHtml)
			window.aioseoBus.$emit('updatingLinks', false)
			return
		}

		const anchorPattern = new RegExp(`(<t?a[^<>]*>)(.*)?(${escapedAnchor})(.*)?(</t?a[^<>]*>)`, 'i')
		const newPhraseHtml = phraseHtml.replace(anchorPattern, '$2$3$4')

		// The phrase can hold `$` sequences (prices), which a replacement string would read as backreferences.
		window.wp.data.dispatch('core/block-editor').updateBlockAttributes(targetBlockId, {
			content : getBlockContent(targetBlock).replace(phrasePattern(phraseHtml), () => newPhraseHtml)
		}).then(() => {
			post.links[linkType].rows.splice(rowIndex, 1)

			if (0 < post.links[linkType].totals.total) {
				post.links[linkType].totals.total--
			}
		}).catch((error) => {
			console.error(`Couldn\t delete link with type "${linkType}" and index ${rowIndex}:`, error)
		}).finally(() => {
			window.aioseoBus.$emit('updatingLinks', false)
			emit('linksUpdated')

			// Re-scan server-side so the totals reconcile; skip the watcher's follow-up run.
			linkAssistantStore.postSettingsUpdate({
				postContent : window.wp.data.select('core/editor').getEditedPostContent(),
				skipNextRun : true
			})
		})
	}

	const classicEditorRemoveLink = (rowIndex) => {
		const link = postEditorStore.currentPost.linkAssistant.links[linkType].rows[rowIndex]
		if (!link || !window.tinyMCE) {
			return
		}

		window.aioseoBus.$emit('updatingLinks', true)

		let postContent = '',
		 editor         = null,
		 textEditor     = null
		if (document.querySelector('#wp-content-wrap.tmce-active')) {
			editor      = window.tinyMCE.get('content')
			postContent = editor.getContent({ format: 'raw' })
		} else {
			textEditor = document.querySelector('textarea#content')
			postContent = textEditor ? textEditor.value : ''
		}

		if (!postContent) {
			window.aioseoBus.$emit('updatingLinks', false)
			return
		}

		// eslint-disable-next-line one-var
		let phraseHtml      = link.phrase_html.trim()
		if (!editor) {
			// We need to strip off the data attribute in case the user switched from the visual to HTML editor.
			phraseHtml = phraseHtml.replace(/(\sdata-mce-href=".*")/gi, '')
		}

		const escapedAnchor = escapeRegex(link.anchor.trim())
		const anchorPattern = new RegExp(`(<t?a[^<>]*>)(.*)?(${escapedAnchor})(.*)?(</t?a[^<>]*>)`, 'i')
		const newPhraseHtml = phraseHtml.replace(anchorPattern, '$2$3$4')

		const { notifyPhraseNotFound, phrasePattern } = useCommon()

		const pattern = phrasePattern(phraseHtml)
		if (!pattern.test(postContent)) {
			notifyPhraseNotFound(phraseHtml)
			window.aioseoBus.$emit('updatingLinks', false)
			return
		}

		// The phrase can hold `$` sequences (prices), which a replacement string would read as backreferences.
		postContent = postContent.replace(pattern, () => newPhraseHtml)

		if (editor) {
			editor.setContent(postContent)
		} else {
			textEditor.value = postContent
		}

		post.links[linkType].rows.splice(rowIndex, 1)

		if (0 < post.links[linkType].totals.total) {
			post.links[linkType].totals.total--
		}

		linkAssistantStore.postSettingsUpdate({ postContent: postContent })?.finally(() => {
			window.aioseoBus.$emit('updatingLinks', false)
			emit('linksUpdated')
		})
	}

	const idsToIndexes = (indexedSelectedRows) => {
		let ids, indexes = []
		if (Array.isArray(indexedSelectedRows)) {
			ids = indexedSelectedRows.map(Number)
		}

		if (ids) {
			post.links[linkType].rows.forEach((link, index) => {
				if (ids.includes(link.id)) {
					indexes.push(index)
				}
			})
		}

		if ('all' === indexedSelectedRows) {
			indexes = post.links[linkType].rows.map((link, index) => index)
		}

		// Reverse the indexes so that we start deleting them from behind, to prevent us from messing up the order and deleting the wrong ones.
		return indexes.sort(function (a, b) {
			return b - a
		})
	}

	onBeforeMount(() => {
		window.aioseoBus.$on('updatingLinks', (loading) => {
			wpTableLoading.value = loading
		})

		pageNumber.value = linkAssistantStore.postReport[linkType].totals.page
	})

	return {
		bulkOptions,
		canEditAnyRow,
		canEditRow,
		changeItemsPerPageSlug,
		doBulkAction,
		fetchData,
		maybeDoBulkAction,
		modalStrings,
		openPostReport,
		rows,
		selectedRows,
		showModal,
		strings
	}
}