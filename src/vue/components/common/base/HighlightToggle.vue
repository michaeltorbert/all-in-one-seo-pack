<template>
	<div
		class="aioseo-highlight-toggle"
		:class="[
			{ active: active },
			{ disabled: disabled },
			{ [size]: size }
		]"
		@click="toggleCheckbox"
	>
		<component
			:is="`base-${type}`"
			ref="toggle"
			:name="name"
			:modelValue="modelValue"
			:size="size"
			:round="round"
			:disabled="disabled"
			:describedBy="describedBy"
			@update:modelValue="$emit('update:modelValue', $event)"
		>
			<slot />
		</component>
	</div>
</template>

<script>
import BaseCheckbox from '@/vue/components/common/base/Checkbox'
import BaseRadio from '@/vue/components/common/base/Radio'
export default {
	components : {
		BaseCheckbox,
		BaseRadio
	},
	props : {
		type : {
			type     : String,
			required : true
		},
		name : {
			type     : String,
			required : true
		},
		modelValue : {
			type     : [ Boolean, String, Event ],
			required : true
		},
		active      : Boolean,
		size        : String,
		round       : Boolean,
		disabled    : Boolean,
		// Id of the element explaining why the toggle is disabled, so the reason reaches
		// assistive technology instead of only being visible on screen.
		describedBy : String
	},
	methods : {
		toggleCheckbox () {
			this.$refs.toggle.labelToggle()
		}
	}
}
</script>

<style lang="scss">
.aioseo-highlight-toggle {
	border: 1px solid $border;
	border-radius: 3px;
	min-height: 40px;
	display: flex;
	align-items: center;
	padding: 5px 10px;
	cursor: pointer;

	> * {
		cursor: pointer;
		user-select: none;
	}

	&.active {
		border-color: $blue;
		box-shadow: 0px 5px 10px rgba(0, 90, 224, 0.1);
	}

	&.disabled {
		background-color: $box-background;
		cursor: default;

		> *,
		.icon {
			cursor: default;
		}

		&.active {
			border-color: $border;
			box-shadow: none;
		}
	}

	&.medium {
		min-height: 40px;
	}

	.icon {
		display: flex;
		align-items: center;
		margin-right: 5px;
	}
}
</style>