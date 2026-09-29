import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import stopWords from './config/stopWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import syllables from './config/syllables.json'
import keyphraseLength from './config/keyphraseLength'
import memoizedTokenizer from './helpers/memoizedSentenceTokenizer'

// All helpers
import getClauses from './helpers/getClauses'
import getStemmer from './helpers/getStemmer'
import fleschReadingScore from './helpers/calculateFleschReadingScore'
import checkIfWordIsFunction from './helpers/checkIfWordIsFunction'

/**
 * German language implementation for TruSEO analysis.
 * Provides all German-specific data and configuration.
 *
 * @since 5.0.0
 */
export class DeLanguage extends Language {
	constructor () {
		super()
		this.locale = 'de_DE'
		this.code = 'de'

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
			syllables,
			keyphraseLength
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer,
			fleschReadingScore,
			memoizedTokenizer,
			checkIfWordIsFunction
		})
	}
}