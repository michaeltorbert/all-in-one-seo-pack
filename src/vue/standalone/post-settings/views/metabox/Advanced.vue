<template>
	<div class="aioseo-tab-content aioseo-post-advanced">
		<core-card
			slug="postSettingsAdvanced"
			:noSlide="true"
			:hideHeader="true"
		>
			<advanced-main
				parent-component-context="metabox"
				@changeTab="newTab => $emit('changeTab', newTab)"
			/>
		</core-card>
	</div>
</template>

<script setup>
import CoreCard from '@/vue/components/common/core/Card'
import AdvancedMain from '../partials/advanced/Main'

defineEmits([ 'changeTab' ])
</script>