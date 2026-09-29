/**
 * AssessmentRegistry - A singleton registry for caching and reusing assessment instances.
 *
 * This registry reduces memory usage and improves performance by:
 * - Caching assessment instances to avoid repeated instantiation
 * - Allowing assessors to share assessment instances when appropriate
 * - Providing lazy initialization of assessments
 *
 * @since 5.0.0
 */

/**
 * Cache for assessment instances keyed by a unique identifier.
 * The key is typically the assessment class name + options hash.
 *
 * @since 5.0.0
 */
const assessmentCache = new Map()

/**
 * Creates a unique cache key for an assessment based on its constructor and options.
 *
 * @since 5.0.0
 * @param {Function} AssessmentClass The assessment class constructor.
 * @param {Object} [options={}] The options to pass to the assessment.
 * @returns {string} A unique cache key.
 */
function createCacheKey (AssessmentClass, options = {}) {
	const className = AssessmentClass.name || AssessmentClass.toString().slice(0, 50)
	const optionsKey = JSON.stringify(options)
	return `${className}::${optionsKey}`
}

/**
 * Gets or creates an assessment instance from the registry.
 * If an instance with the same class and options already exists, it returns the cached instance.
 * Otherwise, it creates a new instance, caches it, and returns it.
 *
 * @since 5.0.0
 * @param {Function} AssessmentClass The assessment class constructor.
 * @param {Object} [options] The options to pass to the assessment constructor.
 * @returns {Object} The assessment instance.
 * @example
 * // Get a cached KeyphraseLengthAssessment instance
 * const assessment = getAssessment(KeyphraseLengthAssessment)
 *
 * // Get a cached TitleWidth assessment with specific options
 * const titleAssessment = getAssessment(TitleWidth, { scores: { widthTooShort: 9 } })
 */
export function getAssessment (AssessmentClass, options) {
	const cacheKey = createCacheKey(AssessmentClass, options)

	if (!assessmentCache.has(cacheKey)) {
		const instance = options
			? new AssessmentClass(options)
			: new AssessmentClass()

		assessmentCache.set(cacheKey, instance)
	}

	return assessmentCache.get(cacheKey)
}

/**
 * Creates a new assessment instance without caching.
 * Use this when you need a unique instance that shouldn't be shared.
 *
 * @since 5.0.0
 * @param {Function} AssessmentClass The assessment class constructor.
 * @param {Object} [options] The options to pass to the assessment constructor.
 * @returns {Object} A new assessment instance.
 */
export function createAssessment (AssessmentClass, options) {
	return options
		? new AssessmentClass(options)
		: new AssessmentClass()
}

/**
 * Checks if an assessment is already cached.
 *
 * @since 5.0.0
 * @param {Function} AssessmentClass The assessment class constructor.
 * @param {Object} [options] The options used for caching.
 * @returns {boolean} True if the assessment is cached.
 */
export function hasAssessment (AssessmentClass, options) {
	const cacheKey = createCacheKey(AssessmentClass, options)
	return assessmentCache.has(cacheKey)
}

/**
 * Clears all cached assessments.
 * Useful for testing or when memory needs to be freed.
 *
 * @since 5.0.0
 * @returns {void}
 */
export function clearAssessmentCache () {
	assessmentCache.clear()
}

/**
 * Gets the current cache size.
 *
 * @since 5.0.0
 * @returns {number} The number of cached assessments.
 */
export function getAssessmentCacheSize () {
	return assessmentCache.size
}

/**
 * Helper to create multiple assessments at once from a configuration array.
 *
 * @since 5.0.0
 * @param {Array} configs Array of assessment configurations [{class, options}].
 * @returns {Array} Array of assessment instances.
 * @example
 * const assessments = createAssessmentsFromConfig([
 *   { class: KeyphraseLengthAssessment },
 *   { class: TitleWidth, options: { scores: { widthTooShort: 9 } } },
 *   { class: MetaDescriptionLength }
 * ])
 */
export function createAssessmentsFromConfig (configs) {
	return configs.map(config => {
		const { class: AssessmentClass, options } = config
		return getAssessment(AssessmentClass, options)
	})
}

export default {
	getAssessment,
	createAssessment,
	hasAssessment,
	clearAssessmentCache,
	getAssessmentCacheSize,
	createAssessmentsFromConfig
}