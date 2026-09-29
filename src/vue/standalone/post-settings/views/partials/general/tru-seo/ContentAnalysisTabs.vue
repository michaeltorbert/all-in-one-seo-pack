<template>
	<div class="aioseo-content-analysis-tabs">
		<button
			v-for="tab in tabs"
			:key="tab.slug"
			type="button"
			class="aioseo-content-analysis-tab"
			:class="{ active: tab.slug === modelValue }"
			@click="$emit('update:modelValue', tab.slug)"
		>
			<span class="aioseo-content-analysis-tab__label">{{ tab.label }}</span>

			<slot :name="tab.slug" />
		</button>
	</div>
</template>

<script setup>
defineEmits([ 'update:modelValue' ])

defineProps({
	modelValue : {
		type     : String,
		required : true
	},
	tabs : {
		type : Array,
		default () {
			return []
		}
	}
})
</script>

<style lang="scss">
.aioseo-content-analysis-tabs {
	display: flex;
	gap: 4px;
	padding: 8px 12px 0;
	border-bottom: 1px solid $border;
}

.aioseo-content-analysis-tab {
	appearance: none;
	border: 0;
	background: none;
	font: inherit;
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 10px 12px 12px;
	font-size: 13.5px;
	font-weight: $font-bold;
	color: $black;
	cursor: pointer;
	border-bottom: 2.5px solid transparent;
	margin-bottom: -1px;

	&.active {
		border-bottom-color: $blue;
	}
}
</style>