export const getParams = url => {
	return (url || document.location.search).replace(/(^\?)/, '').split('&').map(function (n) {
		n          = n.split('=')
		this[n[0]] = n[1]
		return this
	}.bind({}))[0]
}

// Snapshot taken at module evaluation. Deep-link params such as `aioseo-scroll` are stripped
// shortly after load, so late-mounting consumers can't read them off the live URL anymore.
const initialParams = getParams()

export const getInitialParams = () => {
	return { ...initialParams }
}

export const removeParam = (param, url) => {
	url = url || document.location.href
	const hashParts = url.split('#')
	const urlParts  = hashParts[0].split('?')
	if (2 > urlParts.length) {
		return url
	}

	const prefix = encodeURIComponent(param) + '='
	const pars   = urlParts[1].split(/[&;]/g)
	for (let i = pars.length; 0 < i--;) {
		if (-1 !== pars[i].lastIndexOf(prefix, 0)) {
			pars.splice(i, 1)
		}
	}

	const allHashParts = hashParts[1] ? '#' + hashParts[1] : ''
	const newUrl       = urlParts[0] + (0 < pars.length ? '?' + pars.join('&') : '') + allHashParts
	window.history.replaceState(null, null, newUrl)
}

export const addParam = (param, val) => {
	const url = new URL(window.location.href)
	const searchParams = url.searchParams

	searchParams.delete(param)
	searchParams.append(param, val)

	url.search = searchParams.toString()

	window.history.replaceState(null, null, url.toString())
}