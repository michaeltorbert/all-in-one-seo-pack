import { measureTextWidth } from '@/vue/utils/measureTextWidth'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

// Below this the counters are more noise than signal, so they're dropped rather than
// wrapped. Posts and terms share the threshold because they share the column.
export const MIN_WIDTH_FOR_BADGES = 200

// Titles are gauged in pixels because that's what search engines truncate on; descriptions
// are gauged in characters. Recommended ranges follow the field settings' own counters.
const RANGES = {
	title       : { min: 400, max: 600, overRating: 'bad', unit: 'px' },
	description : { min: 120, max: 160, overRating: 'warn', unit: 'chars' }
}

/**
 * Builds the length counter for a details-column field.
 *
 * @returns {Object} { count, rating, suffix, tooltip } for DetailsField's `length` prop.
 */
export const useDetailsFieldLength = () => {
	const tooltips = {
		chars : (count, min, max) => sprintf(
			// Translators: 1 - The number of characters, 2 - The recommended minimum number of characters, 3 - The recommended maximum number of characters.
			__('%1$s characters (recommended %2$s-%3$s)', td),
			count,
			min,
			max
		),
		px : (count, min, max) => sprintf(
			// Translators: 1 - The width in pixels, 2 - The recommended minimum width in pixels, 3 - The recommended maximum width in pixels.
			__('%1$spx wide (recommended %2$s-%3$spx)', td),
			count,
			min,
			max
		)
	}

	const getLengthMeta = (count, { min, max, overRating, unit }) => {
		let rating = 'ok'
		if (!count) {
			rating = 'bad'
		} else if (count > max) {
			rating = overRating
		} else if (count < min) {
			rating = 'warn'
		}

		return {
			count,
			rating,
			suffix  : 'px' === unit ? unit : '',
			tooltip : tooltips[unit](count.toLocaleString(), min, max)
		}
	}

	const getTitleLength       = value => getLengthMeta(Math.round(measureTextWidth(value || '')), RANGES.title)
	const getDescriptionLength = value => getLengthMeta((value || '').length, RANGES.description)

	return {
		getTitleLength,
		getDescriptionLength
	}
}