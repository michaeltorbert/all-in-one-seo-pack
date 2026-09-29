<template>
	<component
		:is="tag"
		:style="style"
		ref="container"
		@transitionend="onTransitionEnd"
		:aria-hidden="!active || null"
		:aria-expanded="active || null"
	>
		<slot
			v-if="!hidden"
		/>
	</component>
</template>

<script>
export default {
	emits : [ 'open-start', 'open-end', 'close-start', 'close-end' ],
	props : {
		active   : Boolean,
		duration : {
			type    : Number,
			default : 500
		},
		tag : {
			type    : String,
			default : 'div'
		},
		useHidden : {
			type    : Boolean,
			default : true
		}
	},
	data () {
		return {
			style        : {},
			initial      : false,
			hidden       : false,
			targetHeight : null
		}
	},
	watch : {
		active () {
			this.$nextTick(() => {
				this.layout()
			})
		}
	},
	computed : {
		el () {
			return this.$refs.container && this.$refs.container.$el ? this.$refs.container.$el : this.$refs.container || null
		}
	},
	methods : {
		layout () {
			if (this.active) {
				this.hidden = false
				this.$emit('open-start')
				if (this.initial) {
					this.setHeight('0px', () => this.el.scrollHeight + 'px')
				}
			} else {
				this.$emit('close-start')
				this.setHeight(this.el.scrollHeight + 'px', () => '0px')
			}
		},
		asap (callback) {
			if (!this.initial) {
				callback()
			} else {
				this.$nextTick(callback)
			}
		},
		setHeight (temp, afterRelayout) {
			this.style = { height: temp }

			this.asap(() => {
				// force relayout so the animation will run
				this.__ = this.el.scrollHeight

				this.targetHeight = afterRelayout()

				this.style = {
					height                : this.targetHeight,
					overflow              : 'hidden',
					'transition-property' : 'all',
					'transition-duration' : this.duration + 'ms'
				}
			})
		},
		reachedTargetHeight () {
			if (null === this.targetHeight) {
				return true
			}

			return 1 > Math.abs(this.el.getBoundingClientRect().height - parseFloat(this.targetHeight))
		},
		onTransitionEnd (event) {
			// Don't do anything if the transition doesn't belong to the container
			if (event.target !== this.el || 'height' !== event.propertyName) return

			// Re-toggling mid-flight supersedes the running transition, but the browser still
			// reports the old one's end. Settling on it would drop the height we just set.
			if (!this.reachedTargetHeight()) return

			if (this.active) {
				this.style = {}
				this.$emit('open-end')
			} else {
				this.style = {
					height   : '0',
					overflow : 'hidden'
				}
				this.hidden = true
				this.$emit('close-end')
			}
		}
	},
	mounted () {
		this.layout()
		this.initial = true
	},
	created () {
		this.hidden = !this.active
	}
}
</script>