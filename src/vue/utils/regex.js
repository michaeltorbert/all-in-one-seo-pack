export const escapeRegex = (string) => {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Letters (any script), numbers, combining marks, and underscore — the "word"
// characters a boundary must not sit inside. ASCII `\b` only knows [A-Za-z0-9_],
// so it can't anchor a token that starts/ends with punctuation (%imply, *of) or
// is written in a non-Latin script (হলো, こんにちは); those flagged words then
// fail to highlight, jump, or replace.
const WORD_CHARACTER = '\\p{L}\\p{N}\\p{M}_'

// Unicode-aware whole-word regex source for a single flagged word. Zero-width
// look-arounds assert the neighbours aren't word characters in any script, so
// "cat" still won't match inside "category" while %imply/*of/হলো match as whole
// tokens. Compile with the `u` flag (required by the \p classes), e.g.
// `new RegExp(wordBoundaryPattern(word), 'gu')`.
export const wordBoundaryPattern = (word) => {
	return `(?<![${WORD_CHARACTER}])${escapeRegex(word)}(?![${WORD_CHARACTER}])`
}
export const isRegexValid = (string) => {
	try {
		new RegExp(string)
		return true
	} catch (e) {
		return false
	}
}