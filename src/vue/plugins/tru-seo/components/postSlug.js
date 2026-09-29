import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { getPostSlug, getPostEditedSlug } from '@/vue/utils/postData/postSlug'

// Re-export getter functions from utils for backward compatibility.
export { getPostSlug, getPostEditedSlug } from '@/vue/utils/postData/postSlug'

export const maybeUpdatePostSlug = async (run = true) => {
	let postSlug      = getPostSlug()
	const newPostSlug = getPostEditedSlug()
	if (postSlug !== newPostSlug) {
		postSlug = newPostSlug

		const postEditorStore = usePostEditorStore()
		const tagsStore       = useTagsStore()
		tagsStore.updatePermalinkSlug(postSlug)

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