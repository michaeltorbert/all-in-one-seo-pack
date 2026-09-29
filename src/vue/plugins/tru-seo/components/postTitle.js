import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { getPostTitle, getPostEditedTitle } from '@/vue/utils/postData/postTitle'

// Re-export getter functions from utils for backward compatibility.
export { getPostTitle, getPostEditedTitle } from '@/vue/utils/postData/postTitle'

// Update post data
export const maybeUpdatePostTitle = async (run = true) => {
	let postTitle      = getPostTitle()
	const newPostTitle = getPostEditedTitle()

	if (postTitle !== newPostTitle) {
		postTitle = newPostTitle

		const postEditorStore = usePostEditorStore()
		const tagsStore       = useTagsStore()
		tagsStore.updatePostTitle(postTitle)

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