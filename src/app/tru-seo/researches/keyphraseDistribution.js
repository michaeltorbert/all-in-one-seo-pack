import cloneDeep from 'lodash-es/cloneDeep'
import flattenDeep from 'lodash-es/flattenDeep'
import max from 'lodash-es/max'
import parseSynonyms from '@/app/tru-seo/languageProcessing/helpers/sanitize/parseSynonyms'
import getSentencesFromTree from '@/app/tru-seo/languageProcessing/helpers/sentence/getSentencesFromTree'
import getMarkingsInSentence from '@/app/tru-seo/languageProcessing/helpers/highlighting/getMarkingsInSentence'
import matchWordFormsWithSentence from '@/app/tru-seo/languageProcessing/helpers/match/matchWordFormsWithSentence'
import getSentences from '@/app/tru-seo/languageProcessing/helpers/sentence/getSentences'
import { filterShortcodesFromHTML } from '@/app/tru-seo/languageProcessing/helpers'
import { markWordsInASentence } from '@/app/tru-seo/languageProcessing/helpers/word/markWordsInSentences'
import { mergeListItems } from '@/app/tru-seo/languageProcessing/helpers/sanitize/mergeListItems'
import removeHtmlBlocks from '@/app/tru-seo/languageProcessing/helpers/html/htmlParser'
import isDoubleQuoted from '@/app/tru-seo/languageProcessing/helpers/match/isDoubleQuoted'
import SentenceTokenizer from '@/app/tru-seo/languageProcessing/helpers/sentence/SentenceTokenizer'

/**
 * @typedef {import("../../values/Mark").default} Mark
 * @typedef {import("../../values/Paper").default} Paper
 * @typedef {import("../../languageProcessing/AbstractResearcher").default } Researcher
 * @typedef {import("../../parse/structure/Sentence").default} Sentence
 */

/**
 * @typedef MaximizedSentenceScore
 * @property {number} score The maximized score of topic relevance for the sentence.
 * @property {string[]} matches An array of all topic word matches in the sentence.
 */

/**
 * @typedef SentenceScoresResult
 * @property {MaximizedSentenceScore[]} maximizedSentenceScores The maximized scores per sentence.
 * @property {Mark[]} sentencesToHighlight An array of markings for sentences that contain topic words.
 */

/**
 * @typedef KeyphraseDistributionResult
 * @property {number} keyphraseDistractionPercentage The percentage representing the largest portion of text without the keyphrase.
 * @property {Mark[]} sentencesToHighlight	An array of markings for sentences that contain topic words.
 */

// The score above which a sentence is considered to contain the topic.
const TOPIC_RELEVANCE_THRESHOLD = 3

/**
 * Checks whether the topic is found within one sentence.
 * Assign a score to every sentence following the following criteria:
 * - If a full match is required, 9 if all content words from the topic are in the sentence. Otherwise, 3.
 * - If a full match is not required, 9 if at least half of the content words from the topic are in the sentence. Otherwise, 3.
 *
 * @param {Array}		topic     The word forms of all content words in a keyphrase or a synonym.
 * @param {Sentence[]}  sentences An array of all sentences in the text.
 * @param {string} 		locale    The locale of the paper to analyse.
 * @param {boolean}		isFullMatchRequired		Whether all words from the topic need to be found for it to be considered a match.
 * @param {Function}    matchWordCustomHelper 	The language-specific helper function to match word in text.
 * @param {Function}    customSplitIntoTokensHelper A custom helper to split sentences into tokens.
 * @param {boolean}		[isExactMatchRequested=false]	Whether the exact matching is requested.
 * @returns {MaximizedSentenceScore[]} The scores per sentence along with the found matches.
 */
const computeScoresPerSentence = function (topic, sentences, locale, isFullMatchRequired, matchWordCustomHelper,
	customSplitIntoTokensHelper, isExactMatchRequested = false) {
	return sentences.map(sentence => {
		const matchedKeyphrase = topic.map(wordForms => matchWordFormsWithSentence(sentence,
			wordForms, locale, matchWordCustomHelper, isExactMatchRequested, customSplitIntoTokensHelper))
		const foundWords = matchedKeyphrase.reduce((count, { count: matchCount }) => {
			return 0 < matchCount ? count + 1 : count
		}, 0)

		const matches = flattenDeep(matchedKeyphrase.map(match => match.matches))
		const matchedPercentage = 0 < topic.length ? Math.round((foundWords / topic.length) * 100) : 0

		if ((isFullMatchRequired && 100 === matchedPercentage) || (!isFullMatchRequired && 50 <= matchedPercentage)) {
			return { score: 9, matches }
		}
		return { score: TOPIC_RELEVANCE_THRESHOLD, matches: [] }
	})
}

/**
 * Maximizes scores: Give every sentence a maximal score that it got from analysis of all topics
 *
 * @param {MaximizedSentenceScore[]} sentenceScores The scores for every sentence, as assessed per keyphrase and every synonym.
 *
 * @returns {MaximizedSentenceScore[]} Maximal scores of topic relevance per sentence.
 */
const maximizeSentenceScores = function (sentenceScores) {
	const sentenceScoresTransposed = sentenceScores[0].map(function (_col, i) {
		return sentenceScores.map(function (row) {
			return row[i]
		})
	})

	return sentenceScoresTransposed.map(function (scoresForOneSentence) {
		return scoresForOneSentence.reduce((maxScore, current) => {
			if (current.score > maxScore.score) {
				return {
					score   : current.score,
					matches : [ ...maxScore.matches, ...current.matches ]
				}
			}
			return {
				score   : maxScore.score,
				matches : [ ...maxScore.matches, ...current.matches ]
			}
		}, { score: -1, matches: [] })
	})
}

/**
 * Computes the maximally long piece of text that does not include the topic.
 *
 * @param {number[]} sentenceScores The array of scores per sentence.
 *
 * @returns {number} The maximum number of sentences that do not include the topic.
 */
const getDistraction = function (sentenceScores) {
	const numberOfSentences = sentenceScores.length
	// Get the indices of sentences that contain the topic.
	const topicSentenceIndices = sentenceScores
		.map((score, index) => score > TOPIC_RELEVANCE_THRESHOLD ? index : -1)
		.filter(index => -1 !== index)

	// Early return if there are no topic sentences at all.
	if (0 === topicSentenceIndices.length) {
		return numberOfSentences
	}

	/*
	 Add boundaries to the array of topic sentence indices to make sure we also consider the text before the first and after the last topic sentence.
	 -1 is added before the first index to represent the position before the first sentence.
	 numberOfSentences is added after the last index to represent the position after the last sentence.
	 This way we can calculate the lengths of the pieces of text before the first topic sentence and after the last topic sentence in the same way
	 as we calculate the lengths of the pieces of text between topic sentences.
	 */
	const topicIndicesWithBoundaries = [ -1, ...topicSentenceIndices, numberOfSentences ]

	/*
	 Calculate the lengths of all pieces of text that do not contain the topic.
	 This is done by calculating the difference between every two subsequent topic sentence indices,
	 subtracting 1 to not include the topic sentence itself.
	 We loop from the second element to the last element and subtract from each the previous element.
	 */
	const distractionsLength = topicIndicesWithBoundaries
		.slice(1)
		.map((topicIndex, index) => topicIndex - topicIndicesWithBoundaries[index] - 1)

	return max(distractionsLength)
}

/**
 * Calculates the keyphrase distraction percentage. A higher percentage indicates more distraction, i.e. worse distribution.
 * For texts that are 15 sentences or longer, we calculate a percentage based on the maximum distraction - the maximum consecutive sentences without the keyphrase.
 * For shorter texts, we assign an arbitrary low (=good) percentage if the keyphrase is found in at least one sentence.
 * If it's not found in any sentence, we return 100%, which is the percentage assigned to texts without the keyphrase (both shorter and longer texts).
 *
 * @param {number} 		numberOfSentences The number of sentences in the text.
 * @param {number[]}	maximizedSentenceScores The maximized scores for each sentence.
 * @returns {number}	The keyphrase distraction percentage.
 */
const getKeyphraseDistractionPercentage = (numberOfSentences, maximizedSentenceScores) => {
	if (15 <= numberOfSentences) {
		const maxLengthDistraction = getDistraction(maximizedSentenceScores)
		return maxLengthDistraction / numberOfSentences * 100
	}
	// For short texts, return a low (=good) score if the keyphrase is found in at least one sentence.
	if (maximizedSentenceScores.includes(9)) {
		return 10
	}
	// If the keyphrase is not found in any sentence, return the score 100.
	return 100
}

/**
 * Assigns a score to each sentence based on whether the topic is found in the sentence or not (9 if found, 3 if not found).
 * Whether the topic is considered to be found depends on the topic’s length, and whether there is function word support available for that language.
 *
 * @param {Object}      options                         The options object.
 * @param {Sentence[]}  options.sentences               The sentences to get scores for.
 * @param {Array}       options.topicFormsInOneArray    The topic phrases forms to search for in the sentences.
 * @param {string}      options.locale                  The locale to work in.
 * @param {Array}       options.functionWords           The function words list.
 * @param {Function}    options.matchWordCustomHelper 	The language-specific helper function to match word in text.
 * @param {Array}       options.originalTopic           The array of the original form of the topic with function words filtered out.
 * @param {Function}    options.wordsCharacterCount     The helper to calculate the character length of all the words in the array.
 * @param {Function}    options.customSplitIntoTokensHelper A custom helper to split sentences into tokens.
 * @param {boolean}     options.isExactMatchRequested	Whether the exact matching is requested.
 * @param {int}         [options.topicLengthCriteria=4] The topic length criteria. The default value is 4, where a topic is considered short
 *                                                      if it's less than 4 words long, and otherwise long.
 * @returns {{maximizedSentenceScores: number[], sentencesToHighlight: Mark[]}} The maximized scores per sentence and the sentences that contain topic words for future highlights.
 */
const getSentenceScores = function ({
	sentences,
	topicFormsInOneArray,
	locale,
	functionWords,
	matchWordCustomHelper,
	originalTopic,
	wordsCharacterCount,
	customSplitIntoTokensHelper,
	isExactMatchRequested,
	topicLengthCriteria = 4
}) {
	// Determine whether the language has function words.
	const hasFunctionWords = 0 < functionWords.length

	const sentenceScores = topicFormsInOneArray.map((topic, index) => {
		if (!hasFunctionWords) {
			// For languages without function words apply the full match always.
			return computeScoresPerSentence(topic, sentences, locale, true,
				matchWordCustomHelper, customSplitIntoTokensHelper, isExactMatchRequested)
		}
		// For languages with function words, we apply the full match only for short topics (default criteria: 3 words or less).
		/*
		 * If the helper to calculate the character length of all the words in the array is available,
		 * we use this helper to calculate the characters length of the original topic form.
		 * We then use the result and compare it with the topicLengthCriteria.
		 */
		const topicLength = wordsCharacterCount ? wordsCharacterCount(originalTopic[index]) : topic.length
		const isFullMatchRequired = topicLength < topicLengthCriteria
		return computeScoresPerSentence(topic, sentences, locale, isFullMatchRequired,
			matchWordCustomHelper, customSplitIntoTokensHelper, isExactMatchRequested)
	})

	// Maximize scores: Give every sentence a maximal score that it got from analysis of all topics.
	const maximizedSentenceScores = maximizeSentenceScores(sentenceScores)

	// Combine sentences with their scores.
	const sentencesWithMaximizedScores = sentences.map((sentence, index) => {
		const { score, matches } = maximizedSentenceScores[index]
		return { sentence, score, matches }
	})

	// Filter sentences that contain topic words for future highlights.
	const sentencesWithTopic = sentencesWithMaximizedScores.filter(sentenceObject => sentenceObject.score > TOPIC_RELEVANCE_THRESHOLD)

	const sentencesToHighlight = sentencesWithTopic.map(({ sentence, matches }) => {
		if (matchWordCustomHelper) {
			// Currently, this check is only applicable for Japanese.
			return markWordsInASentence(sentence, matches, matchWordCustomHelper)
		}
		return getMarkingsInSentence(sentence, matches, true)
	})

	return {
		maximizedSentenceScores : maximizedSentenceScores.map(sentenceScore => sentenceScore.score),
		sentencesToHighlight
	}
}

/**
 * Checks if the given node is a list item that is not a HowTo step.
 * @param {Node} parentNode The node to check.
 * @returns {boolean} Whether the node is a list item that is not a HowTo step.
 */
const checkIfNodeIsListItem = (parentNode) => {
	return 'li' === parentNode?.name && !parentNode?.attributes?.class?.has('schema-how-to-step')
}

/**
 * Checks whether the current sentence is a valid sentence considering the next sentence.
 * @param {Sentence} currentSentence The current sentence.
 * @param {Sentence} nextSentence The next sentence.
 * @returns {boolean} Whether the current sentence is a valid sentence.
 */
const isAValidSentence = (currentSentence, nextSentence) => {
	const sentenceTokenizer = new SentenceTokenizer()
	const sentenceDelimiters = sentenceTokenizer.getSentenceDelimiters()
	// Create a regex that matches any of the sentence delimiters. The full stop is also included.
	const sentenceDelimiterRegex = new RegExp('^[.' + sentenceDelimiters + ']$')

	const currentSentenceLastToken = currentSentence.getLastToken()
	// It is a valid sentence if the last token of the current sentence is ending with a sentence delimiter and if the next
	// sentence starts with a valid sentence beginning.
	const nextSentenceFirstToken = nextSentence.getFirstToken()
	return sentenceDelimiterRegex.test(currentSentenceLastToken.text) &&
		(nextSentenceFirstToken && sentenceTokenizer.isValidSentenceBeginning(nextSentenceFirstToken.text[0]))
}

/**
 * Merges sentences that are part of the same list item and are not valid sentences on their own.
 *
 * @param {Sentence[]} sentences The sentences to merge.
 * @returns {Sentence[]} The merged sentences.
 */
const mergeListItemSentences = (sentences) => {
	const copySentences = [ ...sentences ]
	const mergedSentences = []

	let i = 0
	while (i < copySentences.length) {
		let sentence = copySentences[i]
		const isListItem = checkIfNodeIsListItem(sentence.sentenceParentNode)

		if (isListItem) {
			/*
			 These are the attributes that need to be merged:
			 - text
			 - tokens
			 - parentNodes (as an array of parent nodes)
			 - sourceCodeRange (only endOffset needs to be updated)
			 The other attributes are not necessary to merge since we won't need them when we process the merged sentence to create the markings.
			 */
			let mergedText = sentence.text,
			 mergedTokens = [ ...sentence.tokens ],
			 endOffset = sentence.sourceCodeRange.endOffset,
			 j = i + 1
			const mergedParentNodes = [ sentence.sentenceParentNode ]
			/*
			 Continue merging while the next sentence is also a list item and the current sentence is not a valid sentence.
			 */
			while (
				j < copySentences.length &&
				checkIfNodeIsListItem(copySentences[j]?.sentenceParentNode) &&
				!isAValidSentence(sentence, copySentences[j])
			) {
				mergedText += ' ' + copySentences[j].text
				mergedTokens = [ ...mergedTokens, ...copySentences[j].tokens ]
				mergedParentNodes.push(copySentences[j].sentenceParentNode)
				endOffset = copySentences[j].sourceCodeRange.endOffset
				sentence = copySentences[j]
				j++
			}

			const mergedSentence = cloneDeep(copySentences[i])
			mergedSentence.text = mergedText
			mergedSentence.tokens = mergedTokens
			mergedSentence.sentenceParentNode = mergedParentNodes
			mergedSentence.sourceCodeRange.endOffset = endOffset
			mergedSentences.push(mergedSentence)
			i = j
		} else {
			mergedSentences.push(sentence)
			i++
		}
	}

	return mergedSentences
}

/**
 * Determines which portions of the text did not receive a lot of content words from keyphrase and synonyms.
 *
 * @param {Paper}       paper		The paper to check the keyphrase distribution for.
 * @param {Researcher}  researcher	The researcher to use for analysis.
 *
 * @returns {KeyphraseDistributionResult} The scores of topic relevance per portion of text and an array of all word forms to highlight.
 */
const keyphraseDistributionResearcher = function (paper, researcher) {
	const functionWords = researcher.getConfig('functionWords')
	const matchWordCustomHelper = researcher.getHelper('matchWordCustomHelper')
	const getContentWordsHelper = researcher.getHelper('getContentWords')
	const wordsCharacterCount = researcher.getHelper('wordsCharacterCount')
	const customSplitIntoTokensHelper = researcher.getHelper('splitIntoTokensCustom')
	const customSentenceTokenizer = researcher.getHelper('memoizedTokenizer')

	// Custom topic length criteria for languages that don't use the default value to determine whether a topic is long or short.
	const topicLengthCriteria = researcher.getConfig('topicLength').lengthCriteria
	let sentences = []
	if (matchWordCustomHelper) {
		// This is currently only applicable for Japanese.
		// When the custom helper is available, we're using the sentences retrieved from the text for the analysis.
		let text = paper.getText()
		text = removeHtmlBlocks(text)
		text = filterShortcodesFromHTML(text, paper._attributes?.shortcodes)
		text = mergeListItems(text)
		sentences = getSentences(text, customSentenceTokenizer)
	} else {
		sentences = getSentencesFromTree(paper.getTree(), true)
		sentences = mergeListItemSentences(sentences)
	}

	const topicForms = researcher.getResearch('morphology')

	const originalTopic = []
	if (getContentWordsHelper) {
		originalTopic.push(getContentWordsHelper(paper.getKeyword()))
		parseSynonyms(paper.getSynonyms()).forEach(synonym => originalTopic.push(getContentWordsHelper(synonym)))
	}
	const locale = paper.getLocale()
	// Exact matching is requested when the keyphrase is enclosed in double quotes.
	const isExactMatchRequested = isDoubleQuoted(paper.getKeyword())
	const topicFormsInOneArray = [ topicForms.keyphraseForms ]
	topicForms.synonymsForms.forEach(function (synonym) {
		topicFormsInOneArray.push(synonym)
	})

	// Get per-sentence scores and sentences that have a topic.
	const {
		maximizedSentenceScores,
		sentencesToHighlight
	} = getSentenceScores({
		sentences,
		topicFormsInOneArray,
		locale,
		functionWords,
		matchWordCustomHelper,
		originalTopic,
		wordsCharacterCount,
		customSplitIntoTokensHelper,
		isExactMatchRequested,
		topicLengthCriteria
	})

	const numberOfSentences = sentences.length
	const keyphraseDistractionPercentage = getKeyphraseDistractionPercentage(numberOfSentences, maximizedSentenceScores)

	return {
		sentencesToHighlight           : flattenDeep(sentencesToHighlight),
		keyphraseDistractionPercentage : keyphraseDistractionPercentage
	}
}

export {
	computeScoresPerSentence,
	maximizeSentenceScores,
	keyphraseDistributionResearcher,
	getDistraction
}

export default keyphraseDistributionResearcher