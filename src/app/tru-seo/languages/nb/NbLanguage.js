import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import functionWords from './config/functionWords'
import stopWords from './config/stopWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'

// All helpers
import getStemmer from './helpers/getStemmer'
import getClauses from './helpers/getClauses'

/**
 * Norwegian language implementation for TruSEO analysis.
 * Provides all Norwegian-specific data and configuration.
 *
 * @since 5.0.0
 */
export class NbLanguage extends Language {
	constructor () {
		super()
		this.locale = 'nb_NO'
		this.code = 'nb'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'periphrastic',
			functionWords,
			firstWordExceptions,
			transitionWords,
			twoPartTransitionWords,
			stopWords
		})

		Object.assign(this.researcher.helpers,  {
			getStemmer,
			getClauses
		})
	}
}