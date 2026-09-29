<template>
	<div class="aioseo-tab-content aioseo-post-social">
		<core-card
			slug="postSettingsSocialAppearance"
			card-id="postSettingsSocialAppearance"
			:header-text="strings.socialAppearance"
			:hide-header="'modal' === parentComponentContext"
			:toggles="'modal' !== parentComponentContext"
			:no-slide="'modal' === parentComponentContext"
			:deep-link-ids="[ 'aioseo-post-settings-facebook', 'aioseo-post-facebook-image-source', 'aioseo-post-settings-twitter' ]"
		>
			<core-settings-row
				no-border
			>
				<template #content>
					<core-main-tabs
						:tabs="tabs"
						:showSaveButton="false"
						:active="initTab"
						internal
						@changed="value => processChangeTab(value)"
						disableMobile
					/>
				</template>
			</core-settings-row>

			<transition
				name="route-fade"
				mode="out-in"
			>
				<component :is="initTab" />
			</transition>
		</core-card>
	</div>
</template>

<script>
import {
	useSettingsStore
} from '@/vue/stores'

import CoreCard from '@/vue/components/common/core/Card'
import CoreMainTabs from '@/vue/components/common/core/main/Tabs'
import CoreSettingsRow from '@/vue/components/common/core/SettingsRow'
import Facebook from '../Facebook'
import Twitter from '../Twitter'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	setup () {
		return {
			settingsStore : useSettingsStore()
		}
	},
	components : {
		CoreCard,
		CoreMainTabs,
		CoreSettingsRow,
		Facebook,
		Twitter
	},
	props : {
		parentComponentContext : String
	},
	data () {
		return {
			strings : {
				pageName         : __('Social', td),
				socialAppearance : __('Social Appearance', td)
			},
			tabs : [
				{
					slug : 'facebook',
					name : __('Facebook', td)
				},
				{
					slug : 'twitter',
					name : __('X (Twitter)', td)
				}
			]
		}
	},
	computed : {
		initTab : function () {
			let initTab = this.settingsStore.metaBoxTabs.social
			if ('modal' === this.parentComponentContext) {
				initTab = this.settingsStore.metaBoxTabs.socialModal
			}

			return initTab
		}
	},
	methods : {
		processChangeTab (newTabValue) {
			if ('modal' === this.parentComponentContext) {
				this.settingsStore.changeTabSettings({ setting: 'socialModal', value: newTabValue })
			} else {
				this.settingsStore.changeTabSettings({ setting: 'social', value: newTabValue })
			}
		}
	}
}
</script>