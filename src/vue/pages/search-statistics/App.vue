<template>
	<div class="aioseo-app">
		<router-view />

		<fetching />
	</div>
</template>

<script>
import Fetching from './views/partials/FetchingModal'
export default {
	components : {
		Fetching
	}
}
</script>