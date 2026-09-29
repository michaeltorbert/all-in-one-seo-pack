<template>
	<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="aioseo-message">
		<path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M16 2H3C2.45 2 2 2.45 2 3V17L6 13H16C16.55 13 17 12.55 17 12V3C17 2.45 16.55 2 16 2ZM15 4V11H5.17L4 12.17V4H15ZM19 6H21C21.55 6 22 6.45 22 7V22L18 18H7C6.45 18 6 17.55 6 17V15H19V6Z"
			fill="currentColor"
		/>
		<path
			fill="currentColor"
			d="M 5 5 H 14 v 2 H 5 z M 5 8 h 8 v 1.896 h -8 z"
			:style="{ opacity: active ? 1 : 0 }"
		/>
	</svg>
</template>
<script>
export default {
	props : {
		active : {
			type : Boolean,
			default () {
				return false
			}
		}
	}
}
</script>