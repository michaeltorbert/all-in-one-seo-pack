import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import functionWords from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import sentenceLength from './config/sentenceLength'
import firstWordExceptions from './config/firstWordExceptions'

// All helpers
import createBasicWordForms from './helpers/createBasicWordForms'
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Farsi language implementation for TruSEO analysis.
 * Provides all Farsi-specific data and configuration.
 *
 * @since 5.0.0
 */
export class FaLanguage extends Language {
	constructor () {
		super()
		this.locale = 'fa_IR'
		this.code = 'fa'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'morphological',
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			sentenceLength,
			firstWordExceptions
		})

		Object.assign(this.researcher.helpers, {
			createBasicWordForms,
			getStemmer,
			isPassiveSentence
		})
	}
}