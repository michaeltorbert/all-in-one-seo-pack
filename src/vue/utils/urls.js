export const makeUrlRelative = function (url, baseUrl) {
	if ('string' !== typeof url) {
		return url
	}

	const pattern = new RegExp('^' + baseUrl.replace(/\/$/, ''), 'i')
	return url.replace(pattern, '')
}