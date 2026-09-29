import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'

// All helpers
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'
import splitIntoTokensCustom from './helpers/splitIntoTokensCustom'

/**
 * Indonesian language implementation for TruSEO analysis.
 * Provides all Indonesian-specific data and configuration.
 *
 * @since 5.0.0
 */
export class IdLanguage extends Language {
	constructor () {
		super()
		this.locale = 'id_ID'
		this.code = 'id'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore

		Object.assign(this.researcher.config, {
			language                 : this.code,
			passiveConstructionType  : 'morphological',
			firstWordExceptions,
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			areHyphensWordBoundaries : false
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			isPassiveSentence,
			splitIntoTokensCustom
		})
	}
}