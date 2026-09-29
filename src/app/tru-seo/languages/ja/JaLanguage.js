import Language from '@/app/tru-seo/languages/base/Language.js'
import AbstractResearcher from '@/app/tru-seo/languageProcessing/AbstractResearcher.js'

// All helpers
import matchWordCustomHelper from './helpers/matchTextWithWord'
import getWordsCustomHelper from './helpers/getWords'
import customGetStemmer from './helpers/customGetStemmer'
import wordsCharacterCount from './helpers/wordsCharacterCount'
import customCountLength from './helpers/countCharacters'
import matchTransitionWordsHelper from './helpers/matchTransitionWords'
import getContentWords from './helpers/getContentWords'
import memoizedTokenizer from './helpers/memoizedSentenceTokenizer'
import splitIntoTokensCustom from './helpers/splitIntoTokensCustom'

// All config
import firstWordExceptions from './config/firstWordExceptions'
import functionWords from './config/functionWords'
import transitionWords from './config/transitionWords'
import topicLength from './config/topicLength'
import textLength from './config/textLength'
import paragraphLength from './config/paragraphLength'
import assessmentApplicability from './config/assessmentApplicabilityCharacterCount'
import sentenceLength from './config/sentenceLength'
import subheadingsTooLong from './config/subheadingsTooLong'
import keyphraseLength from './config/keyphraseLength'
import metaDescriptionLength from './config/metaDescriptionLength'

// All custom researches
import morphology from './customResearches/getWordForms'
import getKeyphraseLength from './customResearches/getKeyphraseLength'
import textLengthResearch from './customResearches/textLength'
import findKeyphraseInSEOTitle from './customResearches/findKeyphraseInSEOTitle'

/**
 * Japanese language implementation for TruSEO analysis.
 * Provides all Japanese-specific data and configuration.
 *
 * @since 5.0.0
 */
export class JaLanguage extends Language {
	constructor () {
		super()
		this.locale = 'ja'
		this.code = 'ja'

		this.loadResearcher()
	}

	loadResearcher () {
		this.researcher = new AbstractResearcher()

		delete this.researcher.defaultResearches.getFleschReadingScore
		delete this.researcher.defaultResearches.getPassiveVoiceResult
		delete this.researcher.defaultResearches.keywordCountInSlug

		Object.assign(this.researcher.config, {
			language        : this.code,
			firstWordExceptions,
			functionWords,
			transitionWords,
			topicLength,
			textLength,
			paragraphLength,
			assessmentApplicability,
			sentenceLength,
			keyphraseLength,
			subheadingsTooLong,
			countCharacters : true,
			metaDescriptionLength
		})

		Object.assign(this.researcher.helpers,  {
			matchWordCustomHelper,
			getWordsCustomHelper,
			getContentWords,
			customGetStemmer,
			wordsCharacterCount,
			customCountLength,
			matchTransitionWordsHelper,
			memoizedTokenizer,
			splitIntoTokensCustom
		})

		Object.assign(this.researcher.customResearches, {
			morphology,
			keyphraseLength : getKeyphraseLength,
			wordCountInText : textLengthResearch,
			findKeyphraseInSEOTitle
		})
	}
}