<template>
	<div class="aioseo-ai-content-settings">
		<core-card
			slug="aiContentSettings"
			:header-text="strings.aiContentSettings"
		>
			<ai-content-main />
		</core-card>
	</div>
</template>

<script setup>
import AiContentMain from '@/vue/pages/settings/views/partials/AiContent/Main'
import CoreCard from '@/vue/components/common/core/Card'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const strings = {
	aiContentSettings : __('AI Content Settings', td)
}
</script>