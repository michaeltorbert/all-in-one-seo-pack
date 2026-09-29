/**
 * Global timeout variable for debounceContext.
 *
 * @type {number|undefined}
 */
let timeout,

	/**
 * Global timer variable for debounce.
 * Using a single global timer means all calls to debounce() will cancel previous pending calls.
 * This is intentional behavior - it ensures only the most recent debounced action runs.
 *
 * @type {number|undefined}
 */
	timer

/**
 * Debounces a function call with context preservation.
 *
 * @since 4.0.0
 *
 * @param {Function} fn   The function to debounce.
 * @param {number}   time The debounce delay in milliseconds.
 * @returns {*} The result of calling the function.
 */
export const debounceContext = (fn, time) => {
	return ((...args) => {
		const functionCall = () => fn(...args)

		clearTimeout(timeout)
		timeout = setTimeout(functionCall, time)
	}).call()
}

/**
 * Debounces a function call using a global timer.
 * All calls to this function share the same timer, meaning a new call cancels any pending previous call.
 * This is useful when you want to ensure only the most recent action runs.
 *
 * NOTE: If you need isolated debouncing where different functions don't cancel each other,
 * use `createDebounce()` instead which creates function-specific timers.
 *
 * @since 4.0.0
 *
 * @param {Function} fn The function to debounce.
 * @param {number}   d  The debounce delay in milliseconds.
 * @returns {void}
 */
export const debounce = function (fn, d) {
	if (timer) {
		clearTimeout(timer)
	}

	timer = setTimeout(fn, d)
}

/**
 * Creates a debounced version of a function with its own isolated timer.
 * Use this when you need a reusable debounced function.
 *
 * @since 5.0.0
 *
 * @param {Function} fn    The function to debounce.
 * @param {number}   delay The debounce delay in milliseconds.
 * @returns {Function} A debounced version of the function.
 *
 * @example
 * const debouncedSave = createDebounce(() => saveData(), 500)
 * // Call multiple times, only executes once after 500ms of inactivity
 * debouncedSave()
 * debouncedSave()
 * debouncedSave()
 */
export const createDebounce = (fn, delay) => {
	let instanceTimer = null

	const debouncedFn = (...args) => {
		if (instanceTimer) {
			clearTimeout(instanceTimer)
		}
		instanceTimer = setTimeout(() => fn(...args), delay)
	}

	/**
	 * Cancels any pending debounced call.
	 *
	 * @returns {void}
	 */
	debouncedFn.cancel = () => {
		if (instanceTimer) {
			clearTimeout(instanceTimer)
			instanceTimer = null
		}
	}

	/**
	 * Immediately executes the function and cancels any pending call.
	 *
	 * @param {...*} args Arguments to pass to the function.
	 * @returns {*} The result of the function.
	 */
	debouncedFn.flush = (...args) => {
		debouncedFn.cancel()
		return fn(...args)
	}

	return debouncedFn
}

/**
 * Creates a throttled version of a function.
 * Unlike debounce, throttle ensures the function is called at most once per interval.
 *
 * @since 5.0.0
 *
 * @param {Function} fn       The function to throttle.
 * @param {number}   interval The minimum time between calls in milliseconds.
 * @returns {Function} A throttled version of the function.
 *
 * @example
 * const throttledScroll = createThrottle(() => handleScroll(), 100)
 * window.addEventListener('scroll', throttledScroll)
 */
export const createThrottle = (fn, interval) => {
	let lastCallTime = 0,
	 pendingTimer = null

	return (...args) => {
		const now = Date.now()
		const timeSinceLastCall = now - lastCallTime

		if (timeSinceLastCall >= interval) {
			// Enough time has passed, execute immediately.
			lastCallTime = now
			fn(...args)
		} else if (!pendingTimer) {
			// Schedule execution for the remaining time.
			pendingTimer = setTimeout(() => {
				lastCallTime = Date.now()
				pendingTimer = null
				fn(...args)
			}, interval - timeSinceLastCall)
		}
	}
}