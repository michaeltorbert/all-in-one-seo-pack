import { defineStore } from 'pinia'

import http from '@/vue/utils/http'
import links from '@/vue/utils/links'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

const FAKE_PROGRESS_TARGET = 90
const FAKE_PROGRESS_DURATION_MS = 12000
const FAKE_PROGRESS_TICK_MS = 250

// When the server reports another process already downloading the same locale,
// poll on this cadence for a bounded number of attempts until it lands (a hard
// count rather than a wall-clock budget so a clock jump can't extend it). A few
// retries cover the common case; if the winning download is slower the bar
// shows the in-progress message and self-heals once its files land.
const IN_PROGRESS_RETRY_MS = 2000
const IN_PROGRESS_MAX_RETRIES = 3

/**
 * Tracks the automatic background download of the Hunspell dictionary for the
 * current user's language. Both the post-edit and admin posts-list contexts
 * consume this store so analysis can wait for the request to settle before
 * running (success or failure).
 *
 * @since 5.0.0
 */
export const useSpellCheckerDictionaryStore = defineStore('SpellCheckerDictionaryStore', {
	state : () => ({
		// The site's default analysis language (hydrated once). These identify the
		// "Default" option and must NOT be overwritten by a download — that's what
		// activeLocale/activeLabel below are for.
		userLocale         : '',
		languageLabel      : '',
		// The locale a download is currently running for (drives the loading bar
		// title and post-download bookkeeping). Distinct from the default above.
		activeLocale       : '',
		activeLabel        : '',
		supported          : false,
		hasSpellChecker    : false,
		needsDownload      : false,
		supportedLanguages : [],
		installedLocales   : [],
		started            : false,
		downloading        : false,
		completed          : false,
		failed             : false,
		errorMessage       : '',
		percent            : 0,
		_promise           : null,
		_progressId        : null,
		// Bumped on every _run() so in-flight request chains from a superseded
		// run (e.g. an A→B→A locale switch) cancel themselves instead of racing.
		_generation        : 0
	}),
	actions : {
		hydrate () {
			const data              = window.aioseo?.spellChecker || {}
			this.userLocale         = data.userLocale || ''
			this.languageLabel      = data.userLanguageLabel || ''
			this.supported          = !!data.userLocaleSupported
			this.hasSpellChecker    = !!data.userLocaleHasSpellCheck
			this.needsDownload      = !!data.userLocaleNeedsDownload
			this.supportedLanguages = Array.isArray(data.supportedLanguages) ? [ ...data.supportedLanguages ] : []
			this.installedLocales   = Array.isArray(data.installedLocales) ? [ ...data.installedLocales ] : []
			this.completed          = !this.needsDownload
		},

		isLocaleSpellCheckable (locale) {
			if (!locale) {
				return false
			}

			return this.supportedLanguages.some(l => {
				if (!l.hasSpellChecker) {
					return false
				}

				if (l.locale === locale) {
					return true
				}

				return Array.isArray(l.variants) && l.variants.some(v => v.locale === locale)
			})
		},

		isLocaleInstalled (locale) {
			return !!locale && this.installedLocales.includes(locale)
		},

		shouldDownload () {
			return !!(
				window.aioseo?.spellChecker?.enabled &&
				this.hasSpellChecker &&
				this.needsDownload &&
				!this.isLocaleInstalled(this.userLocale)
			)
		},

		ensureDownloaded () {
			if (this._promise) {
				return this._promise
			}

			if (this.completed || !this.shouldDownload()) {
				this.completed = true
				this._promise = Promise.resolve()
				return this._promise
			}

			return this._run(this.userLocale, this.languageLabel)
		},

		/**
		 * Starts a fresh download for an explicit locale (locale-dropdown change).
		 * Short-circuits with a resolved promise (no bar) when the locale is
		 * already installed; otherwise replaces in-flight state and starts the
		 * request. Stale responses are dropped when the user switches again
		 * mid-flight.
		 *
		 * @since 5.0.0
		 *
		 * @param  {string} locale The target locale (e.g. 'fr_FR').
		 * @param  {string} label  Optional language label for the loading bar.
		 * @returns {Promise<void>} Resolves when the request settles (success or failure).
		 */
		downloadForLocale (locale, label = '') {
			if (!locale || !window.aioseo?.spellChecker?.enabled) {
				return Promise.resolve()
			}

			// A fresh language switch supersedes any prior failure, so clear the
			// stale failure bar even on the early-return paths below (e.g. switching
			// to an already-installed or analysis-only language).
			this.dismissFailure()

			// Analysis-only languages (e.g. Japanese, Arabic, Indonesian) still
			// appear in the dropdown but have no Hunspell dictionary to fetch.
			// Skip the download silently — the spelling assessment already
			// gates itself on `getLanguagesWithSpellChecker`.
			if (this.supportedLanguages.length && !this.isLocaleSpellCheckable(locale)) {
				return Promise.resolve()
			}

			if (this.isLocaleInstalled(locale)) {
				return Promise.resolve()
			}

			return this._run(locale, label)
		},

		dismissFailure () {
			this.failed       = false
			this.errorMessage = ''
		},

		waitForDownload () {
			if (this._promise) {
				return this._promise
			}

			if (!this.shouldDownload()) {
				return Promise.resolve()
			}

			return this.ensureDownloaded()
		},

		_run (locale, label) {
			this._stopFakeProgress()

			this.activeLocale  = locale
			this.activeLabel   = label || ''
			this.started       = true
			this.downloading   = true
			this.completed     = false
			this.failed        = false
			this.errorMessage  = ''
			this.percent       = 5

			this._startFakeProgress()

			const generation = ++this._generation
			const promise     = this._attemptDownload(locale, generation, 0)

			this._promise = promise

			return promise
		},

		/**
		 * Issues a single download request and settles the store, retrying
		 * transparently while the server reports another process already
		 * downloading the same locale. The server lock collapses concurrent
		 * callers to one downloader; the loser polls until the winner's files
		 * land (then the request returns success) rather than surfacing the
		 * benign race as a failure.
		 *
		 * Every branch first checks `generation` against the live `_generation`
		 * so a chain from a superseded run never settles the store or schedules
		 * another retry. `attempt` is a hard counter, so the poll loop is bounded
		 * regardless of the wall clock.
		 *
		 * @since 5.0.0
		 *
		 * @param  {string} locale     The target locale.
		 * @param  {number} generation The run generation this chain belongs to.
		 * @param  {number} attempt    Zero-based retry count for the in-progress poll.
		 * @returns {Promise<void>} Resolves once the download settles or retries run out.
		 */
		_attemptDownload (locale, generation, attempt) {
			return http
				.post(links.restUrl('spell-checker/download-dictionary'))
				.send({ locale })
				.then(response => {
					// Drop the result if a newer run has superseded this chain.
					if (this._generation !== generation) {
						return
					}

					if (response?.body && false === response.body.success) {
						this._settleFailure(response.body.message || '')
						return
					}

					this._settleSuccess()
				})
				.catch(error => {
					if (this._generation !== generation) {
						return
					}

					const body = error?.response?.body

					if ('download_in_progress' === body?.code) {
						if (attempt < IN_PROGRESS_MAX_RETRIES) {
							return new Promise(resolve => window.setTimeout(resolve, IN_PROGRESS_RETRY_MS))
								.then(() => {
									if (this._generation !== generation) {
										return
									}

									return this._attemptDownload(locale, generation, attempt + 1)
								})
						}

						// Still locked after exhausting retries — another post is downloading
						// the same dictionary. State the fact without promising auto-retry:
						// the failure is terminal for the session (recovers on reload).
						this._settleFailure(__('Another post is currently downloading this dictionary. Spell-check for this language won\'t be available until it finishes.', td))
						return
					}

					const message = body?.message || error?.message || ''
					this._settleFailure(message)
				})
		},

		_startFakeProgress () {
			this._stopFakeProgress()

			const startedAt = Date.now()

			this._progressId = window.setInterval(() => {
				const elapsed = Date.now() - startedAt
				const ratio   = Math.min(1, elapsed / FAKE_PROGRESS_DURATION_MS)
				// Ease-out curve so the bar slows near the cap while the request finishes.
				const eased = 1 - Math.pow(1 - ratio, 2)
				const next  = Math.round(5 + (FAKE_PROGRESS_TARGET - 5) * eased)

				if (next > this.percent) {
					this.percent = next
				}

				if (1 <= ratio) {
					this._stopFakeProgress()
				}
			}, FAKE_PROGRESS_TICK_MS)
		},

		_stopFakeProgress () {
			if (this._progressId) {
				window.clearInterval(this._progressId)
				this._progressId = null
			}
		},

		_settleSuccess () {
			this._stopFakeProgress()
			this.percent       = 100
			this.completed     = true
			this.needsDownload = false
			this.failed        = false
			// Drop the in-flight promise so future `ensureDownloaded` calls
			// re-evaluate against `completed` rather than returning a stale
			// resolved promise.
			this._promise      = null

			if (this.activeLocale && !this.installedLocales.includes(this.activeLocale)) {
				this.installedLocales.push(this.activeLocale)
			}

			// Hold the full bar briefly so users see it complete.
			window.setTimeout(() => {
				this.downloading = false
			}, 600)
		},

		_settleFailure (message) {
			this._stopFakeProgress()
			this.percent      = 100
			this.completed    = true
			this.failed       = true
			this.errorMessage = message
			this._promise     = null
			window.setTimeout(() => {
				this.downloading = false
			}, 1500)
		}
	}
})