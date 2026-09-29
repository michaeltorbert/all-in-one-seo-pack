import http from '@/vue/utils/http'
import links from '@/vue/utils/links'

/**
 * Service for fetching and caching keyword cannibalization data.
 *
 * Caches results by keyphrase to avoid redundant REST API calls
 * during the TruSEO analysis loop.
 *
 * @since 5.0.0
 */
export default class KeywordCannibalizationService {
	constructor () {
		this._cachedKeyphrase = null
		this._cachedResult = null
	}

	/**
	 * Fetches keyword cannibalization data for the given keyphrase.
	 *
	 * Returns cached result if the keyphrase hasn't changed.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} keyphrase  The focus keyphrase.
	 * @param {number} postId     The current post or term ID.
	 * @param {string} objectType Either 'post' or 'term' — decides how the ID is resolved server-side.
	 * @returns {Promise<Object>} The cannibalization result.
	 */
	async fetch (keyphrase, postId, objectType = 'post') {
		const normalized = keyphrase.toLowerCase().trim()

		if ('' === normalized) {
			return { cannibalizingPosts: [] }
		}

		if (normalized === this._cachedKeyphrase) {
			return this._cachedResult
		}

		try {
			const response = await http.post(links.restUrl('tru-seo/keyword-cannibalization'))
				.send({ keyphrase: normalized, postId, objectType })

			if (response?.body?.success) {
				this._cachedKeyphrase = normalized
				this._cachedResult = {
					cannibalizingPosts : response.body.cannibalizingPosts || []
				}

				return this._cachedResult
			}
		} catch (error) {
			console.error('Keyword cannibalization check failed:', error)
		}

		return { cannibalizingPosts: [] }
	}

	/**
	 * Clears the cached result.
	 *
	 * @since 5.0.0
	 *
	 * @returns {void}
	 */
	clear () {
		this._cachedKeyphrase = null
		this._cachedResult = null
	}
}