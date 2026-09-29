<template>
	<div class="aioseo-tab-content">
		<core-card
			slug="postSettingsRedirects"
			:noSlide="true"
			:hideHeader="true"
		>

			<Redirects
				v-if="!licenseStore.isUnlicensed && rootStore.isPro"
				:parentComponentContext="parentComponentContext"
			/>

			<RedirectsLite
				v-if="licenseStore.isUnlicensed || !rootStore.isPro"
				:parentComponentContext="parentComponentContext"
			/>
		</core-card>
	</div>
</template>

<script setup>
import {
	useLicenseStore,
	useRootStore
} from '@/vue/stores'

import Redirects from '../AIOSEO_VERSION/partials-redirects/Redirects'
import RedirectsLite from '../lite/partials-redirects/Redirects'
import CoreCard from '@/vue/components/common/core/Card'

defineProps({
	parentComponentContext : String
})

const licenseStore = useLicenseStore()
const rootStore = useRootStore()
</script>