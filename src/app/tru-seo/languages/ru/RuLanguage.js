import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import { all as functionWords } from './config/functionWords'
import transitionWords from './config/transitionWords'
import twoPartTransitionWords from './config/twoPartTransitionWords'
import syllables from './config/syllables.json'
import fleschReadingEaseScores from './config/fleschReadingEaseScores'
import sentenceLength from './config/sentenceLength'

// All helpers
import getStemmer from './helpers/getStemmer'
import isPassiveSentence from './helpers/isPassiveSentence'
import fleschReadingScore from './helpers/calculateFleschReadingScore'

/**
 * Russian language implementation for TruSEO analysis.
 * Provides all Russian-specific data and configuration.
 *
 * @since 5.0.0
 */
export class RuLanguage extends Language {
	constructor () {
		super()
		this.locale = 'ru_RU'
		this.code = 'ru'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		Object.assign(this.researcher.config, {
			language                : this.code,
			passiveConstructionType : 'morphological',
			firstWordExceptions,
			functionWords,
			transitionWords,
			twoPartTransitionWords,
			syllables,
			fleschReadingEaseScores,
			sentenceLength
		})

		Object.assign(this.researcher.helpers, {
			getStemmer,
			isPassiveSentence,
			fleschReadingScore
		})
	}
}