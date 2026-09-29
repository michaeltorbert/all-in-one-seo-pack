import { defineStore } from 'pinia'
import dayjs from '@/vue/utils/dayjs'
import http from '@/vue/utils/http'
import links from '@/vue/utils/links'
import { __ } from '@/vue/plugins/translations'

import {
	useOptionsStore,
	usePostEditorStore,
	useSensitiveOptionsStore
} from '@/vue/stores'

const td = import.meta.env.VITE_TEXTDOMAIN

// The refresh token is single-use and a failed refresh clears both tokens server-side,
// so concurrent callers (the sidebar and metabox panels mount together) must share one
// request instead of racing each other into a disconnect.
let refreshRequest = null

export const useSemrushStore = defineStore('SemrushStore', {
	state : () => ({
		results : [],
		error   : null
	}),
	getters : {
		expired : () => {
			const optionsStore = useOptionsStore()
			if (!optionsStore.internalOptions.integrations.semrush.expires) {
				return true
			}

			const expires = dayjs(parseInt(optionsStore.internalOptions.integrations.semrush.expires * 1000, 10))

			return !dayjs().isBefore(expires)
		},
		hasValidTokens : (store) => {
			const sensitiveOptionsStore = useSensitiveOptionsStore()
			return !store.expired && sensitiveOptionsStore.hasSemrushAccessToken && sensitiveOptionsStore.hasSemrushRefreshToken
		}
	},
	actions : {
		getKeyphrases (database) {
			this.error = null
			const postEditorStore = usePostEditorStore()
			return http.post(links.restUrl('integration/semrush/keyphrases'))
				.send({
					keyphrase : postEditorStore.truseoData?.focusKeyword,
					database
				})
				.then(response => {
					if (403 === response.body.keyphrases.status) {
						this.error = response.body.keyphrases.error
						return
					}
					this.results = response.body.keyphrases.data.rows
				})
				.catch(error => {
					this.results = []

					if (!error?.response?.body?.message && !error?.response?.message) {
						this.error = __('An unknown error occurred, please try again later.', td)
						return
					}

					this.error = error?.response?.body?.message || error?.response?.message
				})
		},
		authenticate (code) {
			this.error = null
			return http.post(links.restUrl('integration/semrush/authenticate'))
				.send({
					code
				})
				.then(response => {
					const optionsStore = useOptionsStore()
					optionsStore.updateOption('internalOptions', { groups: [ 'integrations' ], key: 'semrush', value: response.body.semrush }, { root: true })
					optionsStore.internalOptions.integrations.semrush = response.body.semrush

					// The server persisted both tokens, but the response omits the `has*` flags; mirror them so hasValidTokens updates without a page reload.
					const sensitiveOptionsStore = useSensitiveOptionsStore()
					sensitiveOptionsStore.hasSemrushAccessToken  = true
					sensitiveOptionsStore.hasSemrushRefreshToken = true
				})
				.catch(error => {
					if (!error?.response?.body?.message) {
						this.error = __('An unknown error occurred, please try again later.', td)
						return
					}

					this.error = error.response.body.message
				})
		},
		refresh () {
			if (refreshRequest) {
				return refreshRequest
			}

			const sensitiveOptionsStore = useSensitiveOptionsStore()
			refreshRequest = http.post(links.restUrl('integration/semrush/refresh'))
				.then(response => {
					const optionsStore = useOptionsStore()
					optionsStore.updateOption('internalOptions', { groups: [ 'integrations' ], key: 'semrush', value: response.body.semrush }, { root: true })
					optionsStore.internalOptions.integrations.semrush = response.body.semrush

					sensitiveOptionsStore.hasSemrushAccessToken  = true
					sensitiveOptionsStore.hasSemrushRefreshToken = true
				}).catch(_error => { // eslint-disable-line no-unused-vars
					const optionsStore = useOptionsStore()
					optionsStore.updateOption('internalOptions', { groups: [ 'integrations' ], key: 'semrush', value: '' }, { root: true })
					optionsStore.internalOptions.integrations.semrush = ''

					// A failed refresh clears the tokens server-side (reset()), so drop the flags too.
					sensitiveOptionsStore.hasSemrushAccessToken  = false
					sensitiveOptionsStore.hasSemrushRefreshToken = false
				})
				.finally(() => {
					refreshRequest = null
				})

			return refreshRequest
		}
	}
})