import Shortlinker from './Shortlinker'

// Set global scope.
let globalScope

// In the browser, window exists so that is the global scope.
if ('undefined' === typeof window) {
	// Inside a web worker, self exists so that is the global scope.
	if ('undefined' === typeof self) {
		// Fall back tot the `global`, because that is the global scope in Node.JS.
		globalScope = global
	} else {
		globalScope = self
	}
} else {
	globalScope = window
}

globalScope.aioseo = globalScope.aioseo || {}
globalScope.aioseo.shortlinker = globalScope.aioseo.shortlinker || null

/**
 * Retrieves the Shortlinker instance.
 *
 * @returns {Shortlinker} The Shortlinker.
 */
function getShortlinker () {
	if (null === globalScope.aioseo.shortlinker) {
		globalScope.aioseo.shortlinker = new Shortlinker()
	}
	return globalScope.aioseo.shortlinker
}

/**
 * Configures the Shortlinker instance.
 *
 * @param {Object} config             The configuration.
 * @param {Object} [config.params={}] The default params for in the url.
 *
 * @returns {void}
 */
export function configureShortlinker (config) {
	(getShortlinker()).configure(config)
}

/**
 * Creates a link by combining the params from the config and appending them to the url.
 *
 * @param {string} url         The url.
 * @param {Object} [params={}] Optional extra params for in the url.
 *
 * @returns {string} The url with query string.
 */
export function createShortlink (url, params = {}) {
	return (getShortlinker()).append(url, params)
}