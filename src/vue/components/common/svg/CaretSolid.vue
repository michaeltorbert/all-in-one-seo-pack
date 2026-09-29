<template>
	<svg
		viewBox="0 0 11 6"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		class="aioseo-caret-solid"
		:class="'aioseo-caret-solid--' + direction"
	>
		<path d="M0.25 5.07812L5.25 0.078125L10.25 5.07812H0.25Z" fill="currentColor" />
	</svg>
</template>

<script>
export default {
	props : {
		direction : {
			type : String,
			default () {
				return 'down'
			}
		}
	}
}
</script>

<style lang="scss">
.aioseo-caret-solid {
	&--down {
		transform: rotate(-180deg);
	}
}
</style>