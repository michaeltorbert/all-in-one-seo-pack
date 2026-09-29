/**
 * Calculates the characters length of all the words in the array.
 *
 * @param {Array} wordsArray    The array of words to calculate.
 *
 * @returns {number} The characters length of all words in the array. Returns 0 if the input is an empty array.
 */
export default function (wordsArray) {
	const counts = []
	wordsArray.forEach(form => counts.push(form.length))

	return 0 === wordsArray.length ? 0 : counts.reduce((a, b) => a + b)
}