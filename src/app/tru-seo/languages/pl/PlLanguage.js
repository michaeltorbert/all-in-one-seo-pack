import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import stopWords from './config/stopWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import sentenceLength from './config/sentenceLength'

// All helpers
import getClauses from './helpers/getClauses'
import getStemmer from './helpers/getStemmer'

/**
 * Polish language implementation for TruSEO analysis.
 * Provides all Polish-specific data and configuration.
 *
 * @since 5.0.0
 */
export class PlLanguage extends Language {
	constructor () {
		super()
		this.locale = 'pl_PL'
		this.code = 'pl'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'periphrastic',
			firstWordExceptions,
			functionWords,
			stopWords,
			transitionWords,
			twoPartTransitionWords,
			sentenceLength          : sentenceLength
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer
		})
	}
}