import PageBuilderIntegration from '../PageBuilderIntegration'
import initWatcher from './watcher'
import { isDivi5Ready, isDivi5 } from './helpers'
import { getDivi5AppWindow } from './divi5-helpers'

// Modern components (Divi 5+).
import Button from './components/Button'
import LimitModifiedDate from './components/LimitModifiedDate'
import Modal from './components/Modal'

// Legacy imports (Divi 4.x).
import initSettingsBar from './legacy-settings-bar'
import initLimitModifiedDate from './limit-modified-date/main'
import App from './App'

/**
 * Init the Divi integration using PageBuilderIntegration (Divi 5+).
 *
 * @returns {void}
 */
const initModern = () => {
	const slug                  = 'divi'
	const toolbarSelector       = '.et-vb-builder-bar-wrap'
	const buttonId              = `aioseo-button-${slug}`
	const getToolbarWrapper     = () => document.querySelector(toolbarSelector)
	const getToolbarButtonAfter = ($wrapper) => [ ...($wrapper?.querySelectorAll(':scope > button.et-vb-builder-bar-button') || []) ].pop()
	const getToolbarButtonStyle = ($wrapper) => {
		const $icon = $wrapper?.querySelector('.et-vb-icon')
		if (!$icon) {
			return ''
		}

		const { width, height, minWidth } = getComputedStyle($icon)
		return `--icon-width: ${width}; --icon-height: ${height}; --icon-min-width: ${minWidth}`
	}

	let attempts      = 0
	const maxAttempts = 60
	const interval    = setInterval(() => {
		const $wrapper = getToolbarWrapper()
		if (!$wrapper || !isDivi5Ready()) {
			if (++attempts >= maxAttempts) {
				clearInterval(interval)
			}
			return
		}

		clearInterval(interval)

		const scoreBtnNode = {
			$wrapper   : $wrapper,
			$after     : getToolbarButtonAfter($wrapper),
			tag        : 'button',
			attributes : {
				id    : buttonId,
				class : 'aioseo-app et-vb-builder-bar-button',
				style : getToolbarButtonStyle($wrapper)
			}
		}

		const integration = new PageBuilderIntegration({
			scoreBtn : {
				component : Button,
				appName   : `Standalone/${slug}/Button`,
				node      : scoreBtnNode
			},
			limitModifiedDate : {
				component : LimitModifiedDate,
				appName   : `Standalone/${slug}/LimitModifiedDate`,
				node      : {
					tag        : 'a',
					attributes : {
						id    : `aioseo-limit-modified-date-wrapper-${slug}`,
						href  : '#',
						class : ''
					},
					mountLater (initMount) {
						const appId           = `aioseo-limit-modified-date-wrapper-${slug}`
						const diviData        = getDivi5AppWindow()?.divi?.data
						const rightClickStore = diviData?.select('divi/right-click-options')
						if (!rightClickStore) {
							return
						}

						let wasActive = false
						diviData.subscribe(() => {
							const isActive = rightClickStore.isActive()

							if (isActive && !wasActive) {
								requestAnimationFrame(() => {
									if (document.getElementById(appId)) {
										return
									}

									const optionType = rightClickStore?.getState()?.optionType
									if ('pageBarSaveMenu' !== optionType) {
										return
									}

									const wrappers = document.getElementsByClassName('et-vb-right-click-options')
									if (wrappers.length) {
										initMount(wrappers[0])
									}
								})
							}

							wasActive = isActive
						})
					}
				}
			},
			metabox : {
				component : Modal,
				appName   : `Standalone/${slug}/Modal`
			}
		})

		const remountScoreBtnIfNeeded = () => {
			const $currentWrapper = getToolbarWrapper()
			if (!$currentWrapper) {
				return
			}

			scoreBtnNode.$wrapper         = $currentWrapper
			scoreBtnNode.$after           = getToolbarButtonAfter($currentWrapper)
			scoreBtnNode.attributes.style = getToolbarButtonStyle($currentWrapper)

			if ($currentWrapper.querySelector(`#${buttonId}`)) {
				return
			}

			integration.mountScoreBtn()
		}

		integration.mount()

		const diviData = getDivi5AppWindow()?.divi?.data
		if (diviData) {
			let isRemountQueued = false
			diviData.subscribe(() => {
				if (isRemountQueued) {
					return
				}

				isRemountQueued = true
				requestAnimationFrame(() => {
					isRemountQueued = false
					remountScoreBtnIfNeeded()
				})
			})
		}

		initWatcher(window)
	}, 1000)
}

/**
 * Init the Divi integration using legacy approach (Divi 4.x).
 *
 * @returns {void}.
 */
const initLegacy = () => {
	// Init the settings bar.
	initSettingsBar()

	// Mount our Vue components in the Divi modal.
	new PageBuilderIntegration({
		metabox : {
			component     : App,
			appName       : 'Standalone/Divi',
			rootContainer : '#aioseo-app-modal > div',
			screenContext : 'sidebar'
		}
	}).mount()

	// Initialize the editor data watcher.
	initWatcher(window)

	// Initialize the Limit Modified Date integration.
	initLimitModifiedDate(window)
}

if (isDivi5) {
	if ('loading' === document.readyState) {
		document.addEventListener('DOMContentLoaded', initModern, { once: true })
	} else {
		initModern()
	}
} else {
	// Divi 4.x fires the et_builder_api_ready message when the builder is ready.
	window.addEventListener('message', (event) => {
		if (event.origin !== window.location.origin) {
			return
		}

		if ('et_builder_api_ready' === event.data.eventType) {
			initLegacy()
		}
	})
}