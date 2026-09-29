import { normalize } from './sanitize/quotes'
import { createShortcodeTagsRegex, filterShortcodesFromHTML } from './sanitize/filterShortcodesFromTree'
import processExactMatchRequest from './match/processExactMatchRequest'
import removeHtmlBlocks from './html/htmlParser'
import { createStringCache, memoizeStringFn } from './cache/StringCache'

export {
	normalize,
	removeHtmlBlocks,
	filterShortcodesFromHTML,
	createShortcodeTagsRegex,
	processExactMatchRequest,
	createStringCache,
	memoizeStringFn
}