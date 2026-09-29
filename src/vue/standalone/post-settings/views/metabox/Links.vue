<template>
	<div class="aioseo-tab-content aioseo-link-assistant">
		<core-card
			slug="postSettingsLinks"
			:noSlide="true"
			:hideHeader="true"
		>
			<Links
				v-if="!licenseStore.isUnlicensed && addons.isActive('aioseo-link-assistant') && !addons.requiresUpgrade('aioseo-link-assistant')"
				:parentComponentContext="parentComponentContext"
			/>

			<LinksLite
				v-if="licenseStore.isUnlicensed || addons.requiresUpgrade('aioseo-link-assistant')"
				:parentComponentContext="parentComponentContext"
			/>

			<LinksActivate
				v-if="!licenseStore.isUnlicensed && !addons.isActive('aioseo-link-assistant') && addons.canActivate('aioseo-link-assistant') && !addons.requiresUpgrade('aioseo-link-assistant')"
				:parentComponentContext="parentComponentContext"
			/>
		</core-card>
	</div>
</template>

<script>
import {
	useLicenseStore
} from '@/vue/stores'

import addons from '@/vue/utils/addons'
import Links from '../AIOSEO_VERSION/partials-links/Links'
import LinksActivate from '../AIOSEO_VERSION/partials-links/LinksActivate'
import LinksLite from '../lite/partials-links/Links'
import CoreCard from '@/vue/components/common/core/Card'

export default {
	setup () {
		return {
			addons,
			licenseStore : useLicenseStore()
		}
	},
	components : {
		CoreCard,
		Links,
		LinksActivate,
		LinksLite
	},
	props : {
		parentComponentContext : String
	}
}
</script>