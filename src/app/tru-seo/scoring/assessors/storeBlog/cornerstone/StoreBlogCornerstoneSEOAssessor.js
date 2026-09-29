import StoreBlogSEOAssessor from '../StoreBlogSEOAssessor.js'
import MetaDescriptionLengthAssessment from '../../../assessments/seo/MetaDescriptionLengthAssessment.js'
import SlugKeywordAssessment from '../../../assessments/seo/UrlKeywordAssessment.js'

/**
 * The StoreBlogCornerstoneSEOAssessor class is used for the SEO analysis for cornerstone store blogs.
 */
export default class StoreBlogCornerstoneSEOAssessor extends StoreBlogSEOAssessor {
	/**
	 * Creates a new StoreBlogCornerstoneSEOAssessor instance.
	 * @param {Researcher}	researcher	The researcher to use.
	 * @param {Object}		[options]	The assessor options.
	 */
	constructor (researcher, options) {
		super(researcher, options)
		this.type = 'storeBlogCornerstoneSEOAssessor'

		this.addAssessment('metaDescriptionLength', new MetaDescriptionLengthAssessment({
			scores :	{ tooLong: 3, tooShort: 3 }
		}))

		this.addAssessment('slugKeyword', new SlugKeywordAssessment({
			scores : { okay: 3 }
		}))
	}
}