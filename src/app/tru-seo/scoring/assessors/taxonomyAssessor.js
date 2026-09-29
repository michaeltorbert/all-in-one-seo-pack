import SEOAssessor from './seoAssessor.js'
import IntroductionKeywordAssessment from '../assessments/seo/IntroductionKeywordAssessment.js'
import KeyphraseLengthAssessment from '../assessments/seo/KeyphraseLengthAssessment.js'
import KeyphraseDensityAssessment from '../assessments/seo/KeywordDensityAssessment.js'
import MetaDescriptionKeywordAssessment from '../assessments/seo/MetaDescriptionKeywordAssessment.js'
import MetaDescriptionLengthAssessment from '../assessments/seo/MetaDescriptionLengthAssessment.js'
import TextLengthAssessment from '../assessments/seo/TextLengthAssessment.js'
import KeyphraseInSEOTitleAssessment from '../assessments/seo/KeyphraseInSEOTitleAssessment.js'
import PageTitleWidthAssessment from '../assessments/seo/PageTitleWidthAssessment.js'
import SlugKeywordAssessment from '../assessments/seo/UrlKeywordAssessment.js'
import FunctionWordsInKeyphraseAssessment from '../assessments/seo/FunctionWordsInKeyphraseAssessment.js'
import KeyphraseInTermNameAssessment from '../assessments/seo/KeyphraseInTermNameAssessment.js'
import ValidOnlyResultsScoreAggregator from '../scoreAggregators/ValidOnlyResultsScoreAggregator'

/**
 * Text length thresholds for a term description.
 *
 * @since 5.0.0
 */
export const TAXONOMY_TEXT_LENGTH_OPTIONS = {
	recommendedMinimum   : 30,
	slightlyBelowMinimum : 10,
	veryFarBelowMinimum  : 1
}

/**
 * The TaxonomyAssessor is used for the assessment of terms.
 *
 * A term has no body content — only its description — so the inherited post assessments that need
 * headings, images or links are replaced with an explicit list rather than reduced one by one.
 * Subclasses differ only by `assessorType()`, which keeps the collection variants from drifting
 * away from this list.
 */
export default class TaxonomyAssessor extends SEOAssessor {
	/**
	 * Creates a new TaxonomyAssessor instance.
	 *
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)

		this.type             = this.assessorType()
		this._assessments     = this.buildAssessments()
		this._scoreAggregator = new ValidOnlyResultsScoreAggregator()
	}

	/**
	 * Returns the assessor type. Overridden by the collection variants.
	 *
	 * @returns {string} The assessor type.
	 */
	assessorType () {
		return 'taxonomyAssessor'
	}

	/**
	 * Returns the text length options to use. Overridden by the cornerstone variant.
	 *
	 * @returns {Object} The text length options.
	 */
	textLengthOptions () {
		return { ...TAXONOMY_TEXT_LENGTH_OPTIONS, customContentType: this.type }
	}

	/**
	 * Returns the assessments that apply to a term.
	 *
	 * NOTE: `metaDescriptionLength` needs no taxonomy-specific config — it derives the date length
	 * from `paper.getDate()`, and a term carries no date.
	 *
	 * @returns {Assessment[]} The assessments to run.
	 */
	buildAssessments () {
		return [
			new IntroductionKeywordAssessment(),
			new KeyphraseLengthAssessment(),
			new KeyphraseDensityAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new MetaDescriptionLengthAssessment(),
			new TextLengthAssessment(this.textLengthOptions()),
			new KeyphraseInSEOTitleAssessment(),
			new PageTitleWidthAssessment({
				scores : {
					widthTooShort : 9
				}
			}, true),
			new SlugKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment(),
			new KeyphraseInTermNameAssessment()
		]
	}
}