/**
 * Spell checker helper — module-level singleton.
 *
 * Wraps hunspell-asm (WebAssembly Hunspell) for spell checking inside the
 * Web Worker. Uses WASM linear memory to store the dictionary, which avoids
 * V8's plain-object property limit that crashes pure-JS libraries (typo-js,
 * nspell) on large dictionaries like pt_BR (312K+ words).
 *
 * Imported directly by the spelling researcher and assessment — not registered
 * via `worker.registerHelper()` (which expects functions, not class instances).
 *
 * @since 5.0.0
 */

const TRIE_END_MARKER = '_end'
const MAX_TRIE_WORDS = 400000

class SpellCheckerHelper {
	constructor () {
		this._hunspell = null
		this._factory = null
		this._affPath = null
		this._dicPath = null
		this._safeWordsPath = null
		this._locale = null
		this._ready = false
		this._failed = false
		this._initPromise = null
		this._trie = null
		this._settingsUrl = ''
		this._safeWordsUrl = ''
		this._safeWordsMetaUrl = ''
		this._safeWords = new Set()
		this._safeWordsLower = new Set()
		this._strictSafeWords = new Set()
	}

	/**
	 * Lazily initializes the Hunspell WASM instance by fetching dictionary files.
	 *
	 * Dictionary folder structure: {dictionaryBaseUrl}/{code}/{locale}.aff
	 * Example: uploads/aioseo/dictionaries/en/en_US.aff
	 *
	 * Will not retry after a failed attempt unless the locale changes.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} code              The 2-letter language code (e.g. 'en').
	 * @param {string} locale            The full locale (e.g. 'en_US').
	 * @param {string} dictionaryBaseUrl The base URL for dictionary files.
	 * @param {string} safeWordsUrl      Optional URL to the per-site safe-words.dic file.
	 * @param {string} safeWordsMetaUrl  Optional URL to the match-case sidecar file.
	 * @returns {Promise<void>} Resolves when initialization is complete.
	 */
	async initialize (code, locale, dictionaryBaseUrl, safeWordsUrl = '', safeWordsMetaUrl = '') {
		if (this._ready && this._locale === locale) {
			return
		}

		if (this._failed && this._locale === locale) {
			return
		}

		if (null !== this._initPromise) {
			return this._initPromise
		}

		this._locale = locale
		this._safeWordsUrl = safeWordsUrl
		this._safeWordsMetaUrl = safeWordsMetaUrl
		this._initPromise = this._doInit(code, locale, dictionaryBaseUrl)

		return this._initPromise
	}

	/**
	 * Performs the actual dictionary loading and Hunspell WASM initialization.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} code              The 2-letter language code.
	 * @param {string} locale            The full locale.
	 * @param {string} dictionaryBaseUrl The base URL.
	 * @returns {Promise<void>} Resolves when the dictionary is loaded.
	 */
	async _doInit (code, locale, dictionaryBaseUrl) {
		try {
			// Dispose previous instance if switching locale.
			this._dispose()

			// Initialize the WASM Hunspell module directly.
			// We bypass hunspell-asm's `loadModule()` because its dependency
			// chain (nanoid v2 via emscripten-wasm-loader) has CJS/ESM interop
			// issues with Vite's bundler.
			const factory = await this._initWasmHunspell()

			// Fetch dictionary files as binary ArrayBuffers for WASM filesystem.
			const [ affBuffer, dicBuffer ] = await Promise.all([
				fetch(`${dictionaryBaseUrl}/${code}/${locale}.aff`).then(r => {
					if (!r.ok) {
						throw new Error(`Dictionary not found: ${code}/${locale}.aff`)
					}

					return r.arrayBuffer()
				}),
				fetch(`${dictionaryBaseUrl}/${code}/${locale}.dic`).then(r => {
					if (!r.ok) {
						throw new Error(`Dictionary not found: ${code}/${locale}.dic`)
					}

					return r.arrayBuffer()
				})
			])

			// Decode .dic buffer to text for the prefix trie.
			const dicText = new TextDecoder('utf-8').decode(dicBuffer)

			// Mount dictionary files into WASM virtual filesystem.
			const affPath = factory.mountBuffer(new Uint8Array(affBuffer), `${locale}.aff`)
			const dicPath = factory.mountBuffer(new Uint8Array(dicBuffer), `${locale}.dic`)

			// Create Hunspell instance from mounted files.
			this._hunspell = factory.create(affPath, dicPath)
			this._factory = factory
			this._affPath = affPath
			this._dicPath = dicPath

			// Build prefix trie from raw .dic base forms for suggestion augmentation.
			this._buildTrieFromDic(dicText)

			// Load the per-site custom dictionaries on top of the main dictionary.
			// The plain and match-case stores are independent and optional; failures
			// here never fail the whole init — we just skip the custom dictionary.
			await this._loadSafeWords()
			await this._loadStrictSafeWords()

			this._ready = true
			this._failed = false
		} catch (error) {
			console.error('[AIOSEO SpellChecker] Failed to initialize:', error)
			this._ready = false
			this._failed = true
		} finally {
			this._initPromise = null
		}
	}

	/**
	 * Initializes the Hunspell WASM module directly, bypassing hunspell-asm's
	 * `loadModule()` to avoid nanoid CJS/ESM interop issues with Vite.
	 *
	 * @since 5.0.0
	 *
	 * @returns {Promise<Object>} A factory with mountBuffer, unmount, create methods.
	 */
	async _initWasmHunspell () {
		// Import the Emscripten-compiled Hunspell runtime and the C function wrapper.
		const { wrapHunspellInterface } = await import('hunspell-asm/dist/esm/wrapHunspellInterface.js')
		const hunspellRuntime = await import('hunspell-asm/dist/esm/lib/browser/hunspell.js')

		// Build the module config with an awaitable init callback.
		const moduleConfig = {
			__asm_module_isInitialized__ : false,
			onRuntimeInitialized         : null,
			initializeRuntime            : null
		}

		moduleConfig.initializeRuntime = (timeout = 10000) => {
			if (moduleConfig.__asm_module_isInitialized__) {
				return Promise.resolve(true)
			}
			return new Promise((resolve) => {
				const timeoutId = setTimeout(() => resolve(false), timeout)
				moduleConfig.onRuntimeInitialized = () => {
					clearTimeout(timeoutId)
					moduleConfig.__asm_module_isInitialized__ = true
					resolve(true)
				}
			})
		}

		// Initialize the Emscripten module.
		const runtimeInit = hunspellRuntime.default || hunspellRuntime
		const asmModule = runtimeInit(moduleConfig)
		const initialized = await asmModule.initializeRuntime(10000)
		if (!initialized) {
			throw new Error('Hunspell WASM initialization timed out')
		}

		const { cwrap, FS, _free, allocateUTF8, _malloc, getValue, UTF8ToString } = asmModule
		const hunspellInterface = wrapHunspellInterface(cwrap)

		// Create a unique mount directory.
		const memPathId = '/' + (
			'function' === typeof crypto?.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`
		)
		FS.mkdir(memPathId)

		// Helper to pass string params to C functions and free them after.
		const usingParamPtr = (...args) => {
			const params = [ ...args ]
			const fn = params.pop()
			const paramsPtr = params.map((param) => allocateUTF8(param.normalize()))
			const ret = fn(...paramsPtr)
			paramsPtr.forEach(paramPtr => _free(paramPtr))
			return ret
		}

		return {
			mountBuffer : (contents, fileName) => {
				const mountedFilePath = `${memPathId}/${fileName}`
				FS.writeFile(mountedFilePath, contents, { encoding: 'binary' })
				return mountedFilePath
			},
			unmount : (filePath) => {
				try {
					FS.unlink(filePath)
				} catch (e) {
					// Ignore if already unmounted.
				}
			},
			cleanup : () => {
				try {
					FS.rmdir(memPathId)
				} catch (e) {
					// Ignore if already removed.
				}
			},
			create : (affPath, dictPath) => {
				const affPathPtr = allocateUTF8(affPath)
				const dictPathPtr = allocateUTF8(dictPath)
				const hunspellPtr = hunspellInterface.create(affPathPtr, dictPathPtr)

				return {
					dispose : () => {
						hunspellInterface.destroy(hunspellPtr)
						_free(affPathPtr)
						_free(dictPathPtr)
					},
					spell   : (word) => !!usingParamPtr(word, wordPtr => hunspellInterface.spell(hunspellPtr, wordPtr)),
					suggest : (word, limit = 20) => {
						const suggestionListPtr = _malloc(4)
						const suggestionCount = usingParamPtr(word, wordPtr => hunspellInterface.suggest(hunspellPtr, suggestionListPtr, wordPtr))
						const suggestionListValuePtr = getValue(suggestionListPtr, '*')
						const count = Math.min(suggestionCount, limit)
						const ret = 0 < count
							? Array.from(Array(count).keys()).map(idx => UTF8ToString(getValue(suggestionListValuePtr + idx * 4, '*')))
							: []
						hunspellInterface.free_list(hunspellPtr, suggestionListPtr, suggestionCount)
						_free(suggestionListPtr)
						return ret
					},
					addWord     : (word) => 0 === usingParamPtr(word, wordPtr => hunspellInterface.add(hunspellPtr, wordPtr)),
					removeWord  : (word) => 0 === usingParamPtr(word, wordPtr => hunspellInterface.remove(hunspellPtr, wordPtr)),
					loadDicFile : (dicPath) => 0 === usingParamPtr(dicPath, dicPathPtr => hunspellInterface.add_dic(hunspellPtr, dicPathPtr))
				}
			}
		}
	}

	/**
	 * Disposes the current Hunspell instance and unmounts dictionary files.
	 *
	 * @since 5.0.0
	 *
	 * @returns {void}
	 */
	_dispose () {
		if (this._hunspell) {
			this._hunspell.dispose()
			this._hunspell = null
		}

		if (this._factory) {
			if (this._affPath) {
				this._factory.unmount(this._affPath)
				this._affPath = null
			}
			if (this._dicPath) {
				this._factory.unmount(this._dicPath)
				this._dicPath = null
			}
			if (this._safeWordsPath) {
				this._factory.unmount(this._safeWordsPath)
				this._safeWordsPath = null
			}
			this._factory.cleanup()
			this._factory = null
		}

		this._trie = null
		this._locale = null
		this._safeWords = new Set()
		this._safeWordsLower = new Set()
		this._strictSafeWords = new Set()
		this._ready = false
	}

	/**
	 * Builds a trie from the raw .dic file string for fast prefix lookups.
	 * Parses the Hunspell .dic format directly (line 1 = word count,
	 * subsequent lines = word/flags).
	 *
	 * @since 5.0.0
	 *
	 * @param {string} dicData The raw .dic file contents.
	 * @returns {void}
	 */
	_buildTrieFromDic (dicData) {
		if (!dicData) {
			this._trie = null
			return
		}

		const lines = dicData.split('\n')
		const wordCount = parseInt(lines[0], 10) || 0

		// Safety valve: skip trie for very large dictionaries to save memory.
		if (wordCount > MAX_TRIE_WORDS) {
			this._trie = null
			return
		}

		const root = {}

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]
			if (!line) {
				continue
			}

			const slashIndex = line.indexOf('/')
			const word = (-1 === slashIndex ? line : line.substring(0, slashIndex)).trim()
			if (!word) {
				continue
			}

			let node = root
			const lower = word.toLowerCase()

			for (const char of lower) {
				if (!node[char]) {
					node[char] = {}
				}
				node = node[char]
			}

			node[TRIE_END_MARKER] = true
		}

		this._trie = root
	}

	/**
	 * Searches the trie for words matching a given prefix.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} prefix The prefix to search for.
	 * @param {number} limit  Maximum number of results to return.
	 * @returns {string[]} Matching words from the dictionary.
	 */
	_searchPrefix (prefix, limit = 20) {
		if (!this._trie) {
			return []
		}

		let node = this._trie

		for (const char of prefix) {
			if (!node[char]) {
				return []
			}
			node = node[char]
		}

		const results = []

		const dfs = (currentNode, path) => {
			if (results.length >= limit) {
				return
			}

			if (currentNode[TRIE_END_MARKER]) {
				results.push(prefix + path)
			}

			for (const char in currentNode) {
				if (TRIE_END_MARKER === char) {
					continue
				}
				dfs(currentNode[char], path + char)
			}
		}

		dfs(node, '')

		return results
	}

	/**
	 * Generates doubled-letter spelling variants of a word.
	 *
	 * Targets the misplaced-doubling typo ("dissapeared" → "disappeared"): two
	 * edits away, so out of reach of Hunspell's single-edit suggestion generators.
	 * Candidates are unvalidated — the caller keeps only what the dictionary accepts.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to vary (lowercased).
	 * @returns {string[]}  Candidate variants, never including the word itself.
	 */
	_doubledLetterVariants (word) {
		const variants  = new Set()
		const collapsed = []

		for (let i = 1; i < word.length; i++) {
			if (word[i] === word[i - 1]) {
				const variant = word.slice(0, i) + word.slice(i + 1)
				variants.add(variant)
				collapsed.push(variant)
			}
		}

		// Doubling a letter of a collapsed form is what *moves* a doubling to where
		// it belongs; doubling the input alone only covers a missing one.
		for (const base of [ word, ...collapsed ]) {
			for (let i = 0; i < base.length; i++) {
				if (base[i] !== base[i + 1] && base[i] !== base[i - 1]) {
					variants.add(base.slice(0, i + 1) + base[i] + base.slice(i + 1))
				}
			}
		}

		variants.delete(word)

		return [ ...variants ]
	}

	/**
	 * Computes the Levenshtein edit distance between two strings.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} a The first string.
	 * @param {string} b The second string.
	 * @returns {number} The number of single-character edits between them.
	 */
	_editDistance (a, b) {
		if (a === b) {
			return 0
		}

		const al = a.length
		const bl = b.length

		if (0 === al) {
			return bl
		}
		if (0 === bl) {
			return al
		}

		// Optimal string alignment (Damerau-Levenshtein): an adjacent transposition
		// costs 1 edit, so a common typo like "thier"→"their" ranks as a near miss
		// rather than two substitutions. The transposition term needs the row from
		// two iterations back, hence the third rolling buffer.
		let prevPrev = new Array(bl + 1).fill(0),
			prev     = new Array(bl + 1),
			curr     = new Array(bl + 1)

		for (let j = 0; j <= bl; j++) {
			prev[j] = j
		}

		for (let i = 1; i <= al; i++) {
			curr[0] = i

			for (let j = 1; j <= bl; j++) {
				const cost = a[i - 1] === b[j - 1] ? 0 : 1
				curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)

				if (1 < i && 1 < j && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
					curr[j] = Math.min(curr[j], prevPrev[j - 2] + 1)
				}
			}

			const tmp = prevPrev
			prevPrev  = prev
			prev      = curr
			curr      = tmp
		}

		return prev[bl]
	}

	/**
	 * Removes diacritics from a word (NFD-decompose, then strip combining marks).
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to fold.
	 * @returns {string}    The word with diacritics removed.
	 */
	_foldDiacritics (word) {
		return word.normalize('NFD').replace(/\p{M}/gu, '')
	}

	/**
	 * Scores a candidate suggestion against the user input for ranking.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} candidate The candidate word.
	 * @param {string} input     The original user input (lowercased).
	 * @returns {number} The relevance score (higher is better).
	 */
	_score (candidate, input) {
		if (candidate === input) {
			return 1000
		}

		// A dropped/added accent is the most common mistake in accented languages,
		// yet the flagged word never starts with the accented correction, so the
		// prefix bonus below would bury it under plain prefix completions
		// ("dial"/"diado" outranking "día" for "dia"). Rank an otherwise-identical
		// candidate just below an exact match.
		if (this._foldDiacritics(candidate) === this._foldDiacritics(input)) {
			return 900
		}

		// Closeness dominates ranking so a near-correction outranks a distant
		// ngram guess (e.g. "commerce" over "overcome" for "ecommerce").
		let score = -this._editDistance(candidate, input) * 100

		if (candidate.startsWith(input)) {
			score += 400
		} else if (3 <= input.length && candidate.startsWith(input.slice(0, 3))) {
			score += 40
		}

		score -= Math.abs(candidate.length - input.length) * 5

		return score
	}

	/**
	 * Loads the per-site safe-words.dic on top of the main dictionary.
	 *
	 * Missing files and network errors are non-fatal — the main spell checker
	 * still works without a custom dictionary.
	 *
	 * @since 5.0.0
	 *
	 * @returns {Promise<void>} Resolves once the file has been loaded (or skipped).
	 */
	async _loadSafeWords () {
		if (!this._safeWordsUrl || !this._factory || !this._hunspell) {
			return
		}

		try {
			const response = await fetch(this._safeWordsUrl, { cache: 'no-store' })

			if (404 === response.status) {
				// File has not been created yet — nothing to load.
				return
			}

			if (!response.ok) {
				console.warn(`[AIOSEO SpellChecker] Skipping safe-words.dic (HTTP ${response.status})`)
				return
			}

			const buffer = await response.arrayBuffer()
			const text   = new TextDecoder('utf-8').decode(buffer)

			const safeWordsPath = this._factory.mountBuffer(new Uint8Array(buffer), 'safe-words.dic')
			const loaded = this._hunspell.loadDicFile(safeWordsPath)

			if (!loaded) {
				this._factory.unmount(safeWordsPath)
				console.warn('[AIOSEO SpellChecker] Hunspell rejected safe-words.dic')
				return
			}

			this._safeWordsPath = safeWordsPath

			// Populate the in-memory Set so the UI knows which words are custom.
			// Identity is exact-case ("AIOSEO" and "aioseo" are distinct entries);
			// Hunspell still matches non-strict words case-insensitively separately.
			const lines = text.split('\n')
			for (let i = 1; i < lines.length; i++) {
				const word = lines[i].trim()
				if (word) {
					this._safeWords.add(word)
				}
			}

			this._rebuildSafeWordsLower()
		} catch (error) {
			console.warn('[AIOSEO SpellChecker] Failed to load safe-words.dic:', error)
		}
	}

	/**
	 * Loads the match-case sidecar into the exact-cased strict set.
	 *
	 * Strict safe words are deliberately kept out of Hunspell (which accepts
	 * words case-insensitively). They are accepted only when the exact casing
	 * matches, enforced in {@see getSpellingErrors} via [[hasSafeWordStrict]].
	 * A missing or malformed file is non-fatal.
	 *
	 * @since 5.0.0
	 *
	 * @returns {Promise<void>} Resolves once the sidecar has been loaded (or skipped).
	 */
	async _loadStrictSafeWords () {
		if (!this._safeWordsMetaUrl) {
			return
		}

		try {
			const response = await fetch(this._safeWordsMetaUrl, { cache: 'no-store' })

			if (!response.ok) {
				return
			}

			const data = await response.json()

			if (data && 'object' === typeof data) {
				for (const [ word, enabled ] of Object.entries(data)) {
					if (word && enabled) {
						this._strictSafeWords.add(word)
					}
				}
			}
		} catch (error) {
			console.warn('[AIOSEO SpellChecker] Failed to load safe-words-meta.json:', error)
		}
	}

	/**
	 * Adds a word to the live Hunspell instance after it has been persisted server-side.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to add.
	 * @returns {boolean}   True if Hunspell accepted the word.
	 */
	addSafeWord (word) {
		if (!this._ready || !word) {
			return false
		}

		const added = this._hunspell.addWord(word)

		if (added) {
			this._safeWords.add(word)
			this._safeWordsLower.add(word.toLowerCase())
		}

		return added
	}

	/**
	 * Removes a word from the live Hunspell instance after it has been removed server-side.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to remove.
	 * @returns {boolean}   True if Hunspell accepted the removal.
	 */
	removeSafeWord (word) {
		if (!this._ready || !word) {
			return false
		}

		const removed = this._hunspell.removeWord(word)

		if (removed) {
			this._safeWords.delete(word)
			// Rebuild rather than delete the lowercase key: another casing variant
			// (e.g. "CUPLE" when removing "Cuple") may still map to it.
			this._rebuildSafeWordsLower()
		}

		return removed
	}

	/**
	 * Rebuilds the lowercase safe-word index from the exact-case set.
	 *
	 * @since 5.0.0
	 *
	 * @returns {void}
	 */
	_rebuildSafeWordsLower () {
		this._safeWordsLower = new Set()

		for (const word of this._safeWords) {
			this._safeWordsLower.add(word.toLowerCase())
		}
	}

	/**
	 * Whether a word is in the in-memory safe-words set.
	 *
	 * Exact-case: "AIOSEO" and "aioseo" are distinct entries.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {boolean}   True if the word is a known safe-word.
	 */
	hasSafeWord (word) {
		if (!word) {
			return false
		}

		return this._safeWords.has(word)
	}

	/**
	 * Whether a word matches a non-strict ("match case off") safe word in any casing.
	 *
	 * Non-strict safe words are meant to be accepted case-insensitively, but
	 * Hunspell only accepts case variants of a lowercase entry — a capitalized or
	 * all-caps custom word won't accept its lowercase form. This closes that gap.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {boolean}   True if the word is a non-strict safe-word in any casing.
	 */
	hasSafeWordLoose (word) {
		if (!word) {
			return false
		}

		return this._safeWordsLower.has(word.toLowerCase())
	}

	/**
	 * Adds a match-case (strict) safe word to the in-memory set.
	 *
	 * Strict words are not added to Hunspell — acceptance is exact-case only,
	 * checked via [[hasSafeWordStrict]]. The word must have been persisted to
	 * the sidecar server-side first.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The exact-cased word to add.
	 * @returns {boolean}   True once recorded.
	 */
	addStrictSafeWord (word) {
		if (!this._ready || !word) {
			return false
		}

		this._strictSafeWords.add(word)

		return true
	}

	/**
	 * Removes a match-case (strict) safe word from the in-memory set.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The exact-cased word to remove.
	 * @returns {boolean}   True once removed.
	 */
	removeStrictSafeWord (word) {
		if (!this._ready || !word) {
			return false
		}

		this._strictSafeWords.delete(word)

		return true
	}

	/**
	 * Whether a word is an exact-case match against a strict safe word.
	 *
	 * Case-sensitive: "iPhone" matches only "iPhone", not "iphone" or "IPHONE".
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check (exact casing).
	 * @returns {boolean}   True if the word is a strict safe-word in this exact form.
	 */
	hasSafeWordStrict (word) {
		if (!word) {
			return false
		}

		return this._strictSafeWords.has(word)
	}

	/**
	 * Returns the URL to the per-site safe-words.dic file.
	 *
	 * @since 5.0.0
	 *
	 * @returns {string} The configured URL, or an empty string if none.
	 */
	getSafeWordsUrl () {
		return this._safeWordsUrl
	}

	/**
	 * Whether the dictionary has been loaded and is ready for use.
	 *
	 * @since 5.0.0
	 *
	 * @returns {boolean} True if ready.
	 */
	isReady () {
		return this._ready
	}

	/**
	 * Returns whether the last initialization attempt failed (e.g. dictionary file not found).
	 *
	 * @since 5.0.0
	 *
	 * @returns {boolean} True if initialization failed.
	 */
	isFailed () {
		return this._failed
	}

	/**
	 * Stores the settings page URL so assessments can link to it.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} url The URL to the settings page.
	 * @returns {void}
	 */
	setSettingsUrl (url) {
		this._settingsUrl = url
	}

	/**
	 * Returns the settings page URL stored via setSettingsUrl.
	 *
	 * @since 5.0.0
	 *
	 * @returns {string} The settings page URL.
	 */
	getSettingsUrl () {
		return this._settingsUrl
	}

	/**
	 * Checks if a word is spelled correctly.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {boolean}   True if correct (or if not ready).
	 */
	check (word) {
		if (!this._ready) {
			return true
		}

		return this._hunspell.spell(word)
	}

	/**
	 * Picks the better-cased version of two candidate words based on user input casing.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} a     The first candidate.
	 * @param {string} b     The second candidate.
	 * @param {string} input The original user input.
	 * @returns {string} The candidate with the preferred casing.
	 */
	_pickBetterCasing (a, b, input) {
		if (this._isCapitalized(input)) {
			if (this._isCapitalized(b)) {
				return b
			}
			if (this._isCapitalized(a)) {
				return a
			}
		}

		if (this._isLowercase(b)) {
			return b
		}
		if (this._isLowercase(a)) {
			return a
		}

		return a
	}

	/**
	 * Checks whether a word starts with an uppercase letter.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {boolean} True if the first character is uppercase.
	 */
	_isCapitalized (word) {
		return word[0]?.toUpperCase() === word[0]
	}

	/**
	 * Checks whether a word is entirely lowercase.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word The word to check.
	 * @returns {boolean} True if the word is all lowercase.
	 */
	_isLowercase (word) {
		return word.toLowerCase() === word
	}

	/**
	 * Returns spelling suggestions for a word.
	 *
	 * Combines prefix-based trie matches with Hunspell edit-distance suggestions,
	 * deduplicates case-insensitively, and ranks by relevance.
	 *
	 * @since 5.0.0
	 *
	 * @param {string} word  The misspelled word.
	 * @param {number} limit Maximum number of suggestions to return.
	 * @returns {string[]}   Up to `limit` suggestions.
	 */
	suggest (word, limit = 5) {
		if (!this._ready || !word) {
			return []
		}

		const input = word
		const lower = word.toLowerCase()

		const hunspellSuggestions = this._hunspell.suggest(lower)
		const prefixSuggestions   = this._searchPrefix(lower, 20)
		const doubledSuggestions  = this._doubledLetterVariants(lower).filter(variant => this._hunspell.spell(variant))

		// Hunspell's own ordering already weighs transpositions, phonetics and
		// common typos, so keep it as a bounded tiebreaker: its top pick (e.g.
		// "their" for "thier") must not be buried under an equally close candidate
		// that merely shares a prefix ("thief"). The bonus stays under the 100-per-
		// edit weight so it can never override even a single-edit gap — when
		// Hunspell has no near candidate it falls back to ngram similarity and
		// ranks a distant guess first ("dissipated" for "dissapeared").
		const hunspellRank = new Map()
		hunspellSuggestions.forEach((suggestion, index) => {
			const key = suggestion.toLowerCase()
			if (!hunspellRank.has(key)) {
				hunspellRank.set(key, index)
			}
		})

		const scoreWithRank = (candidate) => {
			const rank  = hunspellRank.get(candidate.toLowerCase())
			const bonus = undefined === rank ? 0 : Math.max(0, 90 - rank * 25)

			return this._score(candidate.toLowerCase(), lower) + bonus
		}

		const merged = [ ...prefixSuggestions, ...doubledSuggestions, ...hunspellSuggestions ]

		const map = new Map()

		for (const w of merged) {
			const key = w.toLowerCase()

			if (!map.has(key)) {
				map.set(key, w)
			} else {
				const existing = map.get(key)
				map.set(key, this._pickBetterCasing(existing, w, input))
			}
		}

		const deduped = Array.from(map.values())

		const ranked = deduped.sort((a, b) => {
			return scoreWithRank(b) - scoreWithRank(a)
		})

		// Drop distant guesses that aren't plausible corrections. Prefix
		// completions are always kept; everything else must be a near match, so
		// junk like "overcome"/"mercer" for "ecommerce" never surfaces.
		const maxDistance = Math.max(2, Math.ceil(lower.length * 0.4))
		const filtered = ranked.filter(candidate => {
			const lowerCandidate = candidate.toLowerCase()

			// Never echo the flagged word back as its own correction. The trie is
			// built case-insensitively, so a capital-only entry (e.g. "Grey")
			// completes to the lowercase input "grey" and would otherwise rank first.
			if (lowerCandidate === lower) {
				return false
			}

			return lowerCandidate.startsWith(lower) || this._editDistance(lowerCandidate, lower) <= maxDistance
		})

		return filtered.slice(0, limit)
	}
}

export default new SpellCheckerHelper()