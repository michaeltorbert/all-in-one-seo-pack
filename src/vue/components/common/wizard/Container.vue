<template>
	<div class="aioseo-wizard-container">
		<slot />
	</div>
</template>

<style lang="scss">
.aioseo-wizard-container {
	margin: 40px auto;
	max-width: 850px;

	@media screen and (max-width: 782px) {
		margin: 0 20px;
	}
}
</style>