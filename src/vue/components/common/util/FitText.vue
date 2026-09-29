<template>
	<span>
		<slot />
	</span>
</template>

<script>
export default {
	emits : [ 'resize' ],
	props : {
		targetLineCount : {
			default : 1,
			type    : Number
		},
		unit : {
			default : 'px',
			type    : String
		},
		min : {
			default : 12,
			type    : Number
		},
		max : {
			default : 36,
			type    : Number
		},
		constrainToElement : {
			type : [ Boolean, Element ],
			default () {
				return false
			}
		},
		elementPadding : {
			type : Number,
			default () {
				return 0
			}
		}
	},
	data () {
		return {
			observer : null
		}
	},
	methods : {
		calculate () {
			const element  = this.$el
			const stepSize = ('px' === this.unit) ? 1 : 0.05
			let fontSize   = this.max

			// First make it an inline block and set the line height to a fixed pixel value.
			element.style.display = 'inline-block'
			element.style.lineHeight = '1px'
			// then keep trying untill it fits
			element.style.fontSize = fontSize + this.unit
			if (this.constrainToElement) {
				while (
					element.offsetWidth > (this.constrainToElement.offsetWidth - this.elementPadding) &&
					fontSize > this.min
				) {
					fontSize -= stepSize
					element.style.fontSize = fontSize + this.unit
				}
			} else {
				while (element.offsetHeight > this.targetLineCount && fontSize > this.min) {
					fontSize -= stepSize
					element.style.fontSize = fontSize + this.unit
				}
			}

			this.$emit('resize', {
				size : fontSize,
				unit : this.unit
			})

			// Found it!!
			// Reset the styles.
			element.style.display    = null
			element.style.lineHeight = null
		}
	},
	mounted () {
		this.calculate()
		if ('MutationObserver' in window && null === this.observer) {
			// Create the observer (and what to do on changes...)
			this.observer = new MutationObserver(this.calculate)
			// Setup the observer
			this.observer.observe(
				this.$el,
				{ subtree: true, characterData: true }
			)
		}
		window.addEventListener('resize', this.calculate)
	},
	beforeUnmount : function () {
		// Clean up
		this.observer.disconnect()
		window.removeEventListener('resize', this.calculate)
	}
}
</script>