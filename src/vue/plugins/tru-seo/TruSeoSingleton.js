import { truSeoShouldAnalyze } from './components/helpers'

/**
 * Singleton instance of TruSeoWrapper to ensure only one worker is created
 */
let instance = null,
	initializationPromise = null

/**
 * Gets or creates the singleton TruSeoWrapper instance
 *
 * @param {Object} options Configuration options for TruSeoWrapper
 * @returns {Promise<TruSeoWrapper|null>} The singleton instance or null if not eligible
 */
export async function getTruSeoInstance (options = {}) {
	// Check eligibility before loading any TruSeo modules.
	if (!truSeoShouldAnalyze()) {
		return null
	}

	// If already initialized, return the instance
	if (instance) {
		return instance
	}

	// If initialization is in progress, wait for it
	if (initializationPromise) {
		return initializationPromise
	}

	// Start initialization - dynamically import TruSeoWrapper to avoid loading
	// the web worker script until we know we actually need it.
	initializationPromise = (async () => {
		const { default: TruSeoWrapper } = await import('./TruSeoWrapper')
		instance = new TruSeoWrapper(options)
		await instance.initializeWorker()
		return instance
	})()

	return initializationPromise
}

/**
 * Destroys the singleton instance (useful for cleanup).
 * Properly clears caches and terminates the worker through the instance's destroy method.
 *
 * @since 5.0.0
 * @returns {Promise<void>} Promise that resolves when the instance is destroyed.
 */
export async function destroyTruSeoInstance () {
	if (instance) {
		await instance.destroy()
	}
	instance = null
	initializationPromise = null
}

export default getTruSeoInstance