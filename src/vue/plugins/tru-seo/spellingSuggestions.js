/**
 * Spelling-suggestions bridge — leaf module, no worker imports.
 *
 * This file deliberately avoids importing `@/app/tru-seo/index.js?worker` (or
 * anything that does) so that addon bundles reaching it via
 * TruSeoHighlighterStore do not pull the TruSEO worker into their build.
 * Addon vite configs default to worker.format='iife', which cannot emit the
 * worker's code-split chunks. The historical fix for the same problem is
 * commit 67576720d5 ("fix(build): stop addon bundles from pulling in the
 * TruSEO worker"); this module extends the same approach to spelling
 * suggestions added later by the spell-checker feature.
 *
 * TruSeoWrapper registers the shared worker here via setSharedWorker after
 * it initializes; addons never call setSharedWorker, so the worker reference
 * stays null and requestSpellingSuggestions returns an empty array.
 *
 * @since 5.0.0
 */

let sharedWorker = null,
	analysisRefresher = null,
	analysisRunner = null,
	postUpdater = null

export function setSharedWorker (worker) {
	sharedWorker = worker
}

export function clearSharedWorker () {
	sharedWorker = null
}

export function getSharedWorker () {
	return sharedWorker
}

/**
 * Registers a function that re-runs the canonical analysis and applies the
 * results to the post-editor store. Called by `TruSeoWrapper` after the worker
 * is initialized; addons never call this so the refresher stays null and
 * `requestAnalysisRefresh` no-ops, matching the [[setSharedWorker]] pattern.
 *
 * @since 5.0.0
 *
 * @param {Function} fn The refresher function (async, returns void).
 * @returns {void}
 */
export function setAnalysisRefresher (fn) {
	analysisRefresher = fn
}

export function clearAnalysisRefresher () {
	analysisRefresher = null
}

/**
 * Registers a function that runs the canonical analysis immediately (no typing
 * debounce), applies the results to the post-editor store, and returns them.
 * Registered by `TruSeoWrapper`; addons never call this so the runner stays
 * null and `requestAnalysisRun` resolves to null, matching the
 * [[setAnalysisRefresher]] pattern.
 *
 * @since 5.0.0
 *
 * @param {Function} fn The runner function (async, returns the results object).
 * @returns {void}
 */
export function setAnalysisRunner (fn) {
	analysisRunner = fn
}

export function clearAnalysisRunner () {
	analysisRunner = null
}

/**
 * Registers the canonical "content changed → re-sync post fields → re-analyze"
 * handler ({@see maybeUpdatePost}). Registered by `components/helpers` on load;
 * addons never load that module so the updater stays null and
 * `requestPostUpdate` no-ops, keeping the worker out of addon bundles (the same
 * reason this bridge exists — see the file header).
 *
 * @since 5.0.0
 *
 * @param {Function} fn The post-update function.
 * @returns {void}
 */
export function setPostUpdater (fn) {
	postUpdater = fn
}

/**
 * Triggers the canonical post-update + re-analysis flow. Used by editor DOM
 * mutations (e.g. applying a spelling suggestion in the Classic editor) that
 * don't fire the events which normally drive re-analysis. No-ops when no
 * updater is registered (addon bundles).
 *
 * @since 5.0.0
 *
 * @param {number}  time                  Debounce delay in ms.
 * @param {boolean} run                   Whether to run the analysis.
 * @param {boolean} notifyContentChanging Whether to emit the content-changing event.
 * @returns {Promise<void>|void} The updater's promise, or void when unregistered.
 */
export function requestPostUpdate (time, run, notifyContentChanging) {
	if ('function' !== typeof postUpdater) {
		return
	}

	return postUpdater(time, run, notifyContentChanging)
}

/**
 * Runs the canonical TruSEO analysis immediately, bypassing the typing
 * debounce, and returns its transformed results (also applied to the store).
 *
 * Callers that need to read a post-change assessment right after mutating the
 * body must use this instead of reading the store: the debounced
 * content-change analysis shares one timer with the refresher and can supersede
 * it (resolving null without applying), leaving the store on stale results.
 *
 * No-ops (returns null) when no runner has been registered (addon bundles).
 *
 * @since 5.0.0
 *
 * @returns {Promise<Object|null>} The transformed analysis results, or null.
 */
export async function requestAnalysisRun () {
	if ('function' !== typeof analysisRunner) {
		return null
	}

	try {
		return await analysisRunner()
	} catch (error) {
		console.error('TruSEO analysis run failed:', error)

		return null
	}
}

/**
 * Requests spelling suggestions for a word from the shared worker.
 * Called by the UI layer (store/popover) when the user hovers a misspelled word.
 *
 * @since 5.0.0
 *
 * @param {string} word The misspelled word.
 * @returns {Promise<string[]>} The spelling suggestions.
 */
export async function requestSpellingSuggestions (word) {
	if (!sharedWorker || 'function' !== typeof sharedWorker.requestSuggestions) {
		return []
	}

	try {
		const { result } = await sharedWorker.requestSuggestions(word)

		return result?.suggestions || []
	} catch {
		return []
	}
}

/**
 * Asks the shared worker whether a single word is spelled correctly. Used to
 * guard the AI spelling pass against applying a "correction" that is itself not
 * a real dictionary word.
 *
 * Returns true (valid) when no worker is registered (addon bundles) or the
 * request fails, so the guard fails open and never blocks the flow — matching
 * the [[requestSpellingSuggestions]] fail-safe. Reads `valid` from either worker
 * shape (AnalysisWorkerWrapper resolves the raw payload; MainThreadAnalysisRunner
 * wraps it in `result`).
 *
 * @since 5.0.0
 *
 * @param {string} word The word to validate.
 * @returns {Promise<boolean>} True if the word is a valid dictionary word (or unknown).
 */
export async function requestSpellingCheck (word) {
	if (!sharedWorker || 'function' !== typeof sharedWorker.requestSpellingCheck) {
		return true
	}

	try {
		const response = await sharedWorker.requestSpellingCheck(word)
		const valid    = response?.result?.valid ?? response?.valid

		return false !== valid
	} catch {
		return true
	}
}

/**
 * Re-runs the canonical TruSEO analysis and applies the result to the
 * post-editor store. Used after a dictionary change to repaint highlights
 * without depending on the user typing.
 *
 * No-ops when no refresher has been registered (addon bundles).
 *
 * @since 5.0.0
 *
 * @returns {Promise<void>} Resolves when the refresh has finished (or was skipped).
 */
export async function requestAnalysisRefresh () {
	if ('function' !== typeof analysisRefresher) {
		return
	}

	try {
		await analysisRefresher()
	} catch (error) {
		console.error('TruSEO analysis refresh failed:', error)
	}
}

/**
 * Tells the shared worker's spell checker to add a word to the live Hunspell instance.
 *
 * The word must have been persisted server-side first via the REST endpoint;
 * this only updates the in-memory dictionary so the highlight disappears
 * without a page reload. Returns false silently when no worker is registered
 * (e.g. addon bundles), which is the same fail-safe used for suggestions.
 *
 * @since 5.0.0
 *
 * @param {string}  word      The word to add.
 * @param {boolean} matchCase Whether the word must match its exact casing.
 * @returns {Promise<boolean>} True if the live instance accepted the word.
 */
export async function requestAddSafeWord (word, matchCase = false) {
	if (!sharedWorker || 'function' !== typeof sharedWorker.requestAddSafeWord) {
		return false
	}

	try {
		const { result } = await sharedWorker.requestAddSafeWord(word, matchCase)

		return !!result?.success
	} catch {
		return false
	}
}

/**
 * Tells the shared worker's spell checker to remove a word from the live Hunspell instance.
 *
 * Mirrors [[requestAddSafeWord]] — the REST endpoint persists the change first,
 * then this updates the in-memory dictionary so the word is flagged again on
 * the next analysis. No-op when no worker is registered.
 *
 * @since 5.0.0
 *
 * @param {string} word The word to remove.
 * @returns {Promise<boolean>} True if the live instance accepted the removal.
 */
export async function requestRemoveSafeWord (word) {
	if (!sharedWorker || 'function' !== typeof sharedWorker.requestRemoveSafeWord) {
		return false
	}

	try {
		const { result } = await sharedWorker.requestRemoveSafeWord(word)

		return !!result?.success
	} catch {
		return false
	}
}

/**
 * Toggles the match-case state of a safe word in the live spell checker.
 *
 * Mirrors [[requestAddSafeWord]] — the REST endpoint persists the change first,
 * then this moves the word between the case-insensitive and exact-case stores
 * so highlights repaint without a reload. No-op when no worker is registered.
 *
 * @since 5.0.0
 *
 * @param {string}  word      The word to update.
 * @param {boolean} matchCase The desired match-case state.
 * @returns {Promise<boolean>} True if the live instance accepted the change.
 */
export async function requestSetSafeWordMatchCase (word, matchCase) {
	if (!sharedWorker || 'function' !== typeof sharedWorker.requestSetSafeWordMatchCase) {
		return false
	}

	try {
		const { result } = await sharedWorker.requestSetSafeWordMatchCase(word, matchCase)

		return !!result?.success
	} catch {
		return false
	}
}