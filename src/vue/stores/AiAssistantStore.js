import { defineStore } from 'pinia'

import { allowed } from '@/vue/utils/AIOSEO_VERSION'
import { defaultFeatureCosts } from '@/vue/composables/AiContent'

import {
	useOptionsStore
} from '@/vue/stores'

export const useAiAssistantStore = defineStore('AiAssistantStore', {
	state : () => ({
		capability : 'aioseo_page_ai_content_settings',
		options    : {
			input : {
				userPrompt : {
					maxlength : 1000
				}
			}
		},
		extend : {
			block                     : true,
			blockEditorInserterButton : true,
			paragraphPlaceholder      : true
		},
		isBlockHiddenByUser : false
	}),
	getters : {
		isBlockEnabled   : (state) => state.extend.block,
		isBlockAvailable : (state) => state.extend.block && !state.isBlockHiddenByUser,
		hasPermission    : (state) => allowed(state.capability),
		generationPrice  : () => {
			const optionsStore   = useOptionsStore()
			const costPerFeature = optionsStore.internalOptions?.internal?.ai?.costPerFeature || {}

			return costPerFeature.aiAssistant || defaultFeatureCosts.aiAssistant
		}
	},
	actions : {
		updateBlockHiddenByUser () {
			const preferencesStore = window.wp?.data?.select('core/preferences')
			if (!preferencesStore) {
				return
			}

			// WP 6.5+ uses 'core' scope, older versions use 'core/edit-post'.
			const hiddenBlocks = preferencesStore.get('core', 'hiddenBlockTypes') ||
				preferencesStore.get('core/edit-post', 'hiddenBlockTypes') ||
				[]

			const isHidden = hiddenBlocks.includes('aioseo/ai-assistant')

			// Only update if changed to avoid unnecessary reactivity triggers.
			if (this.isBlockHiddenByUser !== isHidden) {
				this.isBlockHiddenByUser = isHidden
			}
		}
	}
})