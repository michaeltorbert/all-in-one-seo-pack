/**
 * AssessmentRunner - Executes assessments in optimized batches for performance.
 *
 * This runner processes assessments in parallel chunks to avoid overwhelming
 * the system while maximizing throughput. This is especially important as the
 * number of assessments grows.
 *
 * @since 5.0.0
 */
export default class AssessmentRunner {
	constructor (options = {}) {
		this.chunkSize = options.chunkSize || 5
	}

	/**
	 * Runs assessments in parallel chunks and returns results keyed by identifier.
	 *
	 * @since 5.0.0
	 * @param {Array} assessments Array of assessment instances to run.
	 * @param {Object} context The context object containing all data for assessments.
	 * @param {Object} options Optional configuration.
	 * @param {number} options.chunkSize Number of assessments to run in parallel per batch.
	 * @param {Function} options.onProgress Callback function called after each chunk completes.
	 * @returns {Promise<Object>} Object with assessment results keyed by identifier.
	 */
	async run (assessments, context, options = {}) {
		if (!assessments?.length) {
			return {}
		}

		const chunkSize = options.chunkSize || this.chunkSize
		const onProgress = options.onProgress || null
		const results = {}

		// Process assessments in chunks for better performance
		for (let i = 0; i < assessments.length; i += chunkSize) {
			const chunk = assessments.slice(i, i + chunkSize)

			// Run chunk in parallel
			const chunkResults = await Promise.all(
				chunk.map(async assessment => {
					try {
						const result = await assessment.getResult(context)

						return {
							identifier : assessment.identifier,
							result     : result
						}
					} catch (error) {
						console.error(`Assessment ${assessment.identifier} failed:`, error)

						return {
							identifier : assessment.identifier,
							result     : null
						}
					}
				})
			)

			// Collect results
			chunkResults.forEach(({ identifier, result }) => {
				if (result && 0 < Object.keys(result).length && '' !== result?.title && '' !== result?.text) {
					results[identifier] = result
				}
			})

			// Progress callback
			if (onProgress) {
				onProgress({
					completed : Math.min(i + chunkSize, assessments.length),
					total     : assessments.length,
					results   : results
				})
			}
		}

		return results
	}

	/**
	 * Runs a categorized set of assessments (seo, readability, title).
	 * Returns results in the same categorized structure.
	 *
	 * @since 5.0.0
	 * @param {Object} categorizedAssessments Object with seo, readability, title arrays.
	 * @param {Object} context The context object containing all data for assessments.
	 * @param {Object} options Optional configuration.
	 * @returns {Promise<Object>} Object with categorized results { seo: {}, readability: {}, title: {} }.
	 */
	async runCategorized (categorizedAssessments, context, options = {}) {
		const results = {}

		// Run each category in parallel
		const categories = Object.keys(categorizedAssessments)
		const categoryResults = await Promise.all(
			categories.map(async category => {
				const assessments = categorizedAssessments[category]
				const categoryResult = await this.run(assessments, context, options)
				return { category, result: categoryResult }
			})
		)

		// Organize results by category
		categoryResults.forEach(({ category, result }) => {
			results[category] = result
		})

		return results
	}

	/**
	 * Sets the default chunk size for this runner instance.
	 *
	 * @since 5.0.0
	 * @param {number} size The number of assessments to run in parallel per batch.
	 * @returns {AssessmentRunner} Returns this for chaining.
	 */
	setChunkSize (size) {
		this.chunkSize = size
		return this
	}
}