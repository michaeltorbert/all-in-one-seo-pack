<template>
	<core-modal
		:show="show"
		:classes="[
			'aioseo-ai-content-feature-modal',
			'aioseo-ai-content-meta-description-modal'
		]"
		:allow-overflow="currentScreen === 'settings'"
		@close="$emit('closeModal', true)"
	>
		<template #header>
			<div class="header-left">
				<svg-arrow-back
					v-if="currentScreen === 'results'"
					@click="currentScreen = 'settings'"
				/>

				<component
					:is="`svg-${feature.svg}`"
					class="aioseo-ai-content-feature-modal-icon"
				/>

				<span>{{ feature.strings.name }}</span>
			</div>

			<div class="header-right">
				<button
					class="close"
					type="button"
					@click.stop="$emit('closeModal', true)"
				>
					<svg-close @click="$emit('closeModal', true)" />
				</button>
			</div>
		</template>

		<template #body>
			<div class="aioseo-modal-body aioseo-ai-content-feature-modal-body">
				<div class="aioseo-ai-content-feature-modal-body-main">
					<template v-if="currentScreen === 'settings'">
						<div class="settings">
							<div class="settings-left">
								<step-header
									style="margin-left: -40px;"
									:header="strings.settingsHeader"
								/>

								<core-alert
									class="aioseo-ai-content-no-content-warning"
									v-if="!aiContent.hasEnoughContent()"
									type="red"
								>
									{{ aiContent.strings.noContentWarning }}
								</core-alert>

								<style-form optionsKey="metaDescription" />
							</div>
						</div>
					</template>

					<template v-if="currentScreen === 'loading'">
						<loader :loaders="loaders" />
					</template>

					<template v-if="currentScreen === 'results'">
						<div class="results">
							<titles-descriptions
								:suggestions="postEditorStore.currentPost.ai.descriptions"
								type="description"
								:generate-fn="generate"
								@closeModal="$emit('closeModal', true)"
							/>
						</div>
					</template>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="footer-left">
				<base-button
					v-if="currentScreen === 'results'"
					class="rephrase-button"
					size="small"
					type="gray"
					@click="event => generate(true)"
					:disabled="!aiContent.hasEnoughCredits(aiContent.getRephraseCost()) || !aiContent.hasEnoughContent()"
				>
					<svg-rephrase />

					{{ aiContent.strings.rephrase }}

					<credit-badge :cost="aiContent.getRephraseCost()" />
				</base-button>

				<credit-counter parent-component-context="modal" />
			</div>

			<div class="footer-right">
				<base-button
					v-if="currentScreen === 'settings' && 0 < postEditorStore.currentPost.ai.descriptions.length"
					class="view-button"
					size="small"
					type="gray"
					@click="event => currentScreen = 'results'"
				>
					<span>{{ aiContent.strings.viewPreviousResults }}</span>
				</base-button>

				<base-button
					v-if="currentScreen === 'settings'"
					class="generate-button"
					size="small"
					type="blue"
					@click="_event => generate(false)"
					:disabled="!aiContent.hasEnoughCredits(aiContent.getFeatureCost('descriptions')) || !aiContent.hasEnoughContent()"
				>
					{{ strings.generateButtonText }}

					<credit-badge :cost="aiContent.getFeatureCost('descriptions')" />
				</base-button>
			</div>
		</template>
	</core-modal>
</template>

<script>
import { ref } from 'vue'

import { useAiContent } from '@/vue/composables/AiContent'
import {
	useAiStore,
	usePostEditorStore
} from '@/vue/stores'

import { getPostEditedContent } from '@/vue/plugins/tru-seo/components/postContent'

import CoreAlert from '@/vue/components/common/core/alert/Index'
import CoreModal from '@/vue/components/common/core/modal/Index'
import CreditBadge from '@/vue/components/common/ai/CreditBadge'
import CreditCounter from '@/vue/components/common/ai/CreditCounter'
import TitlesDescriptions from './TitlesDescriptions.vue'

import Loader from './Loader'
import StepHeader from './StepHeader.vue'
import StyleForm from './StyleForm.vue'

import SvgArrowBack from '@/vue/components/common/svg/ArrowBack'
import SvgClose from '@/vue/components/common/svg/Close'
import SvgMetaDescription from '@/vue/components/common/svg/ai/MetaDescription'
import SvgRephrase from '@/vue/components/common/svg/ai/Rephrase'

import { __ } from '@/vue/plugins/translations'
const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	emits : [ 'closeModal' ],
	setup () {
		const aiContent       = useAiContent()
		const aiStore         = useAiStore()
		const postEditorStore = usePostEditorStore()
		const currentScreen   = ref(postEditorStore?.currentPost?.ai?.descriptions?.length ? 'results' : 'settings')
		const error           = ref(false)

		const generate = async (rephrase = false) => {
			error.value         = false
			currentScreen.value = 'loading'

			aiStore.generateMetaDescriptions({
				rephrase,
				postId       : postEditorStore.currentPost.id,
				postContent  : getPostEditedContent(),
				focusKeyword : postEditorStore.currentPost.keyphrases?.focus?.keyphrase || '',
				descriptions : postEditorStore.currentPost.ai.descriptions
			}).then((response) => {
				postEditorStore.currentPost.ai.descriptions = response.body.descriptions
				currentScreen.value = 'results'
			}).catch(() => {
				currentScreen.value = 'settings'
				error.value         = true
			})
		}

		const strings = {
			settingsHeader     : __('Select tone and audience', td),
			generateButtonText : __('Generate Meta Descriptions', td)
		}

		const loaders = [
			{
				slug  : 'meta-description',
				label : __('Meta Description', td),
				icon  : 'meta-description',
				name  : __('Meta Description', td)
			}
		]

		return {
			aiContent,
			aiStore,
			postEditorStore,
			currentScreen,
			error,
			generate,
			strings,
			loaders
		}
	},
	components : {
		CoreAlert,
		CoreModal,
		CreditBadge,
		CreditCounter,
		Loader,
		StepHeader,
		StyleForm,
		SvgArrowBack,
		SvgClose,
		SvgMetaDescription,
		SvgRephrase,
		TitlesDescriptions
	},
	props : {
		feature : {
			type     : Object,
			required : true
		},
		show : {
			type : Boolean,
			default () {
				return false
			}
		}
	}
}
</script>