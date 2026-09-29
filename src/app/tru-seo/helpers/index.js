import * as htmlEntities from './htmlEntities'

export { measureTextWidth } from './createMeasurementElement'
export { getLanguagesWithWordFormSupport } from './getLanguagesWithWordFormSupport'
export { default as formatNumber } from './formatNumber'
export { getLanguagesWithWordComplexity } from './getLanguagesWithWordComplexity'
export { getLanguagesWithSpellChecker } from './getLanguagesWithSpellChecker'
export { default as getWordComplexityHelper } from './getWordComplexityHelper'
export { default as getWordComplexityConfig } from './getWordComplexityConfig'

// Lightweight utility functions (lodash replacements).
export {
	has,
	isEmpty,
	isNull,
	isObject,
	isFunction,
	isString,
	isUndefined,
	isArray,
	isNumber,
	noop,
	debounce,
	throttle,
	memoize,
	forEach
} from './utils'

export { htmlEntities }