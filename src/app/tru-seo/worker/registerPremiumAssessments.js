// Import each assessment from its own module rather than through a barrel, so the worker bundle
// only pulls in the five it registers.
import WordComplexityAssessment from '@/app/tru-seo/scoring/assessments/readability/WordComplexityAssessment'
import SpellingCheckerAssessment from '@/app/tru-seo/scoring/assessments/readability/SpellingCheckerAssessment'
import TextAlignmentAssessment from '@/app/tru-seo/scoring/assessments/readability/TextAlignmentAssessment'
import KeyphraseDistributionAssessment from '@/app/tru-seo/scoring/assessments/seo/KeyphraseDistributionAssessment'
import KeywordCannibalizationAssessment from '@/app/tru-seo/scoring/assessments/seo/KeywordCannibalizationAssessment'
import { getLanguagesWithWordComplexity, getWordComplexityConfig, getWordComplexityHelper } from '@/app/tru-seo/helpers'
import { researches as languageProcessingResearches } from '@/app/tru-seo/languageProcessing'
import getSpellingErrors from '@/app/tru-seo/researches/getSpellingErrors'

const { getLongCenterAlignedTexts, wordComplexity, keyphraseDistribution: keyPhraseDistribution } = languageProcessingResearches
const pluginName = 'AIOSEO'

export default function (worker, language) {
	if (getLanguagesWithWordComplexity().includes(language)) {
		// Get the word complexity config for the specific language.
		const wordComplexityConfig = getWordComplexityConfig(language)
		// Get the word complexity helper for the specific language.
		const wordComplexityHelper = getWordComplexityHelper(language)
		// Initialize the assessment for regular content.
		const wordComplexityAssessment = new WordComplexityAssessment()
		// Initialize the assessment for cornerstone content.
		const wordComplexityAssessmentCornerstone = new WordComplexityAssessment({
			scores : {
				acceptableAmount : 3
			}
		})

		// Register the word complexity config.
		worker.registerResearcherConfig('wordComplexity', wordComplexityConfig)

		// Register the word complexity helper.
		worker.registerHelper('checkIfWordIsComplex', wordComplexityHelper)

		// Register the word complexity research.
		worker.registerResearch('wordComplexity', wordComplexity)

		// Register the word complexity assessment for regular content.
		worker.registerAssessment('wordComplexity', wordComplexityAssessment, pluginName, 'readability')

		// Register the word complexity assessment for cornerstone content.
		worker.registerAssessment('wordComplexity', wordComplexityAssessmentCornerstone, pluginName, 'cornerstoneReadability')
	}

	const keyphraseDistributionAssessment = new KeyphraseDistributionAssessment()
	worker.registerResearch('keyphraseDistribution', keyPhraseDistribution)
	worker.registerAssessment('keyphraseDistributionAssessment', keyphraseDistributionAssessment, pluginName, 'seo')

	// Spell Checker — dictionary loaded via module singleton in spellChecker.js.
	worker.registerResearch('getSpellingErrors', getSpellingErrors)
	worker.registerAssessment('spellingChecker', new SpellingCheckerAssessment(), pluginName, 'readability')
	worker.registerAssessment('spellingChecker', new SpellingCheckerAssessment({
		scores : {
			fewErrors : 3
		}
	}), pluginName, 'cornerstoneReadability')

	// Text alignment — the assessment is inapplicable unless its research is registered, so both
	// must be registered together or it silently never runs.
	worker.registerResearch('getLongCenterAlignedTexts', getLongCenterAlignedTexts)
	worker.registerAssessment('textAlignment', new TextAlignmentAssessment(), pluginName, 'readability')
	worker.registerAssessment('textAlignment', new TextAlignmentAssessment(), pluginName, 'cornerstoneReadability')

	// Keyword Cannibalization
	const keywordCannibalizationAssessment = new KeywordCannibalizationAssessment()
	worker.registerAssessment('keywordCannibalization', keywordCannibalizationAssessment, pluginName, 'seo')
}