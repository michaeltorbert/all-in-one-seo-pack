<template>
	<div class="score-badge">
		<span
			class="score-badge-text"
			:class="[ stateClass, { 'is-bordered': !props.borderless, 'is-loading': props.loading } ]"
		>
			<core-loader
				v-if="props.loading"
				dark
				class="score-badge-loader"
			/>

			<template v-else>
				{{ parseInt(props.score) === 0 ? 'N/A' : `${props.score}/100` }}
			</template>
		</span>
	</div>
</template>

<script setup>
import { computed } from 'vue'

import CoreLoader from '@/vue/components/common/core/Loader'

const props = defineProps({
	score : {
		type     : Number,
		required : true
	},
	borderless : {
		type    : Boolean,
		default : false
	},
	loading : {
		type    : Boolean,
		default : false
	}
})

const getScoreClass = (score) => {
	if (80 <= score) {
		return 'is-green'
	}

	if (50 <= score) {
		return 'is-orange'
	}

	if (0 < score) {
		return 'is-red'
	}

	return 'is-none'
}

// Neutral pill while regenerating — the previous score's color is stale.
const stateClass = computed(() => props.loading ? 'is-none' : getScoreClass(props.score))
</script>

<style lang="scss" scoped>
.score-badge {
	display: flex;
	align-items: center;
}

.score-badge-text {
	display: inline-block;
	font-weight: $font-bold;
	font-size: 13px;

	// Stable footprint + flex centering so the box stays the same size whether it
	// shows the score or the loading spinner (prevents the jump on re-analysis).
	// Uses min-height so callers that force an explicit height (e.g. the metabox
	// header aligning it to the language control) still win.
	&.is-bordered {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 28px;
		min-width: 46px;
		padding: 0 12px;
		border-radius: 3px;
		border: 1px solid;
	}

	// Center the spinner in the borderless variant too.
	&.is-loading {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	&.is-green {
		color: $green;
		border-color: $green;
	}

	&.is-orange {
		color: $orange;
		border-color: $orange;
	}

	&.is-red {
		color: $red;
		border-color: $red;
	}

	&.is-none {
		color: $placeholder-color;
		background: $background;
		border-color: $input-border;
	}
}

// The shared spinner is 35px/absolute by default; shrink it to sit inside the
// pill. The descendant selector outweighs the sidebar's global
// `.aioseo-post-settings-sidebar-vue .aioseo-loading-spinner { margin-top: 30px }`,
// which would otherwise push the spinner down and stretch the badge.
.score-badge-text .score-badge-loader {
	position: relative;
	display: inline-block;
	width: 16px;
	height: 16px;
	margin: 0;
}
</style>