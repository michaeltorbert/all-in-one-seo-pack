import { defineStore } from 'pinia'
import http from '@/vue/utils/http'
import links from '@/vue/utils/links'

import {
	useLicenseStore,
	useSetupWizardStore,
	useSensitiveOptionsStore
} from '@/vue/stores'

export const useConnectStore = defineStore('ConnectStore', {
	state   : () => ({}),
	getters : {
		isConnected : () => {
			const licenseStore = useLicenseStore()
			const sensitiveOptionsStore = useSensitiveOptionsStore()
			return (
				'pro' !== import.meta.env.VITE_VERSION.toLowerCase() &&
				sensitiveOptionsStore.hasSiteAnalysisConnectToken
			) ||
			licenseStore.license.isActive
		}
	},
	actions : {
		getConnectUrl ({ key, wizard }) {
			return http.post(links.restUrl('connect-url'))
				.send({
					licenseKey : key.trim(),
					wizard
				})
		},
		processConnect (payload) {
			const setupWizardStore = useSetupWizardStore()
			return http.post(links.restUrl('connect-pro'))
				.send({
					downloadUrl : payload.file,
					token       : payload.token,
					wizard      : payload.wizard ? JSON.stringify(setupWizardStore.wizard.$state) : null
				})
		},
		saveConnectToken (token) {
			const sensitiveOptionsStore = useSensitiveOptionsStore()
			sensitiveOptionsStore.hasSiteAnalysisConnectToken = true

			return http.post(links.restUrl('connect'))
				.send({
					token
				})
		}
	}
})