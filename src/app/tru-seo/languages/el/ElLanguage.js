import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import functionWords from './config/functionWords'

// All helpers
import getStemmer from './helpers/getStemmer'
import getClauses from './helpers/getClauses'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Greek language implementation for TruSEO analysis.
 * Provides all Greek-specific data and configuration.
 *
 * @since 5.0.0
 */
export class ElLanguage extends Language {
	constructor () {
		super()
		this.locale = 'el'
		this.code = 'el'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			functionWords,
			passiveConstructionType : 'morphologicalAndPeriphrastic',
			transitionWords,
			twoPartTransitionWords,
			firstWordExceptions     : firstWordExceptions.firstWords,
			secondWordExceptions    : firstWordExceptions.secondWords
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			getClauses,
			isPassiveSentence
		})
	}
}