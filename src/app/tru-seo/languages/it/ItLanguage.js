import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import stopWords from './config/stopWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import syllables from './config/syllables.json'
import sentenceLength from './config/sentenceLength'

// All helpers
import getClauses from './helpers/getClauses'
import getStemmer from './helpers/getStemmer'
import fleschReadingScore from './helpers/calculateFleschReadingScore'

/**
 * Italian language implementation for TruSEO analysis.
 * Provides all Italian-specific data and configuration.
 *
 * @since 5.0.0
 */
export class ItLanguage extends Language {
	constructor () {
		super()
		this.locale = 'it_IT'
		this.code = 'it'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'periphrastic',
			firstWordExceptions,
			functionWords,
			stopWords,
			transitionWords,
			twoPartTransitionWords,
			syllables,
			sentenceLength
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer,
			fleschReadingScore
		})
	}
}