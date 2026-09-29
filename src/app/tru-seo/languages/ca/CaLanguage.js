import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import sentenceLength from './config/sentenceLength'

// All helpers
import getStemmer from './helpers/getStemmer'

/**
 * Catalan language implementation for TruSEO analysis.
 * Provides Catalan-specific data and configuration.
 * Note: Catalan has limited support (transition words only).
 *
 * @since 5.0.0
 */
export class CaLanguage extends Language {
	constructor () {
		super()
		this.locale = 'ca'
		this.code = 'ca'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language      : this.code,
			functionWords : [],
			transitionWords,
			twoPartTransitionWords,
			sentenceLength
		})

		Object.assign(this.researcher.helpers, {
			getStemmer
		})
	}
}