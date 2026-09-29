export const getJsonValue = (value, defaultValue = null) => {
	try {
		value = JSON.parse(value)
	} catch (error) {
		value = defaultValue
	}
	return value
}