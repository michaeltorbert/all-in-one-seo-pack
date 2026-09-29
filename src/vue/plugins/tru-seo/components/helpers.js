import {
	usePostEditorStore,
	useSchemaStore
} from '@/vue/stores'

import { debounce } from '@/vue/utils/debounce'

// Importing these directly to avoid circular dependencies.
import { maybeUpdatePostTitle } from './postTitle'
import { maybeUpdatePostContent } from './postContent'
import { maybeUpdatePostExcerpt } from './postExcerpt'
import { maybeUpdatePostSlug } from './postSlug'
import { maybeUpdatePermalink } from './postPermalink'
import { maybeUpdateFeaturedImage } from './postFeaturedImage'
import { maybeUpdateTaxonomies } from './taxonomies'
import { maybeUpdateTerm } from './term'
import { maybeUpdateAttachment } from './attachments'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { setPostUpdater } from '@/vue/plugins/tru-seo/spellingSuggestions'

// Re-export getter/utility functions from utils for backward compatibility.
export {
	truSeoShouldAnalyze,
	supportsPageAnalysis,
	shouldShowTruSeoScore,
	normalizeWhitespaces,
	getClosestNodeByPropertyValue,
	createHighlightPopoverNode
} from '@/vue/utils/postData/helpers'

export const maybeUpdatePost = async (time = 900, run = true, notifyContentChanging = true) => {
	// Notify listeners synchronously so stale UI (e.g. the TruSEO highlight
	// popover) can hide immediately, without waiting for the debounced analysis
	// to finish. The Classic editor's `isDirty()` poll passes false: TinyMCE
	// reports "dirty" for transient DOM churn (e.g. caret/bogus-node insertion
	// when clicking near a mark) that isn't a real edit, and firing this on
	// every poll tick would close the highlight popover the instant it opens.
	if (notifyContentChanging) {
		window.aioseoBus.$emit('aioseo-content-changing')
	}

	debounce(async () => {
		const schemaStore     = useSchemaStore()
		const postEditorStore = usePostEditorStore()

		await maybeUpdatePostTitle(false)
		await maybeUpdatePostContent(false)
		await maybeUpdatePostExcerpt(false)
		await maybeUpdatePostSlug(false)
		await maybeUpdatePermalink(false)
		await maybeUpdateFeaturedImage()
		maybeUpdateTaxonomies(false)
		maybeUpdateTerm(false)
		maybeUpdateAttachment(false)

		debounce(schemaStore.updateSchemaOutput, Math.max(time * 2, 1800))

		window.aioseoBus.$emit('aioseo-content-changed')

		if (run) {
			try {
				const truSeo = await getTruSeoInstance()
				const results = await truSeo?.runAnalysis({ postId: postEditorStore.currentPost.id })

				if (results) {
					updateStoreWithResults(results)
				}
			} catch (error) {
				console.error('TruSEO analysis failed:', error)
			}
		}
	}, time)
}

// Expose the post-update handler to editor DOM utilities via the worker-free
// bridge, so they can trigger re-analysis without statically importing this
// module (which pulls the TruSEO worker into addon bundles).
setPostUpdater(maybeUpdatePost)