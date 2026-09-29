/**
 * Marks a text with HTML tags
 *
 * @param {string} text The unmarked text.
 * @returns {string} The marked text.
 */
export default function (text) {
	return '<truseomark class=\'truseo-text-mark\'>' + text + '</truseomark>'
}