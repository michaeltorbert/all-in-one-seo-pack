<template>
	<div class="aioseo-blur">
		<slot
			class="blur"
		/>
	</div>
</template>

<style lang="scss">
.aioseo-blur {
	filter: blur(3px);
	pointer-events: none;
	user-select: none;
}
</style>