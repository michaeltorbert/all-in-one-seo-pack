/**
 * Google Tag Manager class.
 *
 * @since 4.0.0
 */
class GoogleTagManager {
	/**
	 * Class constructor.
	 *
	 * @since 4.0.0
	 */
	constructor () {
		this.containerId = window.aioseoGtm.containerId

		// Initialize!
		this.init()
	}

	/**
	 * The init method to do our work.
	 *
	 * @since 4.0.0
	 *
	 * @returns {void}
	 */
	init () {
		const iframe = document.createElement('iframe')
		iframe.src = `https://www.googletagmanager.com/ns.html?id=${this.containerId}`

		iframe.style.display = 'none'
		iframe.style.visibility  = 'hidden'
		iframe.height = 0
		iframe.width = 0

		const noscript = document.createElement('noscript')
		noscript.appendChild(iframe)

		document.body.insertBefore(noscript, document.body.firstChild)
	}
}

new GoogleTagManager()