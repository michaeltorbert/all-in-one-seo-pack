/**
 * Lightweight native utility functions to replace simple lodash operations.
 * These are optimized for performance and bundle size.
 *
 * @since 5.0.0
 */

/**
 * Checks if an object has a property.
 *
 * @since 5.0.0
 * @param {Object} obj The object to check.
 * @param {string} key The key to check for.
 * @returns {boolean} True if the object has the property.
 */
export const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

/**
 * Checks if a value is empty.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is empty.
 */
export const isEmpty = (value) => {
	if (null === value || undefined === value) return true
	if (Array.isArray(value) || 'string' === typeof value) return 0 === value.length
	if ('object' === typeof value) return 0 === Object.keys(value).length
	return false
}

/**
 * Checks if a value is null.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is null.
 */
export const isNull = (value) => null === value

/**
 * Checks if a value is an object.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is an object.
 */
export const isObject = (value) => null !== value && 'object' === typeof value && !Array.isArray(value)

/**
 * Checks if a value is a function.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is a function.
 */
export const isFunction = (value) => 'function' === typeof value

/**
 * Checks if a value is a string.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is a string.
 */
export const isString = (value) => 'string' === typeof value

/**
 * Checks if a value is undefined.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is undefined.
 */
export const isUndefined = (value) => undefined === value

/**
 * Checks if a value is an array.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is an array.
 */
export const isArray = (value) => Array.isArray(value)

/**
 * Checks if a value is a number.
 *
 * @since 5.0.0
 * @param {*} value The value to check.
 * @returns {boolean} True if the value is a number.
 */
export const isNumber = (value) => 'number' === typeof value && !Number.isNaN(value)

/**
 * A no-operation function.
 *
 * @since 5.0.0
 * @returns {void}
 */
export const noop = () => {}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @since 5.0.0
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} The debounced function.
 */
export const debounce = (func, wait) => {
	let timeoutId = null

	const debounced = function (...args) {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}

		timeoutId = setTimeout(() => {
			func.apply(this, args)
			timeoutId = null
		}, wait)
	}

	debounced.cancel = () => {
		if (timeoutId) {
			clearTimeout(timeoutId)
			timeoutId = null
		}
	}

	return debounced
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 *
 * @since 5.0.0
 * @param {Function} func The function to throttle.
 * @param {number} wait The number of milliseconds to throttle invocations to.
 * @returns {Function} The throttled function.
 */
export const throttle = (func, wait) => {
	let lastTime = 0,
	 timeoutId = null

	const throttled = function (...args) {
		const now = Date.now()
		const remaining = wait - (now - lastTime)

		if (0 >= remaining) {
			if (timeoutId) {
				clearTimeout(timeoutId)
				timeoutId = null
			}
			lastTime = now
			func.apply(this, args)
		} else if (!timeoutId) {
			timeoutId = setTimeout(() => {
				lastTime = Date.now()
				timeoutId = null
				func.apply(this, args)
			}, remaining)
		}
	}

	throttled.cancel = () => {
		if (timeoutId) {
			clearTimeout(timeoutId)
			timeoutId = null
		}
	}

	return throttled
}

/**
 * Creates a memoized version of a function.
 * Caches results based on the first argument (or a custom resolver).
 *
 * @since 5.0.0
 * @param {Function} func The function to memoize.
 * @param {Function} [resolver] Optional function to resolve the cache key.
 * @returns {Function} The memoized function.
 */
export const memoize = (func, resolver) => {
	const cache = new Map()

	const memoized = function (...args) {
		const key = resolver ? resolver.apply(this, args) : args[0]

		if (cache.has(key)) {
			return cache.get(key)
		}

		const result = func.apply(this, args)
		cache.set(key, result)

		return result
	}

	memoized.cache = cache
	memoized.clear = () => cache.clear()

	return memoized
}

/**
 * Iterates over elements of a collection and invokes iteratee for each element.
 *
 * @since 5.0.0
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object} The collection.
 */
export const forEach = (collection, iteratee) => {
	if (Array.isArray(collection)) {
		collection.forEach(iteratee)
	} else if (isObject(collection)) {
		Object.keys(collection).forEach(key => {
			iteratee(collection[key], key, collection)
		})
	}
	return collection
}