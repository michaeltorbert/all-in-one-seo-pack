<template>
	<div class="aioseo-table-row">
		<slot />
	</div>
</template>

<style lang="scss">
.aioseo-table-row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	width: 100%;

	&.header-row {
		font-weight: 600;
	}
}
</style>