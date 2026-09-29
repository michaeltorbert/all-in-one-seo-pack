<template>
	<div
		class="aioseo-processing-popup"
	>
		<core-percent-circle
			:percentage="percentage"
		/>

		<div>
			<strong>{{ strings.header }}</strong>
			<br />{{ strings.description }}
		</div>

		<svg-close
			@click.native="$emit('close')"
		/>
	</div>
</template>

<script>
import CorePercentCircle from '@/vue/components/common/core/PercentCircle'
import SvgClose from '@/vue/components/common/svg/Close'
export default {
	emits      : [ 'close' ],
	components : {
		CorePercentCircle,
		SvgClose
	},
	props : {
		strings    : Object,
		percentage : Number
	}
}
</script>

<style lang="scss">
.aioseo-processing-popup {
	display: flex;
	max-width: 510px;
	position: fixed;
	bottom: 20px;
	right: 20px;
	filter: drop-shadow(0px 2px 10px rgba(0, 90, 224, 0.2));
	background: #FFF;
	border: 1px solid $gray;
	border-radius: 3px;
	padding: 15px 24px;
	color: $black;
	z-index: 1001;

	> div {
		margin-right: 20px;
	}

	> svg {
		position: absolute;
		right: 12px;
		top: 12px;
		color: $placeholder-color;
		cursor: pointer;
		width: 10px;
		height: 10px;
		min-width: 10px;
		min-height: 10px;

		&:hover {
			color: $black;
		}
	}
}

.fade-processing-popup-enter-active, .fade-processing-popup-leave-active {
	transition: opacity 1s, transform 1s ease-in-out;
}
.fade-processing-popup-enter-from, .fade-processing-popup-leave-to {
	opacity: 0;
	transform: translate3d(0, -100%, 0);
}
</style>