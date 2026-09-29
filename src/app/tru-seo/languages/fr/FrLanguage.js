import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import stopWords from './config/stopWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import syllables from './config/syllables.json'

// All helpers
import getClauses from './helpers/getClauses'
import getStemmer from './helpers/getStemmer'
import fleschReadingScore from './helpers/calculateFleschReadingScore'

/**
 * French language implementation for TruSEO analysis.
 * Provides all French-specific data and configuration.
 *
 * @since 5.0.0
 */
export class FrLanguage extends Language {
	constructor () {
		super()
		this.locale = 'fr_FR'
		this.code = 'fr'

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
			syllables
		})

		Object.assign(this.researcher.helpers, {
			getClauses,
			getStemmer,
			fleschReadingScore
		})
	}
}