<template>
	<div class="aioseo-tab-content aioseo-localseo-maps">
		<core-card
			slug="localSeoMetaboxMaps"
			:noSlide="true"
			:hideHeader="true"
		>
			<!-- <local-business-map-measurement-system /> -->

			<local-business-map-default-style />

			<local-business-map-custom-marker />
		</core-card>
	</div>
</template>

<script>
import CoreCard from '@/vue/components/common/core/Card'
import LocalBusinessMapCustomMarker from '@/vue/components/AIOSEO_VERSION/local-business/map/CustomMarker'
import LocalBusinessMapDefaultStyle from '@/vue/components/AIOSEO_VERSION/local-business/map/DefaultStyle'
// import LocalBusinessMapMeasurementSystem from '@/vue/components/AIOSEO_VERSION/local-business/map/MeasurementSystem'
export default {
	components : {
		CoreCard,
		LocalBusinessMapCustomMarker,
		LocalBusinessMapDefaultStyle
		// LocalBusinessMapMeasurementSystem
	},
	data () {
		return {
			strings : { }
		}
	}
}
</script>

<style lang="scss">
.aioseo-localseo-maps {
	.aioseo-input,
	.aioseo-select,
	.aioseo-multiselect {
		max-width: 480px;
	}
	.field-description {
		font-size: 14px;
	}
}
</style>