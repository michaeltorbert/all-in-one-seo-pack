<template>
	<div class="aioseo-app aioseo-primary-term">
		<primary-term :taxonomy="taxonomy" />
	</div>
</template>

<script>
import PrimaryTerm from './views/AIOSEO_VERSION/PrimaryTerm'

export default {
	components : {
		PrimaryTerm
	},
	props : {
		taxonomy : String
	}
}
</script>

<style lang="scss">
.aioseo-primary-term {
	&:not(:empty) {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid $gray;
	}
}
</style>