<template>
	<div class="aioseo-masonry">
		<slot />
	</div>
</template>

<style lang="scss">
.aioseo-masonry {
	column-count: 0;
	column-gap: var(--aioseo-gutter);
	counter-reset: brick-counter;

	> * {
		box-sizing: border-box;
		break-inside: avoid;
		counter-increment: brick-counter;
		margin-bottom: var(--aioseo-gutter);
	}

	@media only screen and (min-width: 783px) {
		column-count: 1;
	}
	@media only screen and (min-width: 912px) {
		column-count: 2;
	}
	@media only screen and (min-width: 1042px) {
		column-count: 3;
	}
}
</style>