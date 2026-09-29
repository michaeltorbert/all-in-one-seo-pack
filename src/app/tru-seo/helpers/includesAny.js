import { includes } from 'lodash-es'

/**
 * Checks if any of the values is in the collection.
 *
 * @param {Object|Array} collection The collection to check in.
 * @param {Array}        values     The array of values.
 *
 * @returns {boolean} Whether a value was found in the collection.
 */
export default function includesAny (collection, values) {
	for (const value of values) {
		if (includes(collection, value)) {
			return true
		}
	}

	return false
}