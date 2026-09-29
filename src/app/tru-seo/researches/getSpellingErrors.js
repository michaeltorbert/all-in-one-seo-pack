import spellChecker from '@/app/tru-seo/helpers/spellChecker'
import removeHtmlBlocks from '@/app/tru-seo/languageProcessing/helpers/html/htmlParser'
import { filterShortcodesFromHTML } from '@/app/tru-seo/languageProcessing/helpers'
import { stripFullTags } from '@/app/tru-seo/languageProcessing/helpers/sanitize/stripHTMLTags'
import { normalizeSingle } from '@/app/tru-seo/languageProcessing/helpers/sanitize/quotes'

/**
 * Regex to match word-like tokens while tracking positions.
 * Matches sequences of word characters including hyphens and apostrophes
 * (straight and curly), so contractions like "don't" and possessives like
 * "John's" stay as a single token regardless of smart-quote autocorrect.
 *
 * @type {RegExp}
 */
const wordRegex = /[^\s.,;:!?"()[\]{}<>/\\…—–\u201C\u201D\u00AB\u00BB]+/g

/**
 * Matches a single emoji, pictographic symbol, or emoji-sequence joiner
 * (variation selectors, skin-tone modifiers, regional indicators, ZWJ, tags).
 *
 * @type {RegExp}
 */
const emojiRegex = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{FE00}-\u{FE0F}]|[\u{E0020}-\u{E007F}]|\u200D/gu

/**
 * Matches URL-like and email-like spans, ordered so the leftmost branch wins.
 *
 * The tokenizer splits on ':', '/', and '.', so a URL never reaches
 * shouldSkipWord's URL guard as a whole token \u2014 its fragments ('https', 'ufl',
 * 'edu') would each be flagged. Neutralizing the whole span before tokenizing
 * is the only place that guard can work.
 *
 * Branches: email (matched first so its domain isn't split off by a later
 * branch), protocol/protocol-relative URL, www-prefixed host, then bare domain
 * ending in a common TLD. The bare-domain lookahead stops a TLD-looking prefix
 * from eating an ordinary word (e.g. "end.Start" stays checkable).
 *
 * @type {RegExp}
 */
const urlLikeRegex = new RegExp([
	'[^\\s<>"\'@]+@[^\\s<>"\'@]+\\.[a-z]{2,}',
	'(?:https?:)?\\/\\/[^\\s<>"\']+',
	'www\\.[^\\s<>"\']+',
	'[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|org|net|edu|gov|mil|int|io|co|dev|app|info|biz|xyz|online|site|tech|store|blog|[a-z]{2})(?![a-z])(?:\\/[^\\s<>"\']*)?'
].join('|'), 'gi')

/**
 * Replaces every emoji code point with an equal-length run of spaces.
 *
 * Spaces (not removal) so character offsets stay identical to the source text —
 * downstream highlight/replace positions must keep matching. Emoji then act as
 * word boundaries, so an emoji glued to a word is checked without it and a lone
 * emoji vanishes.
 *
 * @param {string} text The text to process.
 * @returns {string}    The text with emoji replaced by spaces.
 */
function neutralizeEmoji (text) {
	return text.replace(emojiRegex, match => ' '.repeat(match.length))
}

/**
 * Replaces every URL, email address, and bare domain with an equal-length run
 * of spaces so their components act as word boundaries and vanish from the
 * spell check. Equal-length (not removal) keeps character offsets identical to
 * the source text, matching neutralizeEmoji, so highlight/replace positions
 * stay correct.
 *
 * @param {string} text The text to process.
 * @returns {string}    The text with URLs and emails replaced by spaces.
 */
function neutralizeUrls (text) {
	return text.replace(urlLikeRegex, match => ' '.repeat(match.length))
}

/**
 * Checks if a word should be skipped during spell checking.
 *
 * @param {string}  word The word to check.
 * @returns {boolean}    True if the word should be skipped.
 */
function shouldSkipWord (word) {
	// Single characters.
	if (2 > word.length) {
		return true
	}

	// Numbers and numeric strings.
	if (/^\d+([.,]\d+)*$/.test(word)) {
		return true
	}

	// camelCase / intercaps brand & technical terms (eCommerce, iPhone, WordPress, macOS).
	if (/\p{Ll}\p{Lu}/u.test(word)) {
		return true
	}

	// URLs.
	if (/^https?:\/\//i.test(word)) {
		return true
	}

	// Email addresses.
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(word)) {
		return true
	}

	// Hashtags and mentions.
	if (/^[#@]/.test(word)) {
		return true
	}

	// Words with numbers mixed in (e.g. "h2", "3rd").
	if (/\d/.test(word)) {
		return true
	}

	return false
}

/**
 * Tokenizes text into words with their positions.
 *
 * @param {string} text The text to tokenize.
 * @returns {Array<{word: string, start: number, end: number}>} Array of word tokens with positions.
 */
function tokenizeWithPositions (text) {
	const words = []
	let match

	wordRegex.lastIndex = 0
	while (null !== (match = wordRegex.exec(text))) {
		const word = match[0]

		// Strip leading/trailing punctuation that may have been captured (e.g. quotes around words).
		const stripped = word.replace(/^[''""'"`]+|[''""'"`.,;:!?]+$/g, '')
		if (stripped.length) {
			const offset = word.indexOf(stripped)
			words.push({
				word  : stripped,
				start : match.index + offset,
				end   : match.index + offset + stripped.length
			})
		}
	}

	return words
}

/**
 * Researches spelling errors in the paper's text.
 *
 * @since 5.0.0
 *
 * @param {Paper}      paper       The paper to analyze.
 * @param {Researcher} _researcher Unused — spell checker is a module singleton.
 * @returns {Object}               The spelling research result.
 */
export default function getSpellingErrors (paper, _researcher) { // eslint-disable-line no-unused-vars
	if (!spellChecker.isReady()) {
		return {
			errors          : [],
			totalWords      : 0,
			misspelledCount : 0,
			notInstalled    : spellChecker.isFailed(),
			settingsUrl     : spellChecker.getSettingsUrl()
		}
	}

	let text = paper.getText()
	text = removeHtmlBlocks(text)
	text = filterShortcodesFromHTML(text, paper._attributes && paper._attributes.shortcodes)
	text = stripFullTags(text)
	text = neutralizeUrls(text)
	text = neutralizeEmoji(text)

	if (!text) {
		return {
			errors          : [],
			totalWords      : 0,
			misspelledCount : 0
		}
	}

	const words = tokenizeWithPositions(text)
	const errors = []

	for (const { word, start, end } of words) {
		if (shouldSkipWord(word)) {
			continue
		}

		// Hunspell dictionaries store contractions with the straight apostrophe,
		// so normalize curly singles before lookup while preserving the original
		// word for downstream highlight/replace matching against the source text.
		const normalized = normalizeSingle(word)

		// Match-case ("strict") safe words are accepted only in their exact
		// casing and are intentionally absent from Hunspell, so check them here
		// before the case-insensitive Hunspell lookup. Normalize apostrophes the
		// same way as the Hunspell path so strict words with apostrophes match.
		if (spellChecker.hasSafeWordStrict(normalized)) {
			continue
		}

		if (spellChecker.check(normalized)) {
			continue
		}

		// Non-strict ("match case off") safe words are meant to be accepted in any
		// casing, but Hunspell only accepts case variants of a lowercase entry — a
		// capitalized or all-caps custom word ("Cuple"/"CUPLE") won't accept the
		// lowercase form. Match those case-insensitively before flagging.
		if (spellChecker.hasSafeWordLoose(normalized)) {
			continue
		}

		errors.push({ word, start, end })
	}

	return {
		errors,
		totalWords      : words.length,
		misspelledCount : errors.length
	}
}