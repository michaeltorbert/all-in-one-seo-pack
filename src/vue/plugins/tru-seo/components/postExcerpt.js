import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { getPostExcerpt, getPostEditedExcerpt } from '@/vue/utils/postData/postExcerpt'

// Re-export getter functions from utils for backward compatibility.
export { getPostExcerpt, getPostEditedExcerpt, getClassicExcerpt } from '@/vue/utils/postData/postExcerpt'

export const maybeUpdatePostExcerpt = async (run = true) => {
	let postExcerpt   = getPostExcerpt()
	const newPostExcerpt = getPostEditedExcerpt()
	if (postExcerpt !== newPostExcerpt) {
		postExcerpt = newPostExcerpt

		const postEditorStore = usePostEditorStore()
		const tagsStore       = useTagsStore()
		tagsStore.updatePostExcerpt(postExcerpt)

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