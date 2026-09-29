<template>
	<svg
		:width="width"
		:height="height"
		:viewBox="getViewBox"
		role="img"
		aria-hidden="true"
		focusable="false"
	>
		<polygon
			:fill="fillColor"
			:points="polylinePoints"
		/>
		<polyline
			fill="none"
			:stroke="strokeColor"
			:strokeWidth="strokeWidth"
			strokeLinejoin="round"
			strokeLinecap="round"
			:points="polylinePoints"
		/>
	</svg>
</template>

<script>
export default {
	props : {
		width       : Number,
		height      : Number,
		fillColor   : String,
		strokeColor : String,
		strokeWidth : Number,
		data        : Array
	},
	computed : {
		getViewBox () {
			return '0 0 ' + this.width + ' ' + this.height
		},
		polylinePoints () {
			const maximumXFromData = Math.max(...this.data.map(point => point.x))
			const maximumYFromData = Math.max(...this.data.map(point => point.y))

			// Reserve some vertical spacing to prevent the SVG stroke from being cut-off.
			const chartHeight = this.height - this.strokeWidth

			const polylinePoints = this.data
				.map(point => {
					const maximumX = 0 === point.x ? 0 : (point.x / maximumXFromData)
					const maximumY = 0 === point.y ? 0 : (point.y / maximumYFromData)
					const x = maximumX * this.width
					// Add some vertical padding to make sure the line stroke is always drawn within the SVG.
					const y = chartHeight - maximumY * chartHeight + this.strokeWidth

					return `${x},${y}`
				})
				.join(' ')

			return `0,${chartHeight + this.strokeWidth} ` + polylinePoints + ` ${this.width},${chartHeight + this.strokeWidth}`
		}
	}
}
</script>