// External dependencies.
import { __, sprintf } from '@/vue/plugins/translations'
import { isEmpty, isFunction, isUndefined } from '@/app/tru-seo/helpers'

// Internal dependencies.
import AssessmentResult from '@/app/tru-seo/values/AssessmentResult.js'
import { build } from '@/app/tru-seo/parsers/parse/build'
import LanguageProcessor from '@/app/tru-seo/parsers/parse/language/LanguageProcessor.js'
import MissingArgument from '@/app/tru-seo/errors/MissingArgumentError.js'
import removeDuplicateMarks from '@/app/tru-seo/markers/removeDuplicateMarks.js'
import { showTrace } from '@/app/tru-seo/helpers/errors.js'
import { generateCacheKey } from '@/app/tru-seo/helpers/hash.js'

const td = import.meta.env.VITE_TEXTDOMAIN

// The maximum score of individual assessment is 9. This is why we set the "score rating" here to 9.
const ScoreRating = 9

/**
 * Default maximum cache size for assessment results.
 *
 * @since 5.0.0
 * @type {number}
 */
const DEFAULT_CACHE_SIZE = 10

/**
 * The Assessor is a base class for all assessors.
 */
class Assessor {
	/**
	 * Creates a new Assessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		this.type = 'assessor'
		this.setResearcher(researcher)

		/**
		 * The list of assessments.
		 * @type {Assessment[]}
		 * @private
		 */
		this._assessments = []

		/**
		 * The list of results.
		 * @type {AssessmentResult[]}
		 */
		this.results = []

		/**
		 * The options.
		 * @type {Object|{}}
		 * @private
		 */
		this._options = options || {}

		/**
		 * The ScoreAggregator for this assessor.
		 * @type {ScoreAggregator}
		 * @private
		 */
		this._scoreAggregator = null

		/**
		 * Cache for assessment results keyed by paper content hash.
		 * Uses LRU-like eviction (oldest entries removed first).
		 *
		 * @since 5.0.0
		 * @type {Map<string, Object>}
		 * @private
		 */
		this._resultsCache = new Map()

		/**
		 * Maximum number of cached results to keep.
		 *
		 * @since 5.0.0
		 * @type {number}
		 * @private
		 */
		this._maxCacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE
	}

	/**
	 * Generates a cache key from the paper for result caching.
	 * The key is based on the paper's text, keyword, and other relevant attributes.
	 * Uses fingerprint-based hashing for efficient large content handling.
	 *
	 * @since   5.0.0
	 * @version 5.0.0.1 Included customData in the key.
	 * @param {Paper} paper The paper to generate a key for.
	 * @returns {string} The cache key.
	 */
	_generateCacheKey (paper) {
		// Serialize additional keywords for cache key.
		const additionalKeywords = paper.getAdditionalKeywords()
		const additionalKeywordsStr = additionalKeywords
			? additionalKeywords.map(kw => `${kw.word || ''}:${kw.synonyms || ''}`).join('|')
			: ''

		/*
		 * customData has to be part of the key. Assessments that read it — the product identifier
		 * and SKU checks, and keyword cannibalization — can change verdict while the content stays
		 * byte-identical. Leaving it out meant editing a SKU produced the same key, so the stale
		 * result was served and the row never updated until some unrelated edit changed the text.
		 */
		const customData = paper.getCustomData()

		return generateCacheKey(
			paper.getText(),
			paper.getKeyword(),
			paper.getSynonyms(),
			paper.getTitle(),
			paper.getDescription(),
			paper.getSlug(),
			this.type,
			additionalKeywordsStr,
			isEmpty(customData) ? '' : JSON.stringify(customData)
		)
	}

	/**
	 * Gets cached results for a paper if available.
	 *
	 * @since 5.0.0
	 * @param {Paper} paper The paper to get cached results for.
	 * @returns {Object|null} The cached results or null if not cached.
	 */
	_getCachedResults (paper) {
		const key = this._generateCacheKey(paper)

		if (this._resultsCache.has(key)) {
			// Move to end to mark as recently used.
			const cached = this._resultsCache.get(key)
			this._resultsCache.delete(key)
			this._resultsCache.set(key, cached)

			return cached
		}

		return null
	}

	/**
	 * Caches results for a paper.
	 *
	 * @since 5.0.0
	 * @param {Paper} paper The paper to cache results for.
	 * @param {AssessmentResult[]} results The results to cache.
	 * @returns {void}
	 */
	_cacheResults (paper, results) {
		const key = this._generateCacheKey(paper)

		// Remove oldest entry if cache is full.
		if (this._resultsCache.size >= this._maxCacheSize) {
			const oldestKey = this._resultsCache.keys().next().value
			this._resultsCache.delete(oldestKey)
		}

		// Clone results to prevent mutations affecting the cache.
		this._resultsCache.set(key, {
			results      : results,
			hasMarkers   : this._hasMarkers,
			overallScore : this.calculateOverallScore(),
			cacheTime    : Date.now()
		})
	}

	/**
	 * Clears the results cache.
	 *
	 * @since 5.0.0
	 * @returns {void}
	 */
	clearCache () {
		this._resultsCache.clear()
	}

	/**
	 * Checks if the researcher is defined and sets it.
	 *
	 * @param   {Researcher} researcher The researcher to use in the assessor.
	 *
	 * @throws  {MissingArgument} Parameter needs to be a valid researcher object.
	 * @returns {void}
	 */
	setResearcher (researcher) {
		if (isUndefined(researcher)) {
			throw new MissingArgument('The assessor requires a researcher.')
		}
		this._researcher = researcher
	}

	/**
	 * Gets all available assessments.
	 * @returns {Assessment[]} assessment
	 */
	getAvailableAssessments () {
		return this._assessments
	}

	/**
	 * Checks whether the Assessment is applicable.
	 *
	 * @param {Assessment} assessment The Assessment object that needs to be checked.
	 * @param {Paper} paper The Paper object to check against.
	 * @param {Researcher} [researcher] The Researcher object containing additional information.
	 * @returns {boolean} Whether or not the Assessment is applicable.
	 */
	isApplicable (assessment, paper, researcher) {
		if ('undefined' === typeof assessment.isApplicable) {
			return true
		}
		return assessment.isApplicable(paper, researcher)
	}

	/**
	 * Determines whether an assessment has a marker.
	 *
	 * @param {Assessment} assessment The assessment to check for.
	 * @returns {boolean} Whether or not the assessment has a marker.
	 */
	hasMarker (assessment) {
		return isFunction(this._options.marker) && (Object.hasOwn(assessment, 'getMarks') || 'function' === typeof assessment.getMarks)
	}

	/**
	 * Returns the specific marker for this assessor.
	 *
	 * @returns {Function} The specific marker for this assessor.
	 */
	getSpecificMarker () {
		return this._options.marker
	}

	/**
	 * Returns the paper that was most recently assessed.
	 *
	 * @returns {Paper} The paper that was most recently assessed.
	 */
	getPaper () {
		return this._lastPaper
	}

	/**
	 * Returns the marker for a given assessment, composes the specific marker with the assessment getMarks function.
	 *
	 * @param {Assessment} assessment The assessment for which we are retrieving the composed marker.
	 * @param {Paper} paper The paper to retrieve the marker for.
	 * @param {Researcher} researcher The researcher for the paper.
	 * @returns {Function} A function that can mark the given paper according to the given assessment.
	 */
	getMarker (assessment, paper, researcher) {
		const specificMarker = this._options.marker

		return function () {
			let marks = assessment.getMarks(paper, researcher)
			marks = removeDuplicateMarks(marks)

			specificMarker(paper, marks)
		}
	}

	/**
	 * Runs the researches defined in the task list or the default researches.
	 * Uses caching to avoid re-running assessments on identical content.
	 *
	 * @since 5.0.0 Added result caching.
	 * @since 5.0.0 Skip tree building if already built (performance optimization).
	 *
	 * @param {Paper} paper The paper to run assessments on.
	 * @param {Object} [options] Assessment options.
	 * @param {boolean} [options.useCache=true] Whether to use cached results if available.
	 * @returns {void}
	 */
	assess (paper, options = {}) {
		const { useCache = true } = options

		// Check cache first if caching is enabled.
		if (useCache) {
			const cached = this._getCachedResults(paper)
			if (cached) {
				this.results = cached.results
				this._hasMarkers = cached.hasMarkers
				this._lastPaper = paper
				return
			}
		}

		this._researcher.setPaper(paper)

		// Only build the tree if it hasn't been built already.
		// The tree is often pre-built by AnalysisWebWorker.analyze() before calling assessors.
		if (!paper.getTree()) {
			const languageProcessor = new LanguageProcessor(this._researcher)
			const shortcodes = paper._attributes?.shortcodes
			paper.setTree(build(paper, languageProcessor, shortcodes))
		}

		let assessments = this.getAvailableAssessments()

		assessments = assessments.filter(assessment => this.isApplicable(assessment, paper, this._researcher))

		this.setHasMarkers(false)
		this.results = assessments.map(assessment => this.executeAssessment(paper, this._researcher, assessment))

		this._lastPaper = paper

		// Cache the results.
		if (useCache) {
			this._cacheResults(paper, this.results)
		}
	}

	/**
	 * Sets the value of has markers with a boolean to determine if there are markers.
	 *
	 * @param {boolean} hasMarkers True when there are markers, otherwise it is false.
	 * @returns {void}
	 */
	setHasMarkers (hasMarkers) {
		this._hasMarkers = hasMarkers
	}

	/**
	 * Returns true when there are markers.
	 *
	 * @returns {boolean} Are there markers
	 */
	hasMarkers () {
		return this._hasMarkers
	}

	/**
	 * Executes an assessment and returns the AssessmentResult.
	 *
	 * @param {Paper} paper The paper to pass to the assessment.
	 * @param {Researcher} researcher The researcher to pass to the assessment.
	 * @param {Assessment} assessment The assessment to execute.
	 * @returns {AssessmentResult} The result of the assessment.
	 */
	executeAssessment (paper, researcher, assessment) {
		let result

		try {
			result = assessment.getResult(paper, researcher)
			result.setIdentifier(assessment.identifier)

			if (result.hasMarks()) {
				result.marks = assessment.getMarks(paper, researcher)
				result.marks = removeDuplicateMarks(result.marks)
			}

			if (result.hasMarks() && this.hasMarker(assessment)) {
				this.setHasMarkers(true)

				result.setMarker(this.getMarker(assessment, paper, researcher))
			}
		} catch (assessmentError) {
			showTrace(assessmentError)

			result = new AssessmentResult()

			result.setScore(-1)
			result.setText(sprintf(
				/* translators: %1$s expands to the name of the assessment. */
				__('We couldn\'t run the \'%1$s\' check. Try saving the post and reloading the editor — if it keeps happening, contact support.', td),
				assessment.identifier,
				assessmentError
			))
		}
		return result
	}

	/**
	 * Filters out all assessment results that have no score and no text.
	 *
	 * @returns {AssessmentResult[]} The array with all the valid assessments.
	 */
	getValidResults () {
		return this.results.filter(result => this.isValidResult(result))
	}

	/**
	 * Returns if an assessmentResult is valid.
	 *
	 * @param {AssessmentResult} assessmentResult The assessmentResult to validate.
	 * @returns {boolean} whether or not the result is valid.
	 */
	isValidResult (assessmentResult) {
		return assessmentResult.hasScore() && assessmentResult.hasText() && assessmentResult.hasTitle()
	}

	/**
	 * Returns the overall score. Calculates the total score by adding all scores and dividing these
	 * by the number of results times the ScoreRating.
	 *
	 * @returns {number} The overall score.
	 */
	calculateOverallScore () {
		const results = this.getValidResults()

		const totalScore = results.reduce((total, assessmentResult) => {
			// total + assessmentResult.getScore()
			const score = assessmentResult.getScore()

			return total + Math.max(0, score) // Ignore negative scores
		}, 0)

		return Math.round(totalScore / (results.length * ScoreRating) * 100) || 0
	}

	/**
	 * Registers an assessment and adds it to the internal assessments object.
	 *
	 * @param {string} name The name of the assessment.
	 * @param {Assessment} assessment The object containing function to run as an assessment and it's requirements.
	 * @returns {boolean} Whether registering the assessment was successful.
	 */
	addAssessment (name, assessment) {
		if (!Object.hasOwn(assessment, 'identifier')) {
			assessment.identifier = name
		}
		// If the assessor already has the same assessment, remove it and replace it with the new assessment with the same identifier.
		if (this.getAssessment(assessment.identifier)) {
			this.removeAssessment(assessment.identifier)
		}

		this._assessments.push(assessment)
		return true
	}

	/**
	 * Removes a specific Assessment from the list of Assessments.
	 *
	 * @param {string} name The Assessment to remove from the list of assessments.
	 * @returns {void}
	 */
	removeAssessment (name) {
		const toDelete = this._assessments.findIndex(assessment =>
			Object.hasOwn(assessment, 'identifier') && name === assessment.identifier
		)

		if (-1 !== toDelete) {
			this._assessments.splice(toDelete, 1)
		}
	}

	/**
	 * Returns an assessment by identifier
	 *
	 * @param {string} identifier The identifier of the assessment.
	 * @returns {Assessment} The object if found, otherwise undefined.
	 */
	getAssessment (identifier) {
		return this._assessments.find(assessment =>
			Object.hasOwn(assessment, 'identifier') && identifier === assessment.identifier
		)
	}

	/**
	 * Checks which of the available assessments are applicable and returns an array with applicable assessments.
	 *
	 * @returns {Assessment[]} The array with applicable assessments.
	 */
	getApplicableAssessments () {
		const availableAssessments = this.getAvailableAssessments()
		return availableAssessments.filter(assessment => this.isApplicable(assessment, this.getPaper(), this._researcher))
	}

	/**
	 * Returns the ScoreAggregator for this assessor.
	 *
	 * @returns {ScoreAggregator} The specific marker for this assessor.
	 */
	getScoreAggregator () {
		return this._scoreAggregator
	}
}

export default Assessor