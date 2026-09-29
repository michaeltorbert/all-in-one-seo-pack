import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import functionWords from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import firstWordExceptions from './config/firstWordExceptions'
import sentenceLength from './config/sentenceLength'

// All helpers
import { createBasicWordForms } from './helpers/createBasicWordForms'
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'
import { PREFIXED_FUNCTION_WORDS_REGEX } from './config/prefixedFunctionWords'

/**
 * Hebrew language implementation for TruSEO analysis.
 * Provides all Hebrew-specific data and configuration.
 *
 * @since 5.0.0
 */
export class HeLanguage extends Language {
	constructor () {
		super()
		this.locale = 'he_IL'
		this.code = 'he'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                   : this.code,
			passiveConstructionType    : 'morphological',
			firstWordExceptions,
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			sentenceLength,
			prefixedFunctionWordsRegex : PREFIXED_FUNCTION_WORDS_REGEX
		})

		Object.assign(this.researcher.helpers, {
			createBasicWordForms,
			getStemmer,
			isPassiveSentence
		})
	}
}