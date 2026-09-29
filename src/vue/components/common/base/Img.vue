<template>
	<img
		v-if="canShow"
		:src="src"
	/>
</template>

<script>
import { debounce } from '@/vue/utils/debounce'
export default {
	emits : [ 'can-show', 'images' ],
	props : {
		src : String,
		tag : {
			type : String,
			default () {
				return 'img'
			}
		},
		debounce : {
			type : Boolean,
			default () {
				return true
			}
		}
	},
	data () {
		return {
			canShow : false,
			images  : {}
		}
	},
	watch : {
		src () {
			if (this.debounce) {
				debounce(this.maybeShowImage, 50)
				return
			}

			this.maybeShowImage()
		},
		canShow (val) {
			this.$emit('can-show', val)
		},
		images : {
			handler : function () {
				this.$emit('images', this.images)
			},
			deep : true
		}
	},
	methods : {
		async maybeShowImage () {
			this.canShow = false
			if (!this.src) {
				return
			}

			if (this.images[this.src]) {
				this.canShow = true
				return
			}

			const image = new Image()
			image.onload = await (() => {
				this.canShow = true

				let ratio    = 0
				const width  = image.width
				const height = image.height

				if (width && height) {
					ratio = width / height
				}

				if (this.images[this.src]) {
					return
				}

				this.images[this.src] = {
					image,
					ratio,
					vertical : width > height
				}
			})

			image.onerror = await (() => {
				this.canShow = false
			})

			image.src = this.src
		}
	},
	mounted () {
		this.maybeShowImage()
	}
}
</script>