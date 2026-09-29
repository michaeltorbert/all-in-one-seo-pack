import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import keyphraseLength from './config/keyphraseLength'

// All helpers
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'

/**
 * Swedish language implementation for TruSEO analysis.
 * Provides all Swedish-specific data and configuration.
 *
 * @since 5.0.0
 */
export class SvLanguage extends Language {
	constructor () {
		super()
		this.locale = 'sv_SE'
		this.code = 'sv'

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
			keyphraseLength
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			isPassiveSentence
		})
	}
}