<template>
	<div class="aioseo-tab-content aioseo-link-assistant-sidebar sidebar">
		<core-settings-row
			class="snippet-description-row open-link-assistant-copy"
		>
			<template #content>
				<div class="aioseo-sidebar-content-title">{{ strings.title }}</div>
				<p>{{ strings.description }}</p>
				<base-button
					class="open-link-assistant-modal gray small"
					@click="postEditorStore.currentPost.linkAssistant.modalOpen = true"
				>
					<svg-right-arrow-short />
					{{ strings.button }}
				</base-button>
			</template>
		</core-settings-row>

		<!-- Modal host for the sidebar. parentComponentContext="modal" suppresses the partial's own sidebar button since this view already renders it. -->
		<Links
			v-if="!licenseStore.isUnlicensed && addons.isActive('aioseo-link-assistant') && !addons.requiresUpgrade('aioseo-link-assistant')"
			parent-component-context="modal"
		/>

		<LinksLite
			v-if="licenseStore.isUnlicensed || addons.requiresUpgrade('aioseo-link-assistant')"
			parent-component-context="modal"
		/>

		<LinksActivate
			v-if="!licenseStore.isUnlicensed && !addons.isActive('aioseo-link-assistant') && addons.canActivate('aioseo-link-assistant') && !addons.requiresUpgrade('aioseo-link-assistant')"
			parent-component-context="modal"
		/>
	</div>
</template>

<script>
import {
	useLicenseStore,
	usePostEditorStore
} from '@/vue/stores'

import addons from '@/vue/utils/addons'

import CoreSettingsRow from '@/vue/components/common/core/SettingsRow'
import Links from '../AIOSEO_VERSION/partials-links/Links'
import LinksActivate from '../AIOSEO_VERSION/partials-links/LinksActivate'
import LinksLite from '../lite/partials-links/Links'
import SvgRightArrowShort from '@/vue/components/common/svg/right-arrow/Short'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	setup () {
		return {
			addons,
			licenseStore    : useLicenseStore(),
			postEditorStore : usePostEditorStore()
		}
	},
	components : {
		CoreSettingsRow,
		Links,
		LinksActivate,
		LinksLite,
		SvgRightArrowShort
	},
	data () {
		return {
			strings : {
				title       : __('Link Assistant', td),
				description : __('Here you can view an overview of your existing links as well as find suggestions for new internal links. Click on the button below to view the Link Assistant panel.', td),
				button      : __('Open Link Assistant', td)
			}
		}
	}
}
</script>

<style lang="scss">
.aioseo-link-assistant-sidebar {
	padding: 20px 16px;

	.open-link-assistant-modal {
		margin-top: 12px;
		border: 1px solid $gray;
		align-items: center;

		svg {
			margin-right: 8px;
			width: 10px;
			height: 10px;
		}
	}
	.open-link-assistant-copy > .col-md-3 {
		display: none;
	}
}
</style>