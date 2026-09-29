import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { getPostPermalink, getPostEditedPermalink } from '@/vue/utils/postData/postPermalink'

// Re-export getter functions from utils for backward compatibility.
export { getPostPermalink, getPostEditedPermalink } from '@/vue/utils/postData/postPermalink'

export const maybeUpdatePermalink = async (run = true) => {
	let postPermalink = getPostPermalink()
	const newPermalink = getPostEditedPermalink()
	if (postPermalink !== newPermalink) {
		postPermalink = newPermalink
		if (postPermalink) {
			const postEditorStore = usePostEditorStore()
			const tagsStore       = useTagsStore()
			tagsStore.updatePermalink(postPermalink)

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
}