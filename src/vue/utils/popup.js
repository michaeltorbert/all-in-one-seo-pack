import { getParams } from '@/vue/utils/params'

let interval    = false,
	popupWindow = null,
	postMessageCallbackFunction

const triggerPostMessageCallback = event => {
	postMessageCallbackFunction(event, popupWindow, triggerPostMessageCallback)
}

export const popup = (url, target, width, height, center, requiredParams, completedCallback, closedCallback, postMessageCallback) => {
	let left = 50,
		top  = 50

	if (center) {
		const currentWindowHeight = window.outerHeight // Includes the address bar, etc.
		const currentWindowWidth  = window.innerWidth // We don't want to include devtools, etc.

		left = (currentWindowWidth - width) / 2
		top  = (currentWindowHeight - 50 - height) / 2
	}

	let options = `location=0,status=0,width=${width},height=${height},left=${left},top=${top}` // eslint-disable-line one-var
	if ('_blank' === target || '_self' === target) {
		options = ''
	}

	if (!popupWindow || popupWindow.closed) {
		popupWindow = window.open(url, target, options)
	}

	if (popupWindow) {
		popupWindow.focus()
	}

	interval = window.setInterval(() => pollWindow(requiredParams, completedCallback, closedCallback, postMessageCallback), 500)

	if (postMessageCallback) {
		postMessageCallbackFunction = postMessageCallback
		window.addEventListener('message', triggerPostMessageCallback, false)
	}
}

const pollWindow = (requiredParams, completedCallback, closedCallback, postMessageCallback = false) => {
	if (postMessageCallback) {
		if (!popupWindow) {
			window.removeEventListener('message', triggerPostMessageCallback, false)
			window.clearInterval(interval)
			closedCallback()
			return
		}

		if (popupWindow.closed) {
			popupWindow = null
			window.removeEventListener('message', triggerPostMessageCallback, false)
			window.clearInterval(interval)
			closedCallback()
		}

		return
	}

	let params = {}
	try {
		params = getParams(popupWindow.location.search)
	} catch (e) {}

	const tests = []
	requiredParams.forEach(param => {
		if (params[param] !== undefined && params[param]) {
			tests.push(true)
			return
		}

		tests.push(false)
	})

	if (tests.every(a => a)) {
		window.clearInterval(interval)
		return completedCallback(params)
			.then(() => {
				popupWindow.close()
				popupWindow = null
				closedCallback(true)
			})
	}

	if (!popupWindow) {
		window.clearInterval(interval)
		closedCallback()
		return
	}

	if (popupWindow.closed) {
		popupWindow = null
		window.clearInterval(interval)
		closedCallback()
	}
}