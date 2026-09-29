import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import { PREFIXED_FUNCTION_WORDS_REGEX } from './config/prefixedFunctionWords'

// All helpers
import { createBasicWordForms } from './helpers/createBasicWordForms'
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Arabic language implementation for TruSEO analysis.
 * Provides all Arabic-specific data and configuration.
 *
 * @since 5.0.0
 */
export class ArLanguage extends Language {
	constructor () {
		super()
		this.locale = 'ar'
		this.code = 'ar'

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
			prefixedFunctionWordsRegex : PREFIXED_FUNCTION_WORDS_REGEX
		})

		Object.assign(this.researcher.helpers, {
			createBasicWordForms,
			getStemmer,
			isPassiveSentence
		})
	}
}