import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import functionWords from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import firstWordExceptions from './config/firstWordExceptions'
import stopWords from './config/stopWords'

// All helpers
import getStemmer from './helpers/getStemmer'
import getClauses from './helpers/getHungarianClauses'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Hungarian language implementation for TruSEO analysis.
 * Provides all Hungarian-specific data and configuration.
 *
 * @since 5.0.0
 */
export class HuLanguage extends Language {
	constructor () {
		super()
		this.locale = 'hu_HU'
		this.code = 'hu'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'morphologicalAndPeriphrastic',
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			firstWordExceptions,
			stopWords
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			getClauses,
			isPassiveSentence
		})
	}
}