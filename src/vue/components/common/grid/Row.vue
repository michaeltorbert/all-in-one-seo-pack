<template>
	<div :class="classes">
		<slot></slot>
	</div>
</template>

<script>
export default {
	props : {
		reverse   : { type: Boolean, default: false },
		startXs   : { type: Boolean, default: false },
		centerXs  : { type: Boolean, default: false },
		endXs     : { type: Boolean, default: false },
		topXs     : { type: Boolean, default: false },
		middleXs  : { type: Boolean, default: false },
		bottomXs  : { type: Boolean, default: false },
		aroundXs  : { type: Boolean, default: false },
		betweenXs : { type: Boolean, default: false },
		startSm   : { type: Boolean, default: false },
		centerSm  : { type: Boolean, default: false },
		endSm     : { type: Boolean, default: false },
		topSm     : { type: Boolean, default: false },
		middleSm  : { type: Boolean, default: false },
		bottomSm  : { type: Boolean, default: false },
		aroundSm  : { type: Boolean, default: false },
		betweenSm : { type: Boolean, default: false },
		startMd   : { type: Boolean, default: false },
		centerMd  : { type: Boolean, default: false },
		endMd     : { type: Boolean, default: false },
		topMd     : { type: Boolean, default: false },
		middleMd  : { type: Boolean, default: false },
		bottomMd  : { type: Boolean, default: false },
		aroundMd  : { type: Boolean, default: false },
		betweenMd : { type: Boolean, default: false },
		startLg   : { type: Boolean, default: false },
		centerLg  : { type: Boolean, default: false },
		endLg     : { type: Boolean, default: false },
		topLg     : { type: Boolean, default: false },
		middleLg  : { type: Boolean, default: false },
		bottomLg  : { type: Boolean, default: false },
		aroundLg  : { type: Boolean, default: false },
		betweenLg : { type: Boolean, default: false }
	},
	computed : {
		classes () {
			let c = this.reverse ? 'aioseo-row reverse' : 'aioseo-row '
			c += this.startXs ? ' start-xs' : (this.centerXs ? ' center-xs' : (this.endXs ? ' end-xs' : ''))
			c += this.startSm ? ' start-sm' : (this.centerSm ? ' center-sm' : (this.endSm ? ' end-sm' : ''))
			c += this.startMd ? ' start-md' : (this.centerMd ? ' center-md' : (this.endMd ? ' end-md' : ''))
			c += this.startLg ? ' start-lg' : (this.centerLg ? ' center-lg' : (this.endLg ? ' end-lg' : ''))
			c += this.topXs ? ' top-xs' : (this.middleXs ? ' middle-xs' : (this.bottomXs ? ' bottom-xs' : ''))
			c += this.topSm ? ' top-sm' : (this.middleSm ? ' middle-sm' : (this.bottomSm ? ' bottom-sm' : ''))
			c += this.topMd ? ' top-md' : (this.middleMd ? ' middle-md' : (this.bottomMd ? ' bottom-md' : ''))
			c += this.topLg ? ' top-lg' : (this.middleLg ? ' middle-lg' : (this.bottomLg ? ' bottom-lg' : ''))
			c += this.aroundXs ? ' around-xs' : (this.betweenXs ? ' between-xs' : '')
			c += this.aroundSm ? ' around-sm' : (this.betweenSm ? ' between-sm' : '')
			c += this.aroundMd ? ' around-md' : (this.betweenMd ? ' between-md' : '')
			c += this.aroundLg ? ' around-lg' : (this.betweenLg ? ' between-lg' : '')
			return c
		}
	}
}
</script>

<style lang="scss">
.aioseo-row {
	box-sizing: border-box;
	display: flex;
	flex: 0 1 auto;
	flex-direction: row;
	flex-wrap: wrap;
	gap: var(--aioseo-gutter, 8px);

	&.reverse {
		flex-direction: row-reverse;
	}

	&.start-xs {
		justify-content: flex-start;
		text-align: start;
	}
	&.center-xs {
		justify-content: center;
		text-align: center;
	}
	&.end-xs {
		justify-content: flex-end;
		text-align: end;
	}
	&.top-xs {
		align-items: flex-start;
	}
	&.middle-xs {
		align-items: center;
	}
	&.bottom-xs {
		align-items: flex-end;
	}
	&.around-xs {
		justify-content: space-around;
	}
	&.between-xs {
		justify-content: space-between;
	}
	@media only screen and (min-width: 783px) {
		&.start-sm {
			justify-content: flex-start;
			text-align: start;
		}
		&.center-sm {
			justify-content: center;
			text-align: center;
		}
		&.end-sm {
			justify-content: flex-end;
			text-align: end;
		}
		&.top-sm {
			align-items: flex-start;
		}
		&.middle-sm {
			align-items: center;
		}
		&.bottom-sm {
			align-items: flex-end;
		}
		&.around-sm {
			justify-content: space-around;
		}
		&.between-sm {
			justify-content: space-between;
		}
	}
	@media only screen and (min-width: 912px) {
		&.start-md {
			justify-content: flex-start;
			text-align: start;
		}
		&.center-md {
			justify-content: center;
			text-align: center;
		}
		&.end-md {
			justify-content: flex-end;
			text-align: end;
		}
		&.top-md {
			align-items: flex-start;
		}
		&.middle-md {
			align-items: center;
		}
		&.bottom-md {
			align-items: flex-end;
		}
		&.around-md {
			justify-content: space-around;
		}
		&.between-md {
			justify-content: space-between;
		}
	}
	@media only screen and (min-width: 1042px) {
		&.start-lg {
			justify-content: flex-start;
			text-align: start;
		}
		&.center-lg {
			justify-content: center;
			text-align: center;
		}
		&.end-lg {
			justify-content: flex-end;
			text-align: end;
		}
		&.top-lg {
			align-items: flex-start;
		}
		&.middle-lg {
			align-items: center;
		}
		&.bottom-lg {
			align-items: flex-end;
		}
		&.around-lg {
			justify-content: space-around;
		}
		&.between-lg {
			justify-content: space-between;
		}
	}
}
</style>