import createRegexFromDoubleArray from '@/app/tru-seo/languageProcessing/helpers/regex/createRegexFromDoubleArray.js'
import getSentences from '@/app/tru-seo/languageProcessing/helpers/sentence/getSentences.js'
import { normalizeSingle as normalizeSingleQuotes } from '@/app/tru-seo/languageProcessing/helpers/sanitize/quotes.js'
import { isWordInSentence as matchWordInSentence } from '@/app/tru-seo/languageProcessing/helpers/word/matchWordInSentence.js'
import removeHtmlBlocks from '@/app/tru-seo/languageProcessing/helpers/html/htmlParser'

import flattenDeep from 'lodash-es/flattenDeep'
import { filterShortcodesFromHTML } from '@/app/tru-seo/languageProcessing/helpers'

let regexFromDoubleArray = null,
	regexFromDoubleArrayCacheKey = ''

/**
 * Memoizes the createRegexFromDoubleArray with the twoPartTransitionWords.
 *
 * @param {Array} twoPartTransitionWords The array containing two-part transition words.
 *
 * @returns {RegExp} The RegExp to match text with a double array.
 */
function getRegexFromDoubleArray (twoPartTransitionWords) {
	const cacheKey = flattenDeep(twoPartTransitionWords).join('')
	if (regexFromDoubleArrayCacheKey !== cacheKey || null === regexFromDoubleArray) {
		regexFromDoubleArrayCacheKey = cacheKey
		regexFromDoubleArray = createRegexFromDoubleArray(twoPartTransitionWords)
	}
	return regexFromDoubleArray
}

/**
 * Matches the sentence against two part transition words.
 *
 * @param {string} sentence The sentence to match against.
 * @param {Array} twoPartTransitionWords The array containing two-part transition words.
 * @returns {Array} The found transitional words.
 */
const matchTwoPartTransitionWords = function (sentence, twoPartTransitionWords) {
	sentence = normalizeSingleQuotes(sentence)
	const twoPartTransitionWordsRegex = getRegexFromDoubleArray(twoPartTransitionWords)
	return sentence.match(twoPartTransitionWordsRegex)
}

/**
 * Matches the sentence against transition words.
 *
 * @param {string} sentence The sentence to match against.
 * @param {Array} transitionWords The array containing transition words.
 * @returns {Array} The found transitional words.
 */
const matchTransitionWords = function (sentence, transitionWords) {
	sentence = normalizeSingleQuotes(sentence)
	return transitionWords.filter(word => matchWordInSentence(word, sentence))
}

/**
 * Checks the passed sentences to see if they contain transition words.
 *
 * @param {Array} sentences The sentences to match against.
 * @param {Array} transitionWords The array containing transition words.
 * @param {Array} twoPartTransitionWords The array containing two part transition words.
 * @param {Function} matchTransitionWordsHelper The language-specific helper function to match transition words in a sentence.
 *
 * @returns {Object} An object with `withTransitionWords` (sentence objects containing the
 *                   complete sentence and its transition words) and `withoutTransitionWords`
 *                   (the sentences that contain none).
 */
const checkSentencesForTransitionWords = function (sentences, transitionWords, twoPartTransitionWords, matchTransitionWordsHelper) {
	const withTransitionWords    = []
	const withoutTransitionWords = []

	sentences.forEach(sentence => {
		if (twoPartTransitionWords) {
			const twoPartMatches = matchTwoPartTransitionWords(sentence, twoPartTransitionWords)

			if (null !== twoPartMatches) {
				withTransitionWords.push({
					sentence        : sentence,
					transitionWords : twoPartMatches
				})

				return
			}
		}

		const transitionWordMatches = matchTransitionWordsHelper
			? matchTransitionWordsHelper(sentence, transitionWords)
			: matchTransitionWords(sentence, transitionWords)

		if (0 !== transitionWordMatches.length) {
			withTransitionWords.push({
				sentence        : sentence,
				transitionWords : transitionWordMatches
			})
		} else {
			withoutTransitionWords.push(sentence)
		}
	})

	return { withTransitionWords, withoutTransitionWords }
}

/**
 * Collects the plain text of every subheading (h1–h6) found in the content.
 *
 * @param {string} text The (HTML) text to scan.
 * @returns {Set<string>} The trimmed text of each subheading.
 */
const getSubheadingSentences = function (text) {
	const found = new Set()

	for (const match of text.matchAll(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)) {
		const inner = match[2].replace(/<[^>]+>/g, '').trim()
		if (inner) {
			found.add(inner)
		}
	}

	return found
}

/**
 * Checks how many sentences from a text contain at least one transition word or two-part transition word
 * that are defined in the transition words config and two part transition words config.
 *
 * @param {Paper} paper The Paper object to get text from.
 * @param {Researcher} researcher The researcher.
 *
 * @returns {Object} An object with the total number of sentences in the text
 *                   and the total number of sentences containing one or more transition words.
 */
export default function (paper, researcher) {
	const matchTransitionWordsHelper = researcher.getHelper('matchTransitionWordsHelper')
	const transitionWords = researcher.getConfig('transitionWords')
	const twoPartTransitionWords = researcher.getConfig('twoPartTransitionWords')
	const memoizedTokenizer = researcher.getHelper('memoizedTokenizer')

	let text = paper.getText()
	text = removeHtmlBlocks(text)
	text = filterShortcodesFromHTML(text, paper._attributes?.shortcodes)
	const sentences = getSentences(text, memoizedTokenizer)
	const { withTransitionWords, withoutTransitionWords } = checkSentencesForTransitionWords(sentences, transitionWords, twoPartTransitionWords, matchTransitionWordsHelper)

	// Subheadings still count toward the score (the percentage of sentences using a
	// transition word) but are never highlighted — "add a transition word" is
	// meaningless for a section title.
	const subheadings = getSubheadingSentences(text)
	const markableWithout = subheadings.size
		? withoutTransitionWords.filter(sentence => !subheadings.has(sentence.trim()))
		: withoutTransitionWords

	return {
		totalSentences             : sentences.length,
		sentenceResults            : withTransitionWords,
		transitionWordSentences    : withTransitionWords.length,
		nonTransitionWordSentences : markableWithout
	}
}