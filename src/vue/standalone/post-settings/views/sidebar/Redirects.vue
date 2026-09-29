<template>
	<div class="aioseo-tab-content aioseo-redirects-sidebar sidebar">
		<core-settings-row
			class="snippet-description-row open-redirects-copy"
		>
			<template #content>
				<div class="aioseo-sidebar-content-title">{{ strings.title }}</div>

				<p>{{ strings.description }}</p>

				<base-button
					class="open-redirects-modal gray small"
					@click="postEditorStore.currentPost.redirects.modalOpen = true"
				>
					<svg-right-arrow-short />
					{{ strings.button }}
				</base-button>
			</template>
		</core-settings-row>

		<redirects-sidebar />
	</div>
</template>

<script setup>
import {
	usePostEditorStore
} from '@/vue/stores'

import CoreSettingsRow from '@/vue/components/common/core/SettingsRow'
import RedirectsSidebar from '../AIOSEO_VERSION/sidebar/Redirects'
import SvgRightArrowShort from '@/vue/components/common/svg/right-arrow/Short'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const postEditorStore = usePostEditorStore()

const strings = {
	title       : __('Redirects', td),
	description : __('Here you can add a redirect or view your existing redirects from this page. Click on the button below to view the Redirects panel.', td),
	button      : __('Open Redirects', td)
}
</script>