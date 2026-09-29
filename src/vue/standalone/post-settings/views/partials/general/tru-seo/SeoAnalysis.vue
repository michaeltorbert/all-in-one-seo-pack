<template>
	<div>
		<div class="basic-description">
			<p>{{ strings.basicsDescription }}</p>

			<hr class="basic-description__divider" />
		</div>

		<transition mode="out-in">
			<metaboxAnalysisDetail
				v-if="postEditorStore.truseoData?.truseo?.general"
				:analysisItems="postEditorStore.truseoData?.truseo?.general?.[initTab]"
				:tab="initTab"
			/>
		</transition>
	</div>
</template>

<script setup>
import { usePostEditorStore } from '@/vue/stores'

import { useTruSeoScore } from '@/vue/composables/TruSeoScore'

import metaboxAnalysisDetail from '../MetaboxAnalysisDetail'

const postEditorStore = usePostEditorStore()

const { strings } = useTruSeoScore()

const initTab = 'basic'
</script>

<style lang="scss">
.seo-analysis-card {
	.content {
		padding: 0 !important;
	}

	.basic-description {
		margin-top: 20px;
		padding: 0 20px;

		p {
			color: $black;
			font-size: 14px;
			line-height: 22px;
			margin: 0;
		}

		&__divider {
			width: 100%;
			margin-top: 20px;
			margin-bottom: 4px;
			background: $gray;
			height: 1px;
		}
	}
}
</style>