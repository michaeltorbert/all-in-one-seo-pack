import {
	usePostEditorStore,
	useTagsStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { requestPostUpdate } from '@/vue/plugins/tru-seo/spellingSuggestions'
import { cleanForSlug } from '@/vue/utils/cleanForSlug'

export const maybeUpdateTerm = async (run = false) => {
	const postEditorStore = usePostEditorStore()
	if ('term' !== postEditorStore.currentPost.context) {
		return
	}

	const tagsStore = useTagsStore()

	// Term Title
	const titleInput = document.querySelector('#edittag input#name')
	if (titleInput) {
		tagsStore.updateTaxonomyTitle(titleInput.value)
		titleInput.addEventListener('input', () => {
			tagsStore.updateTaxonomyTitle(titleInput.value)
			requestPostUpdate()
		})
	}

	// Term Description — this doubles as the analyzed content, so edits must re-run the analysis.
	const descriptionInput = document.querySelector('#edittag textarea#description')
	if (descriptionInput) {
		tagsStore.updateTaxonomyDescription(descriptionInput.value)
		descriptionInput.addEventListener('input', () => {
			tagsStore.updateTaxonomyDescription(descriptionInput.value)
			requestPostUpdate()
		})
	}

	// Term Slug
	const slugInput = document.querySelector('#edittag input#slug')
	if (slugInput) {
		const slug = cleanForSlug(slugInput.value)
		tagsStore.updatePermalinkSlug(slug)

		tagsStore.updatePermalink(postEditorStore.currentPost.permalink.replace(`/${tagsStore.permalinkSlug}`, `/${slug.replace(/ /gi, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`))

		slugInput.addEventListener('input', () => {
			tagsStore.updatePermalinkSlug(slug)

			tagsStore.updatePermalink(postEditorStore.currentPost.permalink.replace(`/${tagsStore.permalinkSlug}`, `/${slug.replace(/ /gi, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`))
		})
	}

	postEditorStore.savePostState()

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
}