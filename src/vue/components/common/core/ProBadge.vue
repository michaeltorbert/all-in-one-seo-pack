<template>
	<div class="aioseo-pro-badge">
		<slot>
			PRO
		</slot>
	</div>
</template>

<style lang="scss">
.aioseo-pro-badge {
	height: 22px;
	border-radius: 3px;
	background: $border;
	color: $black2;
	font-size: 12px;
	line-height: 18px;
	font-weight: $font-bold;
	display: inline-flex;
	padding: 0 4px;
	align-items: center;
}
</style>