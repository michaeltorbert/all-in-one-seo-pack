<template>
	<core-modal
		v-if="'sidebar' === $root.$data.screenContext"
		modal-name="post-settings-sidebar-redirects"
		:show="postEditorStore.currentPost.redirects.modalOpen"
		:classes="[ 'aioseo-redirects' ]"
		@close="postEditorStore.currentPost.redirects.modalOpen = false"
	>
		<template #headerTitle>
			{{ strings.modalHeader }}
		</template>

		<template #body>
			<div class="bd">
				<redirects-lite
					:noCoreCard="true"
					:parentComponentContext="parentComponentContext"
				/>
			</div>
		</template>
	</core-modal>
</template>

<script setup>
import {
	usePostEditorStore
} from '@/vue/stores'

import CoreModal from '@/vue/components/common/core/modal/Index'
import RedirectsLite from '@/vue/pages/redirects/views/lite/redirects/Redirects'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const postEditorStore = usePostEditorStore()

const parentComponentContext = undefined

const strings = {
	modalHeader : __('Redirects', td)
}
</script>

<style lang="scss" scoped>
.open-redirects-modal {
	margin: 12px 0 12px 0;

	svg {
		margin-right: 8px;
		width: 10px;
		height: 10px;
	}
}
</style>