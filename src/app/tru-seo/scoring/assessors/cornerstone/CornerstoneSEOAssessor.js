import SEOAssessor from '../seoAssessor'
import { getAssessment } from '../../AssessmentRegistry'
import MetaDescriptionLengthAssessment from '../../assessments/seo/MetaDescriptionLengthAssessment'
import KeyphraseInImagesAssessment from '../../assessments/seo/KeyphraseInImagesAssessment'
import TextLengthAssessment from '../../assessments/seo/TextLengthAssessment'
import SlugKeywordAssessment from '../../assessments/seo/UrlKeywordAssessment'
import SubHeadingsKeywordAssessment from '../../assessments/seo/SubHeadingsKeywordAssessment'

/**
 * Cornerstone-specific assessment options.
 *
 * @since 5.0.0
 */
const CORNERSTONE_OPTIONS = {
	metaDescriptionLength : { scores: { tooLong: 3, tooShort: 3 } },
	imageKeyphrase        : { scores: { withAltNonKeyword: 3, noAlt: 3 } },
	textLength            : {
		recommendedMinimum   : 900,
		slightlyBelowMinimum : 400,
		belowMinimum         : 300,
		scores               : { belowMinimum: -20, farBelowMinimum: -20 },
		cornerstoneContent   : true
	},
	slugKeyword        : { scores: { okay: 3 } },
	subheadingsKeyword : {
		cornerstoneContent : true,
		parameters         : { recommendedMaximumLength: 250 }
	}
}

/**
 * The CornerstoneSEOAssessor class is used for the SEO analysis for cornerstone content.
 */
export default class CornerstoneSEOAssessor extends SEOAssessor {
	/**
	 * Creates a new CornerstoneSEOAssessor instance.
	 * Uses the AssessmentRegistry to cache and reuse assessment instances.
	 *
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'cornerstoneSEOAssessor'

		// Use cached assessment instances via AssessmentRegistry.
		this.addAssessment('metaDescriptionLength', getAssessment(MetaDescriptionLengthAssessment, CORNERSTONE_OPTIONS.metaDescriptionLength))
		this.addAssessment('imageKeyphrase', getAssessment(KeyphraseInImagesAssessment, CORNERSTONE_OPTIONS.imageKeyphrase))
		this.addAssessment('textLength', getAssessment(TextLengthAssessment, CORNERSTONE_OPTIONS.textLength))
		this.addAssessment('slugKeyword', getAssessment(SlugKeywordAssessment, CORNERSTONE_OPTIONS.slugKeyword))
		this.addAssessment('subheadingsKeyword', getAssessment(SubHeadingsKeywordAssessment, CORNERSTONE_OPTIONS.subheadingsKeyword))
	}
}