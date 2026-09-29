import {
	STORE_NAME,
	getFormatName,
	getFormatClassName,
	registerHighlightStore
} from './wpDataStore'

const wpRichText = window?.wp?.richText || {}
const { applyFormat, registerFormatType } = wpRichText

const registeredFormats = new Set()

// Shared reference for the "no highlights" case so the format's editable-tree
// prep returns a stable value across renders (a fresh `[]` each call makes
// Gutenberg's useSelect flag unnecessary re-renders).
const EMPTY_HIGHLIGHTS = []

/**
 * Registers a custom RichText format type for the given analyzer.
 *
 * Each analyzer gets its own format type so that overlapping highlights
 * from different analyzers don't replace each other (unlike `core/annotation`
 * which uses a single shared format type).
 *
 * Uses the same `__experimentalCreatePrepareEditableTree` hook that
 * `core/annotation` uses to apply view-only (non-persistent) formats.
 *
 * @param {string} analyzer The analyzer identifier (e.g. 'keyphraseInIntroduction').
 * @returns {void}
 */
const registerHighlightFormat = (analyzer) => {
	if ('function' !== typeof registerFormatType) {
		return
	}

	const formatName = getFormatName(analyzer)
	const className = getFormatClassName(analyzer)

	if (registeredFormats.has(formatName)) {
		return
	}

	registerFormatType(formatName, {
		title      : `AIOSEO Highlight (${analyzer})`,
		tagName    : 'mark',
		className  : className,
		attributes : {
			className : 'class',
			id        : 'id'
		},
		edit () {
			return null
		},
		__experimentalGetPropsForEditableTreePreparation (select, { richTextIdentifier, blockClientId }) {
			// The highlighter store registers during editor boot; early RichText
			// renders can run this before it exists, and `select(STORE_NAME)` would
			// then be undefined and crash the block (BlockCrashBoundary). Guard it
			// and fall back to no highlights until the store is available.
			const highlightStore = select(STORE_NAME)

			return {
				highlights : highlightStore
					? highlightStore.getHighlightsForRichText(blockClientId, richTextIdentifier, analyzer)
					: EMPTY_HIGHLIGHTS
			}
		},
		__experimentalCreatePrepareEditableTree ({ highlights }) {
			return (formats, text) => {
				if (!highlights || !highlights.length) {
					return formats
				}

				let record = { formats, text }
				for (const highlight of highlights) {
					let { start, end } = highlight

					if (record.text.length < start) {
						start = record.text.length
					}

					if (record.text.length < end) {
						end = record.text.length
					}

					record = applyFormat(
						record,
						{
							type       : formatName,
							attributes : {
								className : className,
								id        : `aioseo-highlight-${highlight.id}`
							}
						},
						start,
						end
					)
				}

				return record.formats
			}
		}
	})

	registeredFormats.add(formatName)
}

/**
 * All readability assessment analyzers that can produce highlights.
 *
 * Keep this list in sync with the readability assessments in
 * `src/app/tru-seo/scoring/assessments/`.
 */
const HIGHLIGHT_ANALYZERS = [
	'passiveVoice',
	'sentenceBeginnings',
	'spellingChecker',
	'subheadingsTooLong',
	'textAlignment',
	'textParagraphTooLong',
	'textPresence',
	'textSentenceLength',
	'textTransitionWords',
	'wordComplexity'
]

/**
 * Registers the highlighter wp-data store and every analyzer's RichText format
 * type. Idempotent. Must run before the block editor's first RichText render —
 * otherwise the format-type count changes mid-session and Gutenberg's
 * `useFormatTypes` warns that its hook dependency array changed size. Callers
 * invoke this from the eager editor entry, not the lazily-loaded sidebar chunk.
 *
 * @since 5.0.0
 * @returns {void}
 */
export const registerHighlightFormats = () => {
	registerHighlightStore()
	HIGHLIGHT_ANALYZERS.forEach(registerHighlightFormat)
}