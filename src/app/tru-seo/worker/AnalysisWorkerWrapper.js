// Internal dependencies.
import Request from './request'
import Transporter from './transporter'

/**
 * Analysis worker is an API around the Web Worker.
 */
class AnalysisWorkerWrapper {
	/**
	 * Initializes the AnalysisWorkerWrapper class.
	 *
	 * @param {Worker} worker The worker to wrap.
	 *
	 * @constructor
	 */
	constructor (worker) {
		// Initialize instance variables.
		this._worker = worker
		this._requests = {}
		this._autoIncrementedRequestId = -1

		// Bind actions to this scope.
		this.initialize = this.initialize.bind(this)
		this.analyze = this.analyze.bind(this)
		this.loadScript = this.loadScript.bind(this)
		this.sendMessage = this.sendMessage.bind(this)
		this.runResearch = this.runResearch.bind(this)

		// Bind event handlers to this scope.
		this.handleMessage = this.handleMessage.bind(this)
		this.handleMessageError = this.handleMessageError.bind(this)

		// Initialize the worker event handlers.
		this._worker.onmessage = this.handleMessage
		this._worker.onmessageerror = this.handleMessageError
	}

	/**
	 * Receives the messages and determines the action.
	 *
	 * See: https://developer.mozilla.org/en-US/docs/Web/API/Worker/onmessage
	 *
	 * @param {MessageEvent} event              The post message event.
	 * @param {Object}       event.data         The data object.
	 * @param {string}       event.data.type    The action type.
	 * @param {number}       event.data.id      The request id.
	 * @param {string}       event.data.payload The payload of the action.
	 *
	 * @returns {void}
	 */
	handleMessage ({ data: { type, id, payload } }) {
		// Handle debug/initialization messages that don't have request IDs.
		if ('worker_script_loaded' === type || 'worker_initialized' === type) {
			return
		}

		// Handle spell checker dictionary ready notification.
		if ('spellChecker:ready' === type) {
			if ('function' === typeof this.onSpellCheckerReady) {
				this.onSpellCheckerReady()
			}

			return
		}

		const request = this._requests[id]
		if (!request) {
			return
		}

		payload = Transporter.parse(payload)

		switch (type) {
			case 'initialize:done':
			case 'loadScript:done':
			case 'customMessage:done':
			case 'runResearch:done':
			case 'analyze:done':
			case 'clearCaches:done':
			case 'getCacheStats:done':
			case 'spellChecker:suggest:done':
			case 'spellChecker:check:done':
			case 'spellChecker:addSafeWord:done':
			case 'spellChecker:removeSafeWord:done':
			case 'spellChecker:setSafeWordMatchCase:done':
				request.resolve(payload)
				break
			case 'analyze:failed':
			case 'loadScript:failed':
			case 'customMessage:failed':
			case 'runResearch:failed':
			case 'clearCaches:failed':
			case 'getCacheStats:failed':
				request.reject(payload)
				break
			default:
				console.warn('AnalysisWebWorker unrecognized action:', type)
		}

		// Remove the handled request from our queue.
		delete this._requests[id]
	}

	/**
	 * Receives the message errors.
	 *
	 * See: https://developer.mozilla.org/en-US/docs/Web/Events/messageerror
	 *
	 * @param {MessageEvent} event The message event for the error that
	 *                             occurred.
	 *
	 * @returns {void}
	 */
	handleMessageError (event) {
		console.warn('AnalysisWebWorker message error:', event)
	}

	/**
	 * Increments the request id.
	 *
	 * @returns {number} The incremented id.
	 */
	createRequestId () {
		this._autoIncrementedRequestId++
		return this._autoIncrementedRequestId
	}

	/**
	 * Creates a new request inside a Promise.
	 *
	 * @param {number} id     The request id.
	 * @param {Object} [data] Optional extra data.
	 *
	 * @returns {Promise} The callback promise.
	 */
	createRequestPromise (id, data = {}) {
		return new Promise((resolve, reject) => {
			this._requests[id] = new Request(resolve, reject, data)
		})
	}

	/**
	 * Sends a request to the worker and returns a promise that will resolve or reject once the worker finishes.
	 *
	 * @param {string} action  The action of the request.
	 * @param {Object} payload The payload of the request.
	 * @param {Object} [data]  Optional extra data.
	 *
	 * @returns {Promise} A promise that will resolve or reject once the worker finishes.
	 */
	sendRequest (action, payload, data = {}) {
		const id = this.createRequestId()
		const promise = this.createRequestPromise(id, data)

		this.send(action, id, payload)
		return promise
	}

	/**
	 * Sends a message to the worker.
	 *
	 * @param {string} type      The message type.
	 * @param {number} id        The request id.
	 * @param {Object} [payload] The payload to deliver.
	 *
	 * @returns {void}
	 */
	send (type, id, payload = {}) {
		payload = Transporter.serialize(payload)

		this._worker.postMessage({
			type,
			id,
			payload
		})
	}

	/**
	 * Initializes the worker with a configuration.
	 *
	 * @param {Object} configuration The configuration to initialize the worker
	 *                               with.
	 *
	 * @returns {Promise} The promise of initialization.
	 */
	initialize (configuration) {
		return this.sendRequest('initialize', configuration)
	}

	/**
	 * Analyzes the paper.
	 *
	 * @param {Object} paper           The paper to analyze.
	 *
	 * @returns {Promise} The promise of analyses.
	 */
	analyze (paper) {
		return this.sendRequest('analyze', { paper })
	}

	/**
	 * Imports a script to the worker.
	 *
	 * @param {string} url The relative url to the script to be loaded.
	 *
	 * @returns {Promise} The promise of the script import.
	 */
	loadScript (url) {
		return this.sendRequest('loadScript', { url })
	}

	/**
	 * Sends a custom message to the worker.
	 *
	 * @param {string} name       The name of the message.
	 * @param {string} data       The data of the message.
	 * @param {string} pluginName The plugin that registered this type of message.
	 *
	 * @returns {Promise} The promise of the custom message.
	 */
	sendMessage (name, data, pluginName) {
		name = pluginName + '-' + name
		return this.sendRequest('customMessage', { name, data }, data)
	}

	/**
	 * Runs the specified research in the worker. Optionally pass a paper.
	 *
	 * @param {string} name    The name of the research to run.
	 * @param {Paper} [paper] The paper to run the research on if it shouldn't
	 *                         be run on the latest paper.
	 *
	 * @returns {Promise} The promise of the research.
	 */
	runResearch (name, paper = null) {
		return this.sendRequest('runResearch', { name, paper })
	}

	/**
	 * Clears all caches in the worker.
	 * Call this when navigating between posts or when memory needs to be freed.
	 *
	 * @since 5.0.0
	 * @returns {Promise} The promise of cache clearing.
	 */
	clearCaches () {
		return this.sendRequest('clearCaches', {})
	}

	/**
	 * Gets cache statistics from the worker for debugging.
	 *
	 * @since 5.0.0
	 * @returns {Promise} The promise containing cache stats.
	 */
	getCacheStats () {
		return this.sendRequest('getCacheStats', {})
	}

	/**
	 * Requests spelling suggestions for a word from the worker.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The misspelled word.
	 * @returns {Promise<Object>} Resolves with { suggestions: string[] }.
	 */
	requestSuggestions (word) {
		return this.sendRequest('spellChecker:suggest', { word })
	}

	/**
	 * Asks the worker whether a single word is spelled correctly.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {Promise<Object>} Resolves with { valid: boolean }.
	 */
	requestSpellingCheck (word) {
		return this.sendRequest('spellChecker:check', { word })
	}

	/**
	 * Adds a word to the per-site safe-words dictionary in the live Hunspell instance.
	 *
	 * @since 5.0.0
	 *
	 * @param {string}  word      The word to add.
	 * @param {boolean} matchCase Whether the word must match its exact casing.
	 * @returns {Promise<Object>} Resolves with { success: boolean }.
	 */
	requestAddSafeWord (word, matchCase = false) {
		return this.sendRequest('spellChecker:addSafeWord', { word, matchCase })
	}

	/**
	 * Removes a word from the per-site safe-words dictionary in the live Hunspell instance.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to remove.
	 * @returns {Promise<Object>} Resolves with { success: boolean }.
	 */
	requestRemoveSafeWord (word) {
		return this.sendRequest('spellChecker:removeSafeWord', { word })
	}

	/**
	 * Toggles the match-case state of a safe word in the live Hunspell instance.
	 *
	 * @since 5.0.0
	 *
	 * @param {string}  word      The word to update.
	 * @param {boolean} matchCase The desired match-case state.
	 * @returns {Promise<Object>} Resolves with { success: boolean }.
	 */
	requestSetSafeWordMatchCase (word, matchCase) {
		return this.sendRequest('spellChecker:setSafeWordMatchCase', { word, matchCase })
	}
}

export default AnalysisWorkerWrapper