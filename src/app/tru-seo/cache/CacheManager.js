/**
 * CacheManager - Central cache management for TruSEO.
 *
 * This module provides a centralized way to manage all caches across the TruSEO system.
 * It allows clearing all caches at once (e.g., when navigating between posts) and
 * provides cache statistics for debugging.
 *
 * @since 5.0.0
 */

/**
 * Registry of all caches in the system.
 *
 * @since 5.0.0
 * @type {Map<string, {clear: Function, size?: Function|number}>}
 */
const cacheRegistry = new Map()

/**
 * Registers a cache with the manager.
 *
 * @since 5.0.0
 * @param {string} name The unique name for this cache.
 * @param {Object} cache The cache object with at least a `clear` method.
 * @param {Function} cache.clear Function to clear the cache.
 * @param {Function|number} [cache.size] Function or getter to get cache size.
 * @returns {void}
 */
export function registerCache (name, cache) {
	if (!cache || 'function' !== typeof cache.clear) {
		console.warn(`Cache "${name}" must have a clear() method`)
		return
	}

	cacheRegistry.set(name, cache)
}

/**
 * Unregisters a cache from the manager.
 *
 * @since 5.0.0
 * @param {string} name The name of the cache to unregister.
 * @returns {boolean} True if the cache was unregistered.
 */
export function unregisterCache (name) {
	return cacheRegistry.delete(name)
}

/**
 * Clears all registered caches.
 * Call this when navigating between posts or when memory needs to be freed.
 *
 * @since 5.0.0
 * @returns {void}
 */
export function clearAllCaches () {
	cacheRegistry.forEach((cache, name) => {
		try {
			cache.clear()
		} catch (error) {
			console.warn(`Failed to clear cache "${name}":`, error)
		}
	})
}

/**
 * Clears a specific cache by name.
 *
 * @since 5.0.0
 * @param {string} name The name of the cache to clear.
 * @returns {boolean} True if the cache was found and cleared.
 */
export function clearCache (name) {
	const cache = cacheRegistry.get(name)

	if (cache) {
		cache.clear()
		return true
	}

	return false
}

/**
 * Gets the size of a specific cache.
 *
 * @since 5.0.0
 * @param {string} name The name of the cache.
 * @returns {number} The size of the cache, or -1 if unknown.
 */
export function getCacheSize (name) {
	const cache = cacheRegistry.get(name)

	if (!cache) {
		return -1
	}

	if ('function' === typeof cache.size) {
		return cache.size()
	}

	if ('number' === typeof cache.size) {
		return cache.size
	}

	return -1
}

/**
 * Gets statistics for all registered caches.
 *
 * @since 5.0.0
 * @returns {Object} An object with cache names as keys and their sizes as values.
 */
export function getCacheStats () {
	const stats = {}

	cacheRegistry.forEach((_cache, name) => {
		stats[name] = getCacheSize(name)
	})

	return stats
}

/**
 * Gets the names of all registered caches.
 *
 * @since 5.0.0
 * @returns {string[]} Array of cache names.
 */
export function getRegisteredCaches () {
	return Array.from(cacheRegistry.keys())
}

export default {
	registerCache,
	unregisterCache,
	clearAllCaches,
	clearCache,
	getCacheSize,
	getCacheStats,
	getRegisteredCaches
}