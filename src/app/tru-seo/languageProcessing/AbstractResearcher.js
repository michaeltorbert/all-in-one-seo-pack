import { merge, isUndefined, isEmpty } from 'lodash-es'

import InvalidTypeError from '@/app/tru-seo/errors/InvalidTypeError'
import MissingArgument from '@/app/tru-seo/errors/MissingArgumentError'
import { registerCache } from '@/app/tru-seo/cache'
import { generateCacheKey } from '@/app/tru-seo/helpers/hash'

// All researches in alphabetical order.
import altTagCount from '@/app/tru-seo/researches/altTagCount.js'
import countSentencesFromText from '@/app/tru-seo/researches/countSentencesFromText.js'
import findKeywordInFirstParagraph from '@/app/tru-seo/researches/findKeywordInFirstParagraph.js'
import findKeyphraseInSEOTitle from '@/app/tru-seo/researches/findKeyphraseInSEOTitle'
import findTransitionWords from '@/app/tru-seo/researches/findTransitionWords'
import functionWordsInKeyphrase from '@/app/tru-seo/researches/functionWordsInKeyphrase'
import getAnchorsWithKeyphrase from '@/app/tru-seo/researches/getAnchorsWithKeyphrase'
import getFleschReadingScore from '@/app/tru-seo/researches/getFleschReadingScore'
import getKeyphraseDensity, { getKeywordDensity } from '@/app/tru-seo/researches/getKeywordDensity.js'
import getLinks from '@/app/tru-seo/researches/getLinks.js'
import getLinkStatistics from '@/app/tru-seo/researches/getLinkStatistics'
import getParagraphs from '@/app/tru-seo/researches/getParagraphs'
import getParagraphLength from '@/app/tru-seo/researches/getParagraphLength.js'
import getPassiveVoiceResult from '@/app/tru-seo/researches/getPassiveVoiceResult'
import getProminentWordsForInsights from '@/app/tru-seo/researches/getProminentWordsForInsights'
import getProminentWordsForInternalLinking from '@/app/tru-seo/researches/getProminentWordsForInternalLinking'
import getSentenceBeginnings from '@/app/tru-seo/researches/getSentenceBeginnings'
import getSubheadingTextLengths from '@/app/tru-seo/researches/getSubheadingTextLengths.js'
import h1s from '@/app/tru-seo/researches/h1s'
import imageCount from '@/app/tru-seo/researches/imageCount.js'
import keyphraseLength from '@/app/tru-seo/researches/keyphraseLength'
import getKeyphraseCount, { keywordCount } from '@/app/tru-seo/researches/keywordCount'
import { keywordCountInSlug, keywordCountInUrl } from '@/app/tru-seo/researches/keywordCountInUrl'
import matchKeywordInSubheadings from '@/app/tru-seo/researches/matchKeywordInSubheadings'
import metaDescriptionKeyword from '@/app/tru-seo/researches/metaDescriptionKeyword'
import metaDescriptionLength from '@/app/tru-seo/researches/metaDescriptionLength.js'
import morphology from '@/app/tru-seo/researches/getWordForms'
import pageTitleWidth from '@/app/tru-seo/researches/pageTitleWidth.js'
import readingTime from '@/app/tru-seo/researches/readingTime'
import sentences from '@/app/tru-seo/researches/sentences'
import videoCount from '@/app/tru-seo/researches/countVideoInText'
import wordCountInText from '@/app/tru-seo/researches/wordCountInText.js'

// All helpers.
import memoizedTokenizer from './helpers/sentence/memoizedSentenceTokenizer'

/**
 * Maximum number of research results to cache per researcher instance.
 *
 * @since 5.0.0
 * @type {number}
 */
const MAX_RESEARCH_CACHE_SIZE = 50

/**
 * The researcher contains all the researches, helpers, data, and config.
 */
export default class AbstractResearcher {
	/**
	 * Constructor
	 * @param {Paper} [paper = null] The Paper object that is needed within the researches.
	 *
	 * @constructor
	 */
	constructor (paper = null) {
		this.paper = paper

		/**
		 * Cache key based on paper content for invalidation.
		 *
		 * @since 5.0.0
		 * @type {string|null}
		 * @private
		 */
		this._paperCacheKey = null

		/**
		 * Cache for research results to avoid redundant computations.
		 * Keys are research names, values are the cached results.
		 *
		 * @since 5.0.0
		 * @type {Map<string, *>}
		 * @private
		 */
		this._researchCache = new Map()

		// Register the research cache with the central cache manager.
		registerCache('researchCache', {
			clear : () => this._researchCache.clear(),
			get size () {
				return this._researchCache.size
			}
		})

		// We expose the deprecated keywordCountInUrl for backwards compatibility.
		this.defaultResearches = {
			altTagCount,
			countSentencesFromText,
			findKeywordInFirstParagraph,
			findKeyphraseInSEOTitle,
			findTransitionWords,
			functionWordsInKeyphrase,
			getAnchorsWithKeyphrase,
			getFleschReadingScore,
			getKeyphraseCount,
			getKeyphraseDensity,
			getKeywordDensity,
			getLinks,
			getLinkStatistics,
			getParagraphs,
			getParagraphLength,
			getProminentWordsForInsights,
			getProminentWordsForInternalLinking,
			getSentenceBeginnings,
			getSubheadingTextLengths,
			h1s,
			imageCount,
			keyphraseLength,
			keywordCount,
			keywordCountInSlug,
			keywordCountInUrl,
			matchKeywordInSubheadings,
			metaDescriptionKeyword,
			metaDescriptionLength,
			morphology,
			pageTitleWidth,
			readingTime,
			sentences,
			wordCountInText,
			videoCount,
			getPassiveVoiceResult
		}

		this._data = {}

		this.customResearches = {}

		this.helpers = {
			memoizedTokenizer
		}

		this.config = {
			areHyphensWordBoundaries : true,
			centerClasses            : [ 'has-text-align-center' ]
		}
	}

	/**
	 * Generates a cache key from the current paper for cache invalidation.
	 * The key is based on relevant paper attributes that affect research results.
	 * Uses fingerprint-based hashing for efficient large content handling.
	 *
	 * @since 5.0.0
	 *
	 * @returns {string} The cache key.
	 */
	_generatePaperCacheKey () {
		if (!this.paper) {
			return ''
		}

		// Serialize additional keywords for cache key.
		const additionalKeywords = this.paper.getAdditionalKeywords()
		const additionalKeywordsStr = additionalKeywords
			? additionalKeywords.map(kw => `${kw.word || ''}:${kw.synonyms || ''}`).join('|')
			: ''

		return generateCacheKey(
			this.paper.getText(),
			this.paper.getKeyword(),
			this.paper.getSynonyms(),
			this.paper.getTitle(),
			this.paper.getDescription(),
			this.paper.getSlug(),
			additionalKeywordsStr
		)
	}

	/**
	 * Clears the research cache.
	 * Should be called when the paper content changes significantly.
	 *
	 * @since 5.0.0
	 *
	 * @returns {void}
	 */
	clearResearchCache () {
		this._researchCache.clear()
		this._paperCacheKey = null
	}

	/**
	 * Set the Paper associated with the Researcher.
	 * Clears the research cache if the paper content has changed.
	 *
	 * @since 5.0.0 Added cache invalidation when paper changes.
	 *
	 * @param {Paper} paper The Paper to use within the Researcher.
	 *
	 * @throws {InvalidTypeError} Parameter needs to be an instance of the Paper object.
	 *
	 * @returns {void}
	 */
	setPaper (paper) {
		this.paper = paper

		// Check if paper content has changed and invalidate cache if so.
		const newCacheKey = this._generatePaperCacheKey()
		if (this._paperCacheKey !== newCacheKey) {
			this._researchCache.clear()
			this._paperCacheKey = newCacheKey
		}
	}

	/**
	 * Add a custom research that will be available within the Researcher.
	 *
	 * @param {string}   name     A name to reference the research by.
	 * @param {Function} research The function to be added to the Researcher.
	 *
	 * @throws {MissingArgument}  Research name cannot be empty.
	 * @throws {InvalidTypeError} The research requires a valid Function callback.
	 *
	 * @returns {void}
	 */
	addResearch (name, research) {
		if (isUndefined(name) || isEmpty(name)) {
			throw new MissingArgument('Research name cannot be empty')
		}

		if (!(research instanceof Function)) {
			throw new InvalidTypeError('The research requires a Function callback.')
		}

		this.customResearches[name] = research
	}

	/**
	 * Add research data to the researcher by the research name.
	 *
	 * @param {string} research The identifier of the research.
	 * @param {Object} data     The data object.
	 *
	 * @returns {void}.
	 */
	addResearchData (research, data) {
		this._data[research] = data
	}

	/**
	 * Add a custom helper that will be available within the Researcher.
	 *
	 * @param {string}   name     A name to reference the helper by.
	 * @param {Function} helper   The function to be added to the Researcher.
	 *
	 * @throws {MissingArgument}  Helper name cannot be empty.
	 * @throws {InvalidTypeError} The helper requires a valid Function callback.
	 *
	 * @returns {void}
	 */
	addHelper (name, helper) {
		if (isUndefined(name) || isEmpty(name)) {
			throw new MissingArgument('Helper name cannot be empty')
		}

		if (!(helper instanceof Function)) {
			throw new InvalidTypeError('The research requires a Function callback.')
		}

		this.helpers[name] = helper
	}

	/**
	 * Add a custom configuration that will be available within the Researcher.
	 *
	 * @param {string}  name     A name to reference the helper by.
	 * @param {*}       config   The configuration to be added to the Researcher.
	 *
	 * @throws {MissingArgument}  Configuration name and the configuration itself cannot be empty.
	 *
	 * @returns {void}
	 */
	addConfig (name, config) {
		if (isUndefined(name) || isEmpty(name)) {
			throw new MissingArgument('Failed to add the custom researcher config. Config name cannot be empty.')
		}

		if (isUndefined(config) || (isEmpty(config) && config === Object(config))) {
			throw new MissingArgument('Failed to add the custom researcher config. Config cannot be empty.')
		}

		this.config[name] = config
	}

	/**
	 * Check whether the research is known by the Researcher.
	 *
	 * @param {string} name The name to reference the research by.
	 *
	 * @returns {boolean} Whether or not the research is known by the Researcher.
	 */
	hasResearch (name) {
		return 0 < Object.keys(this.getAvailableResearches()).filter(
			function (research) {
				return research === name
			}).length
	}

	/**
	 * Check whether the helper is known by the Researcher.
	 *
	 * @param {string} name The name to reference the helper by.
	 *
	 * @returns {boolean} Whether or not the helper is known by the Researcher.
	 */
	hasHelper (name) {
		return 0 < Object.keys(this.getAvailableHelpers()).filter(
			function (helper) {
				return helper === name
			}).length
	}

	/**
	 * Check whether the config is known by the Researcher.
	 *
	 * @param {string} name The name to reference the config by.
	 *
	 * @returns {boolean} Whether or not the config is known by the Researcher.
	 */
	hasConfig (name) {
		return 0 < Object.keys(this.getAvailableConfig()).filter(
			function (config) {
				return config === name
			}).length
	}

	/**
	 * Check whether the research data is known by the Researcher.
	 *
	 * @param {string} name The name to reference the research data by.
	 *
	 * @returns {boolean} Whether or not the research data is known by the Researcher.
	 */
	hasResearchData (name) {
		return 0 < Object.keys(this.getAvailableResearchData()).filter(
			function (data) {
				return data === name
			}).length
	}

	/**
	 * Return all available researches.
	 *
	 * @returns {Object} An object containing all available researches.
	 */
	getAvailableResearches () {
		return merge(this.defaultResearches, this.customResearches)
	}

	/**
	 * Return all available helpers.
	 *
	 * @returns {Object} An object containing all available helpers.
	 */
	getAvailableHelpers () {
		return this.helpers
	}

	/**
	 * Return all available configuration.
	 *
	 * @returns {Object} An object containing all available configuration.
	 */
	getAvailableConfig () {
		return this.config
	}

	/**
	 * Return all available research data.
	 *
	 * @returns {Object} An object containing all available research data.
	 */
	getAvailableResearchData () {
		return this._data
	}

	/**
	 * Return the Research by name.
	 * Uses caching to avoid redundant computations when the paper hasn't changed.
	 *
	 * @since 5.0.0 Added research result caching.
	 *
	 * @param {string}  name             The name to reference the research by.
	 * @param {boolean} [useCache=true]  Whether to use cached results if available.
	 *
	 * @returns {*} Returns the result of the research or false if research does not exist.
	 *
	 * @throws {MissingArgument} Research name cannot be empty.
	 */
	getResearch (name, useCache = true) {
		if (isUndefined(name) || isEmpty(name)) {
			throw new MissingArgument('Research name cannot be empty')
		}

		if (!this.hasResearch(name)) {
			return false
		}

		// Check cache first if caching is enabled.
		if (useCache && this._researchCache.has(name)) {
			return this._researchCache.get(name)
		}

		// Run the research.
		const result = this.getAvailableResearches()[name](this.paper, this)

		// Cache the result if caching is enabled.
		if (useCache) {
			// Enforce max cache size with LRU-like eviction.
			if (this._researchCache.size >= MAX_RESEARCH_CACHE_SIZE) {
				const oldestKey = this._researchCache.keys().next().value
				this._researchCache.delete(oldestKey)
			}

			this._researchCache.set(name, result)
		}

		return result
	}

	/**
	 * Return the research data from a research data provider by research name.
	 *
	 * @param {string} research The identifier of the research.
	 *
	 * @returns {*} The data provided by the provider, false if the data do not exist
	 */
	getData (research) {
		if (this.hasResearchData(research)) {
			return this._data[research]
		}

		return false
	}

	/**
	 * Return language specific configuration by configuration name.
	 *
	 * @param {string} name The name of the configuration.
	 *
	 * @returns {*} The configuration, false if the configuration does not exist.
	 */
	getConfig (name) {
		if (this.hasConfig(name)) {
			return this.config[name]
		}

		return false
	}

	/**
	 * Return language specific helper by helper name.
	 *
	 * @param {string} name The name of the helper.
	 *
	 * @returns {*} The helper, false if the helper does not exist.
	 */
	getHelper (name) {
		if (this.hasHelper(name)) {
			return this.helpers[name]
		}

		return false
	}
}