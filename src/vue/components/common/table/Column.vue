<template>
	<div class="aioseo-table-column">
		<slot />
	</div>
</template>

<style lang="scss">
.aioseo-table-column {
	display: flex;
	flex-direction: column;
	flex: 1;
	padding: 5px;
	justify-content: center;
	line-height: 22px;
}
</style>