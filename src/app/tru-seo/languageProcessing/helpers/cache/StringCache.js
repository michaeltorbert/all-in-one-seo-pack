/**
 * StringCache - A lightweight LRU cache for string processing operations.
 *
 * This cache is used to avoid re-processing the same strings multiple times.
 * It implements a simple LRU (Least Recently Used) eviction policy.
 *
 * @since 5.0.0
 */

/**
 * Default maximum cache size.
 *
 * @type {number}
 */
const DEFAULT_MAX_SIZE = 100

/**
 * Creates a new StringCache instance.
 *
 * @since 5.0.0
 * @param {number} [maxSize=100] The maximum number of entries to keep in the cache.
 * @returns {Object} The cache instance with get, set, has, clear, and size methods.
 */
export function createStringCache (maxSize = DEFAULT_MAX_SIZE) {
	const cache = new Map()

	return {
		/**
		 * Gets a value from the cache.
		 *
		 * @param {string} key The cache key.
		 * @returns {*} The cached value or undefined.
		 */
		get (key) {
			if (!cache.has(key)) {
				return undefined
			}

			// Move to end to mark as recently used (LRU).
			const value = cache.get(key)
			cache.delete(key)
			cache.set(key, value)

			return value
		},

		/**
		 * Sets a value in the cache.
		 *
		 * @param {string} key The cache key.
		 * @param {*} value The value to cache.
		 * @returns {void}
		 */
		set (key, value) {
			// Delete first if exists to update position.
			if (cache.has(key)) {
				cache.delete(key)
			} else if (cache.size >= maxSize) {
				// Remove oldest entry (first key).
				const oldestKey = cache.keys().next().value
				cache.delete(oldestKey)
			}

			cache.set(key, value)
		},

		/**
		 * Checks if a key exists in the cache.
		 *
		 * @param {string} key The cache key.
		 * @returns {boolean} True if the key exists.
		 */
		has (key) {
			return cache.has(key)
		},

		/**
		 * Clears the entire cache.
		 *
		 * @returns {void}
		 */
		clear () {
			cache.clear()
		},

		/**
		 * Gets the current cache size.
		 *
		 * @returns {number} The number of entries in the cache.
		 */
		get size () {
			return cache.size
		}
	}
}

/**
 * Creates a memoized version of a string processing function.
 *
 * @since 5.0.0
 * @param {Function} fn The function to memoize.
 * @param {number} [maxSize=100] The maximum cache size.
 * @returns {Function} The memoized function.
 */
export function memoizeStringFn (fn, maxSize = DEFAULT_MAX_SIZE) {
	const cache = createStringCache(maxSize)

	const memoized = function (str, ...args) {
		// Create cache key from string and additional args.
		const key = 0 < args.length
			? `${str}::${JSON.stringify(args)}`
			: str

		if (cache.has(key)) {
			return cache.get(key)
		}

		const result = fn(str, ...args)
		cache.set(key, result)

		return result
	}

	memoized.cache = cache
	memoized.clear = () => cache.clear()

	return memoized
}

export default {
	createStringCache,
	memoizeStringFn
}