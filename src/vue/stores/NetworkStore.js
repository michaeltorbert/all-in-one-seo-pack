import { defineStore } from 'pinia'
import http from '@/vue/utils/http'
import links from '@/vue/utils/links'
import { normalizeRules } from '@/vue/utils/robots'

import {
	useOptionsStore,
	useRootStore
} from '@/vue/stores'

export const useNetworkStore = defineStore('NetworkStore', {
	state : () => ({
		activeSites   : [],
		networkData   : {},
		networkRobots : {
			rules : []
		},
		currentSite : {}
	}),
	getters : {
		getNetworkRobots : () => {
			const optionsStore = useOptionsStore()
			return optionsStore.networkOptions.tools ? optionsStore.networkOptions.tools.robots : []
		}
	},
	actions : {
		fetchNetworkSites ({ orderBy, orderDir, limit, offset, searchTerm, filter }) {
			return http.post(links.restUrl(`network-sites/${filter}`))
				.send({
					orderBy,
					orderDir,
					limit,
					offset,
					searchTerm
				})
				.then(response => {
					const rootStore = useRootStore()
					rootStore.aioseo.data = {
						...rootStore.aioseo.data,
						...{
							network : {
								...rootStore.aioseo.data.network,
								sites : response.body.sites
							}
						}
					}

					this.networkData.sites = response.body.sites
				})
		},
		fetchSiteRobots (blogId) {
			return http.get(links.restUrl(`network-robots/${blogId}`))
				.then(response => {
					// Normalize at the store's entry point — the table's row indices have to line up with the store.
					this.networkRobots.rules = normalizeRules(response.body.rules)
				})
		},
		getActiveSites (domains) {
			return http.post(links.restUrl('activated'))
				.send({ domains })
				.then(response => {
					this.activeSites = response.body.activeSites
				})
		},
		importRobotsTxt ({ url, text, source, networkLevel, blogId }) {
			return http.post(links.restUrl('tools/import-robots-txt'))
				.send({
					url,
					text,
					source,
					networkLevel,
					blogId
				})
				.then(response => {
					return response
				})
		}
	}
})