import getSubheadingTexts from '@/app/tru-seo/languageProcessing/helpers/html/getSubheadingTexts'
import countWords from '@/app/tru-seo/languageProcessing/helpers/word/countWords'
import { forEach } from '@/app/tru-seo/helpers'
import removeHtmlBlocks from '@/app/tru-seo/languageProcessing/helpers/html/htmlParser'
import { filterShortcodesFromHTML } from '@/app/tru-seo/languageProcessing/helpers'

/**
 * @typedef {Object} SubheadingText The object containing the subheading and the text following the subheading.
 * @property {string} subheading The subheading.
 * @property {string} text The text following the subheading.
 * @property {number} countLength The length of the text following the subheading.
 * @property {number} [index] The index of the subheading in the text.
 */

/**
 * Gets the subheadings from the text and returns the text following of these subheading in an array.
 *
 * @param {Paper}       paper       The Paper object to get the text from.
 * @param {Researcher}  researcher  The researcher to use for analysis.
 *
 * @returns {SubheadingText[]} The array containing the object of found subheadings and the length of the text before the first subheading.
 */
export default function (paper, researcher) {
	let text = paper.getText(),
		textBeforeFirstSubheadingLength = 0,
	 textBeforeFirstSubheading = ''
	text = removeHtmlBlocks(text)
	text = filterShortcodesFromHTML(text, paper._attributes?.shortcodes)
	const matches = getSubheadingTexts(text)

	// An optional custom helper to count length to use instead of countWords.
	const customCountLength = researcher.getHelper('customCountLength')

	const foundSubheadings = []

	forEach(matches, function (match) {
		foundSubheadings.push({
			subheading  : match.subheading,
			text        : match.text,
			countLength : customCountLength ? customCountLength(match.text) : countWords(match.text),
			index       : match.index
		})
	})

	if (0 < foundSubheadings.length) {
		// Find first subheading.
		const firstSubheading =  foundSubheadings[0]
		// Retrieve text preceding first subheading.
		textBeforeFirstSubheading = text.slice(0, firstSubheading.index)
		textBeforeFirstSubheadingLength = customCountLength
			? customCountLength(textBeforeFirstSubheading)
			: countWords(textBeforeFirstSubheading)
	}

	// Check if there is a text before the first subheading.
	if (0 < textBeforeFirstSubheadingLength && '' !== textBeforeFirstSubheading) {
		// Also add the text before the first subheading to the array.
		foundSubheadings.unshift({
			// Assign an empty string for the subheading for text that comes before the first subheading.
			subheading  : '',
			text        : textBeforeFirstSubheading,
			countLength : textBeforeFirstSubheadingLength
		})
	}

	return foundSubheadings
}