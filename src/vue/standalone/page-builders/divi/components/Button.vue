<template>
	<div
		class="et-vb-icon"
		:class="{ 'is-active': isModalOpen }"
		@click.prevent="$emit('click')"
		:title="strings.tooltip"
	>
		<svg-aioseo-logo-gear />
	</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

import SvgAioseoLogoGear from '@/vue/components/common/svg/aioseo/LogoGear'

defineEmits([ 'click' ])

const strings = {
	tooltip : import.meta.env.VITE_SHORT_NAME
}

const isModalOpen = ref(false)

const onModalState = (event) => {
	isModalOpen.value = event.detail.isOpen
}

onMounted(() => {
	document.addEventListener('aioseo-pagebuilder-modal-state', onModalState)
})

onBeforeUnmount(() => {
	document.removeEventListener('aioseo-pagebuilder-modal-state', onModalState)
})
</script>

<style lang="scss" scoped>
.et-vb-icon {
	width: var(--icon-width);
	height: var(--icon-height);
	min-width: var(--icon-min-width);

	svg {
		width: var(--icon-width);
		height: var(--icon-height);
	}

	&.is-active svg {
		color: $blue;
	}
}
</style>