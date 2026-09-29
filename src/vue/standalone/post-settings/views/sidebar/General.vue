<template>
	<div class="aioseo-tab-content aioseo-post-general sidebar">
		<core-settings-row
			v-if="allowed('aioseo_page_general_settings')"
			class="snippet-preview-row"
			no-right-max-width
		>
			<template #name>
				<div>
					<span>{{ strings.serpPreview }}</span>

					<core-tooltip
						:offset="'metabox' === props.parentComponentContext ? '10px,0' : '50px,0'"
						:placement="'bottom'"
					>
						<svg-circle-question-mark/>

						<template #tooltip>
							{{ strings.serpPreviewDocumentation }}
						</template>
					</core-tooltip>
				</div>
			</template>

			<template #content>
				<core-google-search-preview
					:focus-keyphrase="postEditorStore.truseoData?.focusKeyword ?? ''"
					:device="'metabox' === props.parentComponentContext ? 'mobile' : (postEditorStore.currentPost.generalMobilePrev ? 'mobile' : 'desktop')"
					:url="tagsStore.liveTags.permalink"
					:title="parseTags(postEditorStore.currentPost.title || postEditorStore.currentPost.tags.title || '#post_title #separator_sa #site_title')"
					:description="parseTags(postEditorStore.currentPost.description || postEditorStore.currentPost.tags.description || '#post_content')"
					:rich-results="seoPreviewStore.richResults"
				/>

				<base-button
					v-if="'modal' !== props.parentComponentContext"
					class="edit-snippet gray small"
					@click="editSnippetEv"
				>
					<svg-pencil />
					{{ strings.editSnippet }}
				</base-button>
			</template>
		</core-settings-row>

		<social-side-bar v-if="allowed('aioseo_page_social_settings')" />
	</div>
</template>

<script setup>
import { ref, watch } from 'vue'

import {
	usePostEditorStore,
	useSeoPreviewStore,
	useSettingsStore,
	useTagsStore
} from '@/vue/stores'

import { __ } from '@/vue/plugins/translations'
import { allowed } from '@/vue/utils/AIOSEO_VERSION'
import { useTags } from '@/vue/composables/Tags'
import { useTruSeoScore } from '@/vue/composables/TruSeoScore'
import { debounce } from '@/vue/utils/debounce'

import BaseButton from '@/vue/components/common/base/Button'
import CoreGoogleSearchPreview from '@/vue/components/common/core/GoogleSearchPreview'
import CoreSettingsRow from '@/vue/components/common/core/SettingsRow'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import SocialSideBar from '../SocialSideBar'
import SvgCircleQuestionMark from '@/vue/components/common/svg/circle/QuestionMark'
import SvgPencil from '@/vue/components/common/svg/Pencil'

const td = import.meta.env.VITE_TEXTDOMAIN

const props = defineProps({
	disabled : {
		type : Boolean,
		default () {
			return false
		}
	},
	parentComponentContext : String
})

const postEditorStore = usePostEditorStore()
const seoPreviewStore = useSeoPreviewStore()
const settingsStore   = useSettingsStore()
const tagsStore       = useTagsStore()

const editSnippet = ref(false)

const { parseTags } = useTags({ separator: undefined })
const { runAnalysis } = useTruSeoScore()

const strings = {
	serpPreview              : __('SERP Preview', td),
	serpPreviewDocumentation : __('SERP: Search Engine Results Page preview. Your site\'s potential appearance in Google search results. Final display may vary, but this preview closely resembles it.', td),
	editSnippet              : __('Edit Snippet', td)
}

const editSnippetEv = () => {
	editSnippet.value = !editSnippet.value
	settingsStore.changeTabSettings({ setting: 'modal', value: 'general' })
	postEditorStore.currentPost.modalOpen = true
}

watch(() => postEditorStore.currentPost.title, () => {
	debounce(() => { runAnalysis({ postId: postEditorStore.currentPost.id }) }, 750)
})

watch(() => postEditorStore.currentPost.description, () => {
	debounce(() => runAnalysis({ postId: postEditorStore.currentPost.id }), 750)
})
</script>
<style lang="scss">
// Sidebar-specific styles
.edit-post-sidebar,
.editor-sidebar {
	.aioseo-button.edit-snippet {
		display: inline-flex;
	}

	.snippet-focus-keyphrases-row {
		border-bottom: none;
		margin-bottom: 0 !important;
	}
}
</style>