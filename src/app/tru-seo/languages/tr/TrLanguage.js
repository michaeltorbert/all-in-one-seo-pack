import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import functionWords from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import sentenceLength from './config/sentenceLength'

// All helpers
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Turkish language implementation for TruSEO analysis.
 * Provides all Turkish-specific data and configuration.
 *
 * @since 5.0.0
 */
export class TrLanguage extends Language {
	constructor () {
		super()
		this.locale = 'tr_TR'
		this.code = 'tr'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		// Deletes researches that are currently not available.
		// When the research is available, this line should be removed.
		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'morphological',
			firstWordExceptions,
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			sentenceLength
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			isPassiveSentence
		})
	}
}