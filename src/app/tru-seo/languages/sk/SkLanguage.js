import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import stopWords from './config/stopWords'
import functionWords from './config/functionWords'
import { allWords as transitionWords } from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import firstWordExceptions from './config/firstWordExceptions'

// All helpers
import getClauses from './helpers/getSlovakClauses'
import getStemmer from './helpers/getStemmer'

/**
 * Slovak language implementation for TruSEO analysis.
 * Provides all Slovak-specific data and configuration.
 *
 * @since 5.0.0
 */
export class SkLanguage extends Language {
	constructor () {
		super()
		this.locale = 'sk_SK'
		this.code = 'sk'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		// Deletes researches that are currently not available.
		// When the research is available, this line should be removed.
		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'periphrastic',
			stopWords,
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			firstWordExceptions
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer
		})
	}
}