<template>
	<span class="focus-badge">
		{{ strings.focusKeyword }}
	</span>
</template>

<script setup>
import { __ } from '@wordpress/i18n'

const td = import.meta.env.VITE_TEXTDOMAIN

const strings = {
	focusKeyword : __('Focus Keyword', td)
}
</script>

<style lang="scss" scoped>
.focus-badge {
	display: inline-flex;
	align-items: center;
	padding: 0 12px;
	background: $blue4;
	border: 1px solid $blue;
	border-radius: 100px;
	font-size: 12px;
	font-weight: 700;
	color: $blue;
}
</style>