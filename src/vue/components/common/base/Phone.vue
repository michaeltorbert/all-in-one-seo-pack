<template>
	<vue-tel-input
		class="aioseo-phone-number"
		:class="{ invalidNumber: isInvalidNumber, validNumber: isValidNumber }"
		v-model="phoneNumber"
		mode="national"
		:preferred-countries="['US', 'GB', 'CA', 'AU', 'JP', 'RU', 'IN', 'TR', 'BR', 'MX']"
		:ignored-countries="['KP']"
		:input-options="inputOptions"
		:dropdown-options="dropdownOptions"
		:valid-characters-only="true"
		:auto-default-country="true"
		:strict-validation="true"
		@on-input="onInput"
	/>
</template>

<script>
import { VueTelInput } from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'
import dayjs from '@/vue/utils/dayjs'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	emits      : [ 'inputFormatted', 'update:modelValue' ],
	components : { VueTelInput },
	props      : {
		modelValue : String
	},
	data () {
		return {
			phoneNumber     : this.modelValue,
			isInvalidNumber : false,
			isValidNumber   : false,
			userInteracted  : false,
			inputOptions    : {
				placeholder : __('Phone number', td)
			},
			dropdownOptions : {
				showDialCodeInList      : true,
				showDialCodeInSelection : true,
				showFlags               : true,
				showSearchBox           : true,
				searchBoxPlaceholder    : __('Search', td)
			}
		}
	},
	methods : {
		onInput (number, phoneObject) {
			// Ignore events fired during component initialization (auto-format on mount).
			if (!this.userInteracted) {
				return
			}

			this.isInvalidNumber = false
			this.isValidNumber   = false

			if (phoneObject.valid) {
				this.isValidNumber = true

				// The formatted value is used for display inside our Business Info block/widget/shortcode.
				// Use `phoneObject.formatted` so the national trunk prefix (e.g. leading 0 in IN/GB/FR) and
				// digit grouping are preserved; `nationalNumber` is the E.164 NSN, which strips both.
				if (phoneObject.countryCallingCode && phoneObject.formatted) {
					this.$emit('inputFormatted', '+' + phoneObject.countryCallingCode + ' ' + phoneObject.formatted)
				}

				this.$emit('update:modelValue', phoneObject.number)
				return
			}

			// Only show invalid state if the user has typed a meaningful amount of digits.
			const digits = (number || '').replace(/\D/g, '')
			if (4 < digits.length) {
				this.isInvalidNumber = true
			}

			// If the input is cleared, also clear the model value AND the formatted
			// display value, otherwise the stale phoneFormatted lingers in the DB
			// and keeps rendering in the Business Info block/widget/shortcode.
			if (!number) {
				this.$emit('update:modelValue', '')
				this.$emit('inputFormatted', '')
			}
		}
	},
	mounted () {
		// Allow the component to finish initializing before processing input events.
		// vue-tel-input fires on-input during auto-formatting on mount, which we need to ignore.
		setTimeout(() => {
			this.userInteracted = true
		}, 500)

		// Prevent the browser from autofilling in a phone number.
		const timestamp = String(dayjs().valueOf())
		const value     = 'aioseo-phone-number-' + timestamp
		document.querySelectorAll('.aioseo-phone-number input').forEach((node) => {
			node.setAttribute('autocomplete', value)
		})
	}
}
</script>

<style lang="scss">
.aioseo-app .aioseo-phone-number.vue-tel-input {
	max-width: 600px;
	border: 1px solid $input-border;
	border-radius: 3px;
	font-size: 14px;

	&:focus-within {
		border-color: $blue;
		box-shadow: 0 0 0 1px $blue;
	}

	.vti__dropdown {
		background-color: #fff;
		border-right: 1px solid $input-border;
		border-radius: 3px 0 0 3px;
		padding: 0 8px;

		&:hover,
		&.open {
			background-color: #f9f9fa;
		}

		.vti__selection {
			.vti__country-code {
				font-size: 14px;
				color: #141B38;
			}

			.vti__dropdown-arrow {
				margin-left: 4px;
			}
		}
	}

	.vti__input {
		font-size: 14px;
		color: #141B38;
		padding: 8px 12px;
		border: none;
		outline: none;
		background: transparent;

		&::placeholder {
			color: #8C8F9A;
		}
	}

	.vti__dropdown-list {
		background: #fff;
		box-shadow: 0px 4px 26px rgba(44, 50, 76, 0.12);
		border: 1px solid $input-border;
		border-radius: 3px;
		margin-top: 3px;
		min-width: 275px;
		z-index: 100;
		padding: 0;

		.vti__search_box {
			padding: 8px;
			margin: 0;
			width: 100%;
			border: 1px solid $input-border;
			border-radius: 3px;
			font-size: 14px;
			box-sizing: border-box;
			outline: none;
		}

		.vti__dropdown-item {
			padding: 8px 12px;
			font-size: 14px;
			display: flex;
			align-items: center;
			gap: 6px;
			cursor: pointer;

			&:hover,
			&.highlighted {
				background-color: #f2f2f2;
			}

			&.last-preferred {
				border-bottom: 1px solid $input-border;
			}
		}
	}
}

.aioseo-app .aioseo-phone-number.invalidNumber.vue-tel-input {
	border-color: $red;
}

.aioseo-app .aioseo-phone-number.validNumber.vue-tel-input {
	border-color: $green;
}
</style>