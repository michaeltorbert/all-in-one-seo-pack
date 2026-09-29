<template>
	<div class="additional-keyphrases-panel">
		<additional-keyphrases-display
			v-if="hasLicense"
			:keyphrases="postEditorStore.truseoData?.additionalKeywords || []"
			:selected-keyphrase="selectedKeyphrase"
			:loading="postEditorStore.currentPost.loading.additional"
			@saved="handleSaved"
			@deleted="handleDeleted"
			@selected="handleSelectedKeyphrase"
		/>

		<additional-keyphrase-input
			v-if="hasLicense"
			:screen-context="$root.$data.screenContext"
			:max-reached="maxReached"
			:max-additional-keyphrases="postEditorStore.currentPost.maxAdditionalKeyphrases"
			@add="handleAdd"
		/>

		<additional-keyphrases-upsell
			v-if="!hasLicense"
		/>
	</div>
</template>

<script>
import {
	useLicenseStore,
	usePostEditorStore,
	useRootStore
} from '@/vue/stores'

import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'

import {
	updateAdditionalKeyphrase,
	deleteAdditionalKeyphraseByIndex,
	addAdditionalKeyphraseFromInput
} from '@/vue/utils/additionalKeyphrasesManager'

import AdditionalKeyphrasesDisplay from './additional-keyphrases/AdditionalKeyphrasesDisplay'
import AdditionalKeyphraseInput from './additional-keyphrases/AdditionalKeyphraseInput'
import AdditionalKeyphrasesUpsell from './additional-keyphrases/AdditionalKeyphrasesUpsell'
import { additionalKeywordLimitReached } from '@/vue/utils/postData/helpers'

export default {
	setup () {
		return {
			licenseStore    : useLicenseStore(),
			postEditorStore : usePostEditorStore(),
			rootStore       : useRootStore(),
			truSeo          : null
		}
	},
	components : {
		AdditionalKeyphrasesDisplay,
		AdditionalKeyphraseInput,
		AdditionalKeyphrasesUpsell
	},
	data () {
		return {
			selectedKeyphrase : 0
		}
	},
	watch : {
		'postEditorStore.currentPost.additionalKeywords' () {
			if (this.postEditorStore.truseoData?.additionalKeywords?.length && !this.postEditorStore.truseoData?.additionalKeywords[this.selectedKeyphrase]) {
				this.selectedKeyphrase = 0
			}
		}
	},
	computed : {
		hasLicense () {
			return this.rootStore.isPro && this.licenseStore.license.isActive
		},
		maxReached () {
			return additionalKeywordLimitReached(
				this.postEditorStore.currentPost.maxAdditionalKeyphrases,
				this.postEditorStore.currentPost.keyphrases?.additional?.length || 0
			)
		}
	},
	methods : {
		handleSelectedKeyphrase (index) {
			this.selectedKeyphrase = index
		},
		handleSaved (payload) {
			const { index, value } = payload
			updateAdditionalKeyphrase({
				postEditorStore : this.postEditorStore,
				truSeo          : this.truSeo,
				index           : index,
				value           : value,
				onSuccess       : (updatedIndex) => {
					this.selectedKeyphrase = updatedIndex
				}
			})
		},
		handleDeleted (index) {
			deleteAdditionalKeyphraseByIndex({
				postEditorStore : this.postEditorStore,
				truSeo          : this.truSeo,
				index           : index
			})
		},
		handleAdd () {
			const index = addAdditionalKeyphraseFromInput({
				postEditorStore : this.postEditorStore,
				truSeo          : this.truSeo,
				screenContext   : this.$root.$data.screenContext,
				onSuccess       : (newIndex) => {
					this.selectedKeyphrase = newIndex
				}
			})

			if (null !== index) {
				this.selectedKeyphrase = index
			}
		}
	},
	created () {
		this.postEditorStore.truseoData?.additionalKeywords?.forEach((_keyphrase, index) => {
			this.postEditorStore.currentPost.loading.additional[index] = false
		})
	},
	async mounted () {
		this.truSeo = await getTruSeoInstance()

		this.selectedKeyphrase = (this.postEditorStore.truseoData?.additionalKeywords?.length - 1) ?? 0
	}
}
</script>

<style lang="scss" scoped>
.aioseo-description.additional-keyphrases-description {
	margin: 0 0 12px;
}

.edit-post-sidebar .aioseo-app,
.editor-sidebar .aioseo-app {
	.aioseo-description.additional-keyphrases-description {
		margin: 0 0 12px;
	}
}

.additional-keyphrases-panel {
	.aioseo-analysis-detail {
		padding: 20px 0 !important;
	}

	.aioseo-tooltip {
		margin-left: 0 !important;

		svg {
			cursor: pointer;
		}
	}
}
</style>