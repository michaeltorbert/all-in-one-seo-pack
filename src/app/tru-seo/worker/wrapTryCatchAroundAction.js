import formatString from '../helpers/formatString'

/**
 * Logs and formats the error message to send back to the plugin
 * when an analysis web worker action fails.
 *
 * @param {Error} 	error					          The error to log.
 * @param {Object}	payload					        The action payload.
 * @param {string} 	[errorMessagePrefix=""]	The prefix of the error message.
 *
 * @returns {string} the error message to send back.
 */
const handleError = function (error, payload, errorMessagePrefix = '') {
	// Try to format the string with payload parameters, if there are any.
	if (payload) {
		errorMessagePrefix = formatString(errorMessagePrefix, payload)
	}

	let errorMessage = errorMessagePrefix ? [ errorMessagePrefix ] : []

	if (error.name && error.message) {
		// Standard JavaScript error (e.g. when calling `throw new Error( message )`).
		errorMessage.push(`${error.name}: ${error.message}`)
	}

	errorMessage = errorMessage.join(' - ')
	return errorMessage
}

/**
 * Wraps the given action in a try-catch that logs the error message.
 *
 * @param {Function} action                  The action to safely run.
 * @param {string}   [errorMessagePrefix=""] The prefix of the error message.
 *
 * @returns {Function} The wrapped action.
 */
export default function wrapTryCatchAroundAction (action, errorMessagePrefix = '') {
	return async (...args) => {
		try {
			return await action(...args)
		} catch (error) {
			const errorMessage = handleError(error, args[1], errorMessagePrefix)
			return { error: errorMessage }
		}
	}
}