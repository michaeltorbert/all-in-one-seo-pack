import SEOAssessor from '../seoAssessor'
import KeyphraseLengthAssessment from '../../assessments/seo/KeyphraseLengthAssessment'
import MetaDescriptionKeywordAssessment from '../../assessments/seo/MetaDescriptionKeywordAssessment'
import MetaDescriptionLengthAssessment from '../../assessments/seo/MetaDescriptionLengthAssessment'
import KeyphraseInSEOTitleAssessment from '../../assessments/seo/KeyphraseInSEOTitleAssessment'
import PageTitleWidthAssessment from '../../assessments/seo/PageTitleWidthAssessment'
import SlugKeywordAssessment from '../../assessments/seo/UrlKeywordAssessment'
import FunctionWordsInKeyphraseAssessment from '../../assessments/seo/FunctionWordsInKeyphraseAssessment'

/**
 * The StoreBlogSEOAssessor class is used for the SEO analysis for store blogs.
 */
export default class StoreBlogSEOAssessor extends SEOAssessor {
	/**
	 * Creates a new StoreBlogSEOAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'storeBlogSEOAssessor'

		this._assessments = [
			new KeyphraseLengthAssessment(),
			new MetaDescriptionKeywordAssessment(),
			new MetaDescriptionLengthAssessment(),
			new KeyphraseInSEOTitleAssessment(),
			new PageTitleWidthAssessment({
				scores : {
					widthTooShort : 9
				}
			}, true),
			new SlugKeywordAssessment(),
			new FunctionWordsInKeyphraseAssessment()
		]
	}
}