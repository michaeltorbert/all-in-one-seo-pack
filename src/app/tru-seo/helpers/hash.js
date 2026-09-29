/**
 * Hash utility functions for generating cache keys.
 *
 * Cache keys must uniquely identify content, so these hash the full content.
 * A linear djb2 pass is negligible next to the parsing/analysis it gates.
 *
 * @since 5.0.0
 */

/**
 * DJB2 hash algorithm implementation.
 * Fast and provides good distribution for string hashing.
 *
 * @since 5.0.0
 *
 * @param {string} str The string to hash.
 * @returns {number} The hash value.
 */
export const djb2Hash = (str) => {
	let hash = 5381
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i)
	}
	return hash
}

/**
 * cyrb53 hash. A fast, synchronous, non-cryptographic hash that stays in 32-bit
 * lanes (via Math.imul), so its output is a fixed-width 53-bit integer regardless
 * of input length — ideal for a fixed-size, low-collision cache key. Hashes the
 * full string (no sampling).
 *
 * @since 5.0.0
 *
 * @param {string} str  The string to hash.
 * @param {number} seed Optional seed.
 * @returns {number} A 53-bit unsigned integer hash.
 */
export const cyrb53 = (str, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i)
		h1 = Math.imul(h1 ^ ch, 2654435761)
		h2 = Math.imul(h2 ^ ch, 1597334677)
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

	return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/**
 * Generates a hash for content, used as a cache key.
 * Hashes the entire content — sampling would let distinct contents collide and
 * return stale cached analysis (e.g. toggling a heading to H1 mid-document).
 *
 * @since 5.0.0
 *
 * @param {string} content The content to generate a hash for.
 * @returns {string} The content hash.
 */
export const contentHash = (content) => {
	if (!content) {
		return '0'
	}

	return djb2Hash(content).toString(36)
}

/**
 * Generates a cache key from multiple values without concatenating them.
 * Uses incremental hashing to avoid creating large intermediate strings.
 *
 * @since 5.0.0
 *
 * @param {...string} values The values to include in the cache key.
 * @returns {string} The cache key.
 *
 * @example
 * // Instead of: `${content}|${keyword}|${title}`
 * const key = generateCacheKey(content, keyword, title)
 */
export const generateCacheKey = (...values) => {
	let combinedHash = 5381

	for (const value of values) {
		if (!value) {
			// Include a marker for empty values to maintain uniqueness.
			combinedHash = ((combinedHash << 5) + combinedHash) ^ 0
			continue
		}

		const str = String(value)

		combinedHash = ((combinedHash << 5) + combinedHash) ^ djb2Hash(str)

		// Also include length in hash for better uniqueness.
		combinedHash = ((combinedHash << 5) + combinedHash) ^ str.length
	}

	return combinedHash.toString(36)
}