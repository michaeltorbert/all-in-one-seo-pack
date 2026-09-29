import { defineStore } from 'pinia'
import { merge } from 'lodash-es'

import http from '@/vue/utils/http'
import links from '@/vue/utils/links'

import {
	useOptionsStore,
	usePostEditorStore,
	useSensitiveOptionsStore
} from '@/vue/stores'

import { getPostEditedContent } from '@/vue/utils/postData/postContent'
import { getPostPermalink } from '@/vue/utils/postData/postPermalink'

export const useAiStore = defineStore('AiStore', {
	state : () => ({
		options : {},
		faqs    : {
			tone     : '',
			audience : ''
		},
		keyPoints : {
			tone     : '',
			audience : ''
		},
		socialPosts : {
			tone     : '',
			audience : '',
			selected : []
		},
		metaTitle : {
			tone     : '',
			audience : ''
		},
		metaDescription : {
			tone     : '',
			audience : ''
		},
		isModalOpened : null
	}),
	actions : {
		storeAccessToken (accessToken) {
			const sensitiveOptionsStore = useSensitiveOptionsStore()
			sensitiveOptionsStore.hasAiAccessToken = !!accessToken

			return http.post(links.restUrl('ai/auth'))
				.send({
					accessToken
				})
				.then(response => {
					if (response.body.error) {
						console.error(response.body.error)

						return
					}

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
		},
		getCredits (refresh = false) {
			return http.post(links.restUrl('ai/credits'))
				.send({
					refresh : refresh
				})
				.then(response => {
					if (response.body.error) {
						console.error(response.body.error)

						return
					}

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = merge(
						{},
						optionsStore.internalOptions.internal.ai,
						response.body.aiOptions
					)

					return response
				})
		},
		generateSocialPosts () {
			const postEditorStore = usePostEditorStore()
			const media           = this.socialPosts.selected.map(item => item.slug)

			return http.post(links.restUrl('ai/social-posts'))
				.send({
					postId      : postEditorStore.currentPost.id,
					postContent : getPostEditedContent(),
					permalink   : getPostPermalink(),
					options     : {
						media    : media,
						tone     : this.socialPosts.tone,
						audience : this.socialPosts.audience
					}
				})
				.then(response => {
					if (response.body.error) {
						console.error(response.body.error)

						return
					}

					postEditorStore.currentPost.ai.socialPosts = response.body.snippets

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
		},
		generateFaqs (rephrase = false) {
			const postEditorStore = usePostEditorStore()

			return http.post(links.restUrl('ai/faqs'))
				.send({
					postId      : postEditorStore.currentPost.id,
					postContent : getPostEditedContent(),
					options     : {
						tone     : this.faqs.tone,
						audience : this.faqs.audience
					},
					rephrase : rephrase,
					faqs     : postEditorStore.currentPost.ai.faqs
				})
				.then(response => {
					if (response.body.error) {
						console.error(response.body.error)
						return Promise.reject(response.body.error)
					}

					postEditorStore.currentPost.ai.faqs = response.body.faqs

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
		},
		generateSchemas (payload) {
			const postEditorStore = usePostEditorStore()

			return http.post(links.restUrl('ai/schema'))
				.send({
					postId : postEditorStore.currentPost.id,
					...payload
				})
				.then(response => {
					if (response.body.error) {
						return Promise.reject(response.body.error)
					}

					postEditorStore.currentPost.ai.schemas = response.body.schemas

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
		},
		generateKeyPoints (rephrase = false) {
			const postEditorStore = usePostEditorStore()

			return http.post(links.restUrl('ai/key-points'))
				.send({
					postId      : postEditorStore.currentPost.id,
					postContent : getPostEditedContent(),
					options     : {
						tone     : this.keyPoints.tone,
						audience : this.keyPoints.audience
					},
					rephrase,
					keyPoints : postEditorStore.currentPost.ai.keyPoints
				})
				.then(response => {
					if (response.body.error) {
						console.error(response.body.error)

						return
					}

					postEditorStore.currentPost.ai.keyPoints = response.body.keyPoints

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
		},
		generateMetaTitles (payload = {}) {
			const optionsStore = useOptionsStore()

			return http.post(links.restUrl('ai/meta/title'))
				.send({
					postId       : payload.postId,
					postContent  : payload?.postContent || '',
					focusKeyword : payload?.focusKeyword || '',
					rephrase     : payload?.rephrase || false,
					titles       : payload?.titles || [],
					options      : {
						tone     : this.metaTitle.tone || optionsStore.options.aiContent.tone,
						audience : this.metaTitle.audience || optionsStore.options.aiContent.audience
					}
				})
				.then(response => {
					if (response.body.error) {
						return Promise.reject(response.body.error)
					}

					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
				.catch(error => {
					throw error
				})
		},
		generateImageAlt (payload = {}) {
			return http.post(links.restUrl('ai/image/alt'))
				.send({
					attachmentId : payload.attachmentId
				})
				.then(response => {
					if (response.body.error) {
						return Promise.reject(response.body.error)
					}

					const optionsStore = useOptionsStore()
					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
				.catch(error => {
					throw error
				})
		},
		generateMetaDescriptions (payload = {}) {
			const optionsStore = useOptionsStore()

			return http.post(links.restUrl('ai/meta/description'))
				.send({
					postId       : payload.postId,
					postContent  : payload?.postContent || '',
					focusKeyword : payload?.focusKeyword || '',
					rephrase     : payload?.rephrase || false,
					descriptions : payload?.descriptions || [],
					options      : {
						tone     : this.metaDescription.tone || optionsStore.options.aiContent.tone,
						audience : this.metaDescription.audience || optionsStore.options.aiContent.audience
					}
				})
				.then(response => {
					if (response.body.error) {
						return Promise.reject(response.body.error)
					}

					optionsStore.internalOptions.internal.ai = response.body.aiOptions

					return response
				})
				.catch(error => {
					throw error
				})
		},
		deactivate () {
			return http.post(links.restUrl('ai/deactivate'))
				.send()
				.then(response => {
					if (!response.body.success) {
						throw new Error(response.body.message)
					}

					const optionsStore = useOptionsStore()

					if (response?.body?.aiData) {
						optionsStore.internalOptions.internal.ai = response.body.aiData
					}

					return response
				})
		}
	}
})