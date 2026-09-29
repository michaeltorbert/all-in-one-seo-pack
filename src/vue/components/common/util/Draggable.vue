<template>
	<div
		class="aioseo-draggable"
	>
		<div
			v-if="completelyDraggable"
			@dragMouseDown="dragMouseDown"
		>
			<slot/>
		</div>

		<div
			v-if="!completelyDraggable"
		>
			<slot/>
		</div>
	</div>

</template>

<script>
export default {
	props : {
		completelyDraggable : {
			type : Boolean,
			default () {
				return true
			}
		}
	},
	data () {
		return {
			position1 : 0,
			position2 : 0,
			position3 : 0,
			position4 : 0
		}
	},
	methods : {
		dragMouseDown (e) {
			e = e || window.event
			e.preventDefault()

			// Get the initial cursor position.
			this.position3 = e.clientX
			this.position4 = e.clientY

			document.onmousemove = this.elementDrag
			document.onmouseup   = this.closeDragElement
		},
		elementDrag (e) {
			e = e || window.event
			e.preventDefault()

			// Determine the new position of the cursor.
			this.position1 = this.position3 - e.clientX
			this.position2 = this.position4 - e.clientY
			this.position3 = e.clientX
			this.position4 = e.clientY

			// Set the position of the element based on that of the cursor.
			this.$el.style.top  = (this.$el.offsetTop - this.position2) + 'px'
			this.$el.style.left = (this.$el.offsetLeft - this.position1) + 'px'
		},
		closeDragElement () {
			document.onmouseup = null
			document.onmousemove = null
		}
	}
}
</script>

<style lang="scss">
.aioseo-draggable {
	position: absolute;
}
</style>