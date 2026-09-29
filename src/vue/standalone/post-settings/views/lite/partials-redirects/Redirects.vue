<template>
	<div>
		<redirects-lite
			v-if="'metabox' === $root.$data.screenContext"
			:noCoreCard="true"
			:parentComponentContext="parentComponentContext"
		/>
	</div>
</template>

<script setup>
import RedirectsLite from '@/vue/pages/redirects/views/lite/redirects/Redirects'

defineProps({
	parentComponentContext : String
})
</script>