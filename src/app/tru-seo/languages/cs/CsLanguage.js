import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import stopWords from './config/stopWords'
import { all as functionWords } from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'

// All helpers
import getClauses from './helpers/getClauses'
import getStemmer from './helpers/getStemmer'

/**
 * Czech language implementation for TruSEO analysis.
 * Provides all Czech-specific data and configuration.
 *
 * @since 5.0.0
 */
export class CsLanguage extends Language {
	constructor () {
		super()
		this.locale = 'cs_CZ'
		this.code = 'cs'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'periphrastic',
			firstWordExceptions,
			stopWords,
			functionWords,
			transitionWords,
			twoPartTransitionWords
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer
		})
	}
}