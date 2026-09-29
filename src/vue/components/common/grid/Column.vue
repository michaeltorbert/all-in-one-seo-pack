<template>
	<div :class="classes"
		@transitionend="$emit('transitionend', $event)"
	>
		<slot></slot>
	</div>
</template>

<script>
export default {
	emits : [ 'transitionend' ],
	props : {
		firstXs  : { type: Boolean, default: false },
		lastXs   : { type: Boolean, default: false },
		firstSm  : { type: Boolean, default: false },
		lastSm   : { type: Boolean, default: false },
		firstMd  : { type: Boolean, default: false },
		lastMd   : { type: Boolean, default: false },
		firstLg  : { type: Boolean, default: false },
		lastLg   : { type: Boolean, default: false },
		firstXl  : { type: Boolean, default: false },
		lastXl   : { type: Boolean, default: false },
		xsOffset : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		smOffset : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		mdOffset : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		lgOffset : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		xlOffset : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		xs       : { type: String, default: '12', validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		sm       : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		md       : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		lg       : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		xl       : { type: String, validator (v) { const i = parseInt(v); return !isNaN(i) && 0 < v && 13 > v } },
		textXs   : { type: String, default: 'left', validator: v => [ 'left', 'center', 'right' ].includes(v) },
		textSm   : { type: String, validator: v => [ 'left', 'center', 'right' ].includes(v) },
		textMd   : { type: String, validator: v => [ 'left', 'center', 'right' ].includes(v) },
		textLg   : { type: String, validator: v => [ 'left', 'center', 'right' ].includes(v) },
		textXl   : { type: String, validator: v => [ 'left', 'center', 'right' ].includes(v) },
		oneFifth : { type: Boolean, required: false, default: false }
	},
	computed : {
		classes () {
			let c = 'aioseo-col'
			c += this.firstXs ? ' first-xs' : (this.lastXs ? ' last-xs' : '')
			c += this.firstSm ? ' first-sm' : (this.lastSm ? ' last-sm' : '')
			c += this.firstMd ? ' first-md' : (this.lastMd ? ' last-md' : '')
			c += this.firstLg ? ' first-lg' : (this.lastLg ? ' last-lg' : '')
			c += this.firstXl ? ' first-xl' : (this.lastXl ? ' last-xl' : '')
			c += this.xsOffset ? ' col-xs-offset-' + this.xsOffset : ''
			c += this.smOffset ? ' col-sm-offset-' + this.smOffset : ''
			c += this.mdOffset ? ' col-md-offset-' + this.mdOffset : ''
			c += this.lgOffset ? ' col-lg-offset-' + this.lgOffset : ''
			c += this.xlOffset ? ' col-xl-offset-' + this.xlOffset : ''
			c += ' col-xs-' + this.xs
			c += this.sm ? ' col-sm-' + this.sm : ''
			c += this.md ? ' col-md-' + this.md : ''
			c += this.lg ? ' col-lg-' + this.lg : ''
			c += this.xl ? ' col-xl-' + this.xl : ''
			c += ' text-xs-' + this.textXs
			c += this.textSm ? ' text-sm-' + this.textSm : ''
			c += this.textMd ? ' text-md-' + this.textMd : ''
			c += this.textLg ? ' text-lg-' + this.textLg : ''
			c += this.textXl ? ' text-xl-' + this.textXl : ''
			c += this.oneFifth ? ' col-md-24' : ''
			return c
		}
	}
}
</script>

<style lang="scss">
.aioseo-col {
	.reverse {
		flex-direction: column-reverse;
	}

	&.col-xs,
	&.col-xs-1,
	&.col-xs-2,
	&.col-xs-3,
	&.col-xs-4,
	&.col-xs-5,
	&.col-xs-6,
	&.col-xs-7,
	&.col-xs-8,
	&.col-xs-9,
	&.col-xs-10,
	&.col-xs-11,
	&.col-xs-12,
	&.col-xs-offset-0,
	&.col-xs-offset-1,
	&.col-xs-offset-2,
	&.col-xs-offset-3,
	&.col-xs-offset-4,
	&.col-xs-offset-5,
	&.col-xs-offset-6,
	&.col-xs-offset-7,
	&.col-xs-offset-8,
	&.col-xs-offset-9,
	&.col-xs-offset-10,
	&.col-xs-offset-11,
	&.col-xs-offset-12 {
		box-sizing: border-box;
		flex: 0 0 auto;
	}

	&.col-xs {
		flex-grow: 1;
		flex-basis: 0;
		max-width: 100%;
	}
	&.col-xs-1 {
		@include aioseoFlexRowSpan(1);
	}
	&.col-xs-2 {
		@include aioseoFlexRowSpan(2);
	}
	&.col-xs-3 {
		@include aioseoFlexRowSpan(3);
	}
	&.col-xs-4 {
		@include aioseoFlexRowSpan(4);
	}
	&.col-xs-5 {
		@include aioseoFlexRowSpan(5);
	}
	&.col-xs-6 {
		@include aioseoFlexRowSpan(6);
	}
	&.col-xs-7 {
		@include aioseoFlexRowSpan(7);
	}
	&.col-xs-8 {
		@include aioseoFlexRowSpan(8);
	}
	&.col-xs-9 {
		@include aioseoFlexRowSpan(9);
	}
	&.col-xs-10 {
		@include aioseoFlexRowSpan(10);
	}
	&.col-xs-11 {
		@include aioseoFlexRowSpan(11);
	}
	&.col-xs-12 {
		max-width: 100%;
		flex-basis: 100%;
	}
	&.col-xs-offset-0 {
		margin-left: 0;
	}
	&.col-xs-offset-1 {
		margin-left: 8.33333333%;
	}
	&.col-xs-offset-2 {
		margin-left: 16.66666667%;
	}
	&.col-xs-offset-3 {
		margin-left: 25%;
	}
	&.col-xs-offset-4 {
		margin-left: 33.33333333%;
	}
	&.col-xs-offset-5 {
		margin-left: 41.66666667%;
	}
	&.col-xs-offset-6 {
		margin-left: 50%;
	}
	&.col-xs-offset-7 {
		margin-left: 58.33333333%;
	}
	&.col-xs-offset-8 {
		margin-left: 66.66666667%;
	}
	&.col-xs-offset-9 {
		margin-left: 75%;
	}
	&.col-xs-offset-10 {
		margin-left: 83.33333333%;
	}
	&.col-xs-offset-11 {
		margin-left: 91.66666667%;
	}
	&.first-xs {
		order: -1;
	}
	&.last-xs {
		order: 1;
	}
	&.text-xs-left {
		text-align: left !important;
		justify-content: flex-start;
	}
	&.text-xs-center {
		text-align: center !important;
		justify-content: center;
	}
	&.text-xs-right {
		text-align: right !important;
		justify-content: flex-end;
	}
	&.p-0 {
		padding: 0 !important;
	}
	&.pt-0,
	&.py-0 {
		padding-top: 0 !important;
	}
	&.pr-0,
	&.px-0 {
		padding-right: 0 !important;
	}
	&.pb-0,
	&.py-0 {
		padding-bottom: 0 !important;
	}
	&.pl-0,
	&.px-0 {
		padding-left: 0 !important;
	}
	&.p-1 {
		padding: 0.25rem !important;
	}
	&.pt-1,
	&.py-1 {
		padding-top: 0.25rem !important;
	}
	&.pr-1,
	&.px-1 {
		padding-right: 0.25rem !important;
	}
	&.pb-1,
	&.py-1 {
		padding-bottom: 0.25rem !important;
	}
	&.pl-1,
	&.px-1 {
		padding-left: 0.25rem !important;
	}
	&.p-2 {
		padding: 0.5rem !important;
	}
	&.pt-2,
	&.py-2 {
		padding-top: 0.5rem !important;
	}
	&.pr-2,
	&.px-2 {
		padding-right: 0.5rem !important;
	}
	&.pb-2,
	&.py-2 {
		padding-bottom: 0.5rem !important;
	}
	&.pl-2,
	&.px-2 {
		padding-left: 0.5rem !important;
	}
	&.p-3 {
		padding: 1rem !important;
	}
	&.pt-3,
	&.py-3 {
		padding-top: 1rem !important;
	}
	&.pr-3,
	&.px-3 {
		padding-right: 1rem !important;
	}
	&.pb-3,
	&.py-3 {
		padding-bottom: 1rem !important;
	}
	&.pl-3,
	&.px-3 {
		padding-left: 1rem !important;
	}
	&.p-4 {
		padding: 1.5rem !important;
	}
	&.pt-4,
	&.py-4 {
		padding-top: 1.5rem !important;
	}
	&.pr-4,
	&.px-4 {
		padding-right: 1.5rem !important;
	}
	&.pb-4,
	&.py-4 {
		padding-bottom: 1.5rem !important;
	}
	&.pl-4,
	&.px-4 {
		padding-left: 1.5rem !important;
	}
	&.p-5 {
		padding: 3rem !important;
	}
	&.pt-5,
	&.py-5 {
		padding-top: 3rem !important;
	}
	&.pr-5,
	&.px-5 {
		padding-right: 3rem !important;
	}
	&.pb-5,
	&.py-5 {
		padding-bottom: 3rem !important;
	}
	&.pl-5,
	&.px-5 {
		padding-left: 3rem !important;
	}

	@media only screen and (min-width: 783px) {
		&.col-sm,
		&.col-sm-1,
		&.col-sm-2,
		&.col-sm-3,
		&.col-sm-4,
		&.col-sm-5,
		&.col-sm-6,
		&.col-sm-7,
		&.col-sm-8,
		&.col-sm-9,
		&.col-sm-10,
		&.col-sm-11,
		&.col-sm-12,
		&.col-sm-offset-0,
		&.col-sm-offset-1,
		&.col-sm-offset-2,
		&.col-sm-offset-3,
		&.col-sm-offset-4,
		&.col-sm-offset-5,
		&.col-sm-offset-6,
		&.col-sm-offset-7,
		&.col-sm-offset-8,
		&.col-sm-offset-9,
		&.col-sm-offset-10,
		&.col-sm-offset-11,
		&.col-sm-offset-12 {
			box-sizing: border-box;
			flex: 0 0 auto;
		}
		&.col-sm {
			flex-grow: 1;
			flex-basis: 0;
			max-width: 100%;
		}
		&.col-sm-1 {
			@include aioseoFlexRowSpan(1);
		}
		&.col-sm-2 {
			@include aioseoFlexRowSpan(2);
		}
		&.col-sm-3 {
			@include aioseoFlexRowSpan(3);
		}
		&.col-sm-4 {
			@include aioseoFlexRowSpan(4);
		}
		&.col-sm-5 {
			@include aioseoFlexRowSpan(5);
		}
		&.col-sm-6 {
			@include aioseoFlexRowSpan(6);
		}
		&.col-sm-7 {
			@include aioseoFlexRowSpan(7);
		}
		&.col-sm-8 {
			@include aioseoFlexRowSpan(8);
		}
		&.col-sm-9 {
			@include aioseoFlexRowSpan(9);
		}
		&.col-sm-10 {
			@include aioseoFlexRowSpan(10);
		}
		&.col-sm-11 {
			@include aioseoFlexRowSpan(11);
		}
		&.col-sm-12 {
			max-width: 100%;
			flex-basis: 100%;
		}
		&.col-sm-offset-0 {
			margin-left: 0;
		}
		&.col-sm-offset-1 {
			margin-left: 8.33333333%;
		}
		&.col-sm-offset-2 {
			margin-left: 16.66666667%;
		}
		&.col-sm-offset-3 {
			margin-left: 25%;
		}
		&.col-sm-offset-4 {
			margin-left: 33.33333333%;
		}
		&.col-sm-offset-5 {
			margin-left: 41.66666667%;
		}
		&.col-sm-offset-6 {
			margin-left: 50%;
		}
		&.col-sm-offset-7 {
			margin-left: 58.33333333%;
		}
		&.col-sm-offset-8 {
			margin-left: 66.66666667%;
		}
		&.col-sm-offset-9 {
			margin-left: 75%;
		}
		&.col-sm-offset-10 {
			margin-left: 83.33333333%;
		}
		&.col-sm-offset-11 {
			margin-left: 91.66666667%;
		}
		&.first-sm {
			order: -1;
		}
		&.last-sm {
			order: 1;
		}
		&.text-sm-left {
			text-align: left !important;
			justify-content: flex-start;
		}
		&.text-sm-center {
			text-align: center !important;
			justify-content: center;
		}
		&.text-sm-right {
			text-align: right !important;
			justify-content: flex-end;
		}
	}
	@media only screen and (min-width: 912px) {
		&.col-md,
		&.col-md-1,
		&.col-md-2,
		&.col-md-24,
		&.col-md-3,
		&.col-md-4,
		&.col-md-5,
		&.col-md-6,
		&.col-md-7,
		&.col-md-8,
		&.col-md-9,
		&.col-md-10,
		&.col-md-11,
		&.col-md-12,
		&.col-md-offset-0,
		&.col-md-offset-1,
		&.col-md-offset-2,
		&.col-md-offset-24,
		&.col-md-offset-3,
		&.col-md-offset-4,
		&.col-md-offset-5,
		&.col-md-offset-6,
		&.col-md-offset-7,
		&.col-md-offset-8,
		&.col-md-offset-9,
		&.col-md-offset-10,
		&.col-md-offset-11,
		&.col-md-offset-12 {
			box-sizing: border-box;
			flex: 0 0 auto;
		}
		&.col-md {
			flex-grow: 1;
			flex-basis: 0;
			max-width: 100%;
		}
		&.col-md-1 {
			@include aioseoFlexRowSpan(1);
		}
		&.col-md-2 {
			@include aioseoFlexRowSpan(2);
		}
		&.col-md-24 {
			@include aioseoFlexRowSpan(2.4);
		}
		&.col-md-3 {
			@include aioseoFlexRowSpan(3);
		}
		&.col-md-4 {
			@include aioseoFlexRowSpan(4);
		}
		&.col-md-5 {
			@include aioseoFlexRowSpan(5);
		}
		&.col-md-6 {
			@include aioseoFlexRowSpan(6);
		}
		&.col-md-7 {
			@include aioseoFlexRowSpan(7);
		}
		&.col-md-8 {
			@include aioseoFlexRowSpan(8);
		}
		&.col-md-9 {
			@include aioseoFlexRowSpan(9);
		}
		&.col-md-10 {
			@include aioseoFlexRowSpan(10);
		}
		&.col-md-11 {
			@include aioseoFlexRowSpan(11);
		}
		&.col-md-12 {
			max-width: 100%;
			flex-basis: 100%;
		}
		&.col-md-offset-0 {
			margin-left: 0;
		}
		&.col-md-offset-1 {
			margin-left: 8.33333333%;
		}
		&.col-md-offset-2 {
			margin-left: 16.66666667%;
		}
		&.col-md-offset-24 {
			margin-left: 20%;
		}
		&.col-md-offset-3 {
			margin-left: 25%;
		}
		&.col-md-offset-4 {
			margin-left: 33.33333333%;
		}
		&.col-md-offset-5 {
			margin-left: 41.66666667%;
		}
		&.col-md-offset-6 {
			margin-left: 50%;
		}
		&.col-md-offset-7 {
			margin-left: 58.33333333%;
		}
		&.col-md-offset-8 {
			margin-left: 66.66666667%;
		}
		&.col-md-offset-9 {
			margin-left: 75%;
		}
		&.col-md-offset-10 {
			margin-left: 83.33333333%;
		}
		&.col-md-offset-11 {
			margin-left: 91.66666667%;
		}
		&.first-md {
			order: -1;
		}
		&.last-md {
			order: 1;
		}
		&.text-md-left {
			text-align: left !important;
			justify-content: flex-start;
		}
		&.text-md-center {
			text-align: center !important;
			justify-content: center;
		}
		&.text-md-right {
			text-align: right !important;
			justify-content: flex-end;
		}
	}
	@media only screen and (min-width: 1042px) {
		&.col-lg,
		&.col-lg-1,
		&.col-lg-2,
		&.col-lg-3,
		&.col-lg-4,
		&.col-lg-5,
		&.col-lg-6,
		&.col-lg-7,
		&.col-lg-8,
		&.col-lg-9,
		&.col-lg-10,
		&.col-lg-11,
		&.col-lg-12,
		&.col-lg-offset-0,
		&.col-lg-offset-1,
		&.col-lg-offset-2,
		&.col-lg-offset-3,
		&.col-lg-offset-4,
		&.col-lg-offset-5,
		&.col-lg-offset-6,
		&.col-lg-offset-7,
		&.col-lg-offset-8,
		&.col-lg-offset-9,
		&.col-lg-offset-10,
		&.col-lg-offset-11,
		&.col-lg-offset-12 {
			box-sizing: border-box;
			flex: 0 0 auto;
		}
		&.col-lg {
			flex-grow: 1;
			flex-basis: 0;
			max-width: 100%;
		}
		&.col-lg-1 {
			@include aioseoFlexRowSpan(1);
		}
		&.col-lg-2 {
			@include aioseoFlexRowSpan(2);
		}
		&.col-lg-3 {
			@include aioseoFlexRowSpan(3);
		}
		&.col-lg-4 {
			@include aioseoFlexRowSpan(4);
		}
		&.col-lg-5 {
			@include aioseoFlexRowSpan(5);
		}
		&.col-lg-6 {
			@include aioseoFlexRowSpan(6);
		}
		&.col-lg-7 {
			@include aioseoFlexRowSpan(7);
		}
		&.col-lg-8 {
			@include aioseoFlexRowSpan(8);
		}
		&.col-lg-9 {
			@include aioseoFlexRowSpan(9);
		}
		&.col-lg-10 {
			@include aioseoFlexRowSpan(10);
		}
		&.col-lg-11 {
			@include aioseoFlexRowSpan(11);
		}
		&.col-lg-12 {
			max-width: 100%;
			flex-basis: 100%;
		}
		&.col-lg-offset-0 {
			margin-left: 0;
		}
		&.col-lg-offset-1 {
			margin-left: 8.33333333%;
		}
		&.col-lg-offset-2 {
			margin-left: 16.66666667%;
		}
		&.col-lg-offset-3 {
			margin-left: 25%;
		}
		&.col-lg-offset-4 {
			margin-left: 33.33333333%;
		}
		&.col-lg-offset-5 {
			margin-left: 41.66666667%;
		}
		&.col-lg-offset-6 {
			margin-left: 50%;
		}
		&.col-lg-offset-7 {
			margin-left: 58.33333333%;
		}
		&.col-lg-offset-8 {
			margin-left: 66.66666667%;
		}
		&.col-lg-offset-9 {
			margin-left: 75%;
		}
		&.col-lg-offset-10 {
			margin-left: 83.33333333%;
		}
		&.col-lg-offset-11 {
			margin-left: 91.66666667%;
		}
		&.first-lg {
			order: -1;
		}
		&.last-lg {
			order: 1;
		}
		&.text-lg-left {
			text-align: left !important;
			justify-content: flex-start;
		}
		&.text-lg-center {
			text-align: center !important;
			justify-content: center;
		}
		&.text-lg-right {
			text-align: right !important;
			justify-content: flex-end;
		}
	}
	@media only screen and (min-width: 1140px) {
		&.col-xl,
		&.col-xl-1,
		&.col-xl-2,
		&.col-xl-3,
		&.col-xl-4,
		&.col-xl-5,
		&.col-xl-6,
		&.col-xl-7,
		&.col-xl-8,
		&.col-xl-9,
		&.col-xl-10,
		&.col-xl-11,
		&.col-xl-12,
		&.col-xl-offset-0,
		&.col-xl-offset-1,
		&.col-xl-offset-2,
		&.col-xl-offset-3,
		&.col-xl-offset-4,
		&.col-xl-offset-5,
		&.col-xl-offset-6,
		&.col-xl-offset-7,
		&.col-xl-offset-8,
		&.col-xl-offset-9,
		&.col-xl-offset-10,
		&.col-xl-offset-11,
		&.col-xl-offset-12 {
			box-sizing: border-box;
			flex: 0 0 auto;
		}
		&.col-xl {
			flex-grow: 1;
			flex-basis: 0;
			max-width: 100%;
		}
		&.col-xl-1 {
			@include aioseoFlexRowSpan(1);
		}
		&.col-xl-2 {
			@include aioseoFlexRowSpan(2);
		}
		&.col-xl-3 {
			@include aioseoFlexRowSpan(3);
		}
		&.col-xl-4 {
			@include aioseoFlexRowSpan(4);
		}
		&.col-xl-5 {
			@include aioseoFlexRowSpan(5);
		}
		&.col-xl-6 {
			@include aioseoFlexRowSpan(6);
		}
		&.col-xl-7 {
			@include aioseoFlexRowSpan(7);
		}
		&.col-xl-8 {
			@include aioseoFlexRowSpan(8);
		}
		&.col-xl-9 {
			@include aioseoFlexRowSpan(9);
		}
		&.col-xl-10 {
			@include aioseoFlexRowSpan(10);
		}
		&.col-xl-11 {
			@include aioseoFlexRowSpan(11);
		}
		&.col-xl-12 {
			max-width: 100%;
			flex-basis: 100%;
		}
		&.col-xl-offset-0 {
			margin-left: 0;
		}
		&.col-xl-offset-1 {
			margin-left: 8.33333333%;
		}
		&.col-xl-offset-2 {
			margin-left: 16.66666667%;
		}
		&.col-xl-offset-3 {
			margin-left: 25%;
		}
		&.col-xl-offset-4 {
			margin-left: 33.33333333%;
		}
		&.col-xl-offset-5 {
			margin-left: 41.66666667%;
		}
		&.col-xl-offset-6 {
			margin-left: 50%;
		}
		&.col-xl-offset-7 {
			margin-left: 58.33333333%;
		}
		&.col-xl-offset-8 {
			margin-left: 66.66666667%;
		}
		&.col-xl-offset-9 {
			margin-left: 75%;
		}
		&.col-xl-offset-10 {
			margin-left: 83.33333333%;
		}
		&.col-xl-offset-11 {
			margin-left: 91.66666667%;
		}
		&.first-xl {
			order: -1;
		}
		&.last-xl {
			order: 1;
		}
		&.text-xl-left {
			text-align: left !important;
			justify-content: flex-start;
		}
		&.text-xl-center {
			text-align: center !important;
			justify-content: center;
		}
		&.text-xl-right {
			text-align: right !important;
			justify-content: flex-end;
		}
	}

}
</style>