<template>
	<div>
		<core-card
			slug="analyzeNewCompetitor"
			hide-header
			no-slide
			:toggles="false"
		>
			<component
				:is="!sensitiveOptionsStore.hasSiteAnalysisConnectToken ? CoreBlur : 'div'"
			>
				<slot />
			</component>

			<div
				v-if="!sensitiveOptionsStore.hasSiteAnalysisConnectToken"
				class="aioseo-seo-site-score-cta"
			>
				<a
					href="#"
					@click.prevent="openPopup(rootStore.aioseo.urls.connect)"
				>{{ connectWithAioseo }}</a> {{ strings.toAnalyzeCompetitorSite }}
			</div>
		</core-card>

		<template
			v-if="sensitiveOptionsStore.hasSiteAnalysisConnectToken"
		>
			<slot name="competitor-results" />
		</template>
	</div>
</template>

<script setup>
import {
	useConnectStore,
	useRootStore,
	useSensitiveOptionsStore
} from '@/vue/stores'

import { popup } from '@/vue/utils/popup'
import { useSeoSiteScore } from '@/vue/composables/SeoSiteScore'
import CoreBlur from '@/vue/components/common/core/Blur'
import CoreCard from '@/vue/components/common/core/Card'

const {
	connectWithAioseo,
	strings
} = useSeoSiteScore()

const rootStore             = useRootStore()
const sensitiveOptionsStore = useSensitiveOptionsStore()

const openPopup = (url) => {
	popup(
		url,
		connectWithAioseo,
		600,
		630,
		true,
		[ 'token' ],
		completedCallback,
		() => {}
	)
}

const connectStore = useConnectStore()
const completedCallback = (payload) => {
	return connectStore.saveConnectToken(payload.token)
}
</script>