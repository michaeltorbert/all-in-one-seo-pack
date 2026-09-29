/**
 * Splits words from an array that contain hyphens and adds the elements to the array if they are not yet there.
 *
 * @param {Array} array The array to check and modify.
 *
 * @returns {Array} A new array with the elements containing hyphens split.
 */
export default function (array) {
	let newArray = array
	array.forEach(element => {
		element = element.split('-')
		if (0 < element.length && 0 < element.filter(unit => !array.includes(unit)).length) {
			newArray = newArray.concat(element)
		}
	})
	return newArray
}