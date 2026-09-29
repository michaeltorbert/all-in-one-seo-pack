/**
 * Gets the parsed type name of subjects.
 *
 * @param {Array|Object|string|number} subject The subject to get the parsed type from.
 * @returns {string} The parsed type name.
 */
const getType = function (subject) {
	if (Array.isArray(subject)) {
		return 'array'
	}
	return typeof subject
}

/**
 * Validates the type of subjects. Throws an error if the type is invalid.
 *
 * @param {Object} subject The object containing all subjects.
 * @param {string} expectedType The expected type.
 * @returns {boolean} Returns true if types matches expected type. Otherwise returns false.
 */
const isSameType = function (subject, expectedType) {
	const passedType = getType(subject)
	return passedType === expectedType
}

export {
	getType,
	isSameType
}

export default {
	getType    : getType,
	isSameType : isSameType
}