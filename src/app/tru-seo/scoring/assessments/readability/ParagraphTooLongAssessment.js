import { __, _n, sprintf } from '@/vue/plugins/translations'
import merge from 'lodash-es/merge'

import { inRangeEndInclusive as inRange } from '../../helpers/assessments/inRange'
import AssessmentResult from '../../../values/AssessmentResult'
import Mark from '../../../values/Mark'
import Assessment from '../assessment'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that will look if the Paper contains paragraphs that are considered too long.
 */
export default class ParagraphTooLongAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 * @constructor
	 * @param {Object} config       The configuration to use.
	 * @param {boolean} isProduct   Whether product configuration should be used.
	 */
	constructor (config = {}, isProduct = false) {
		super()

		const defaultConfig = {
			countCharacters : false,
			parameters      : {
				recommendedLength        : 150,
				maximumRecommendedLength : 200
			}
		}

		this.identifier = 'textParagraphTooLong'
		this._config = merge(defaultConfig, config)
		this._isProduct = isProduct
	}

	/**
	 * Returns an array containing only the paragraphs longer than the recommended length.
	 *
	 * @param {ParagraphLength[]} paragraphsLength The array containing the lengths of individual paragraphs.
	 * @param {Object} config The config to use.
	 *
	 * @returns {ParagraphLength[]} An array containing too long paragraphs.
	 */
	getTooLongParagraphs (paragraphsLength, config) {
		return paragraphsLength.filter(paragraph => paragraph.paragraphLength > config.parameters.recommendedLength)
	}

	/**
	 * Check if there is language-specific config, and if so, overwrite the current config with it.
	 *
	 * @param {Researcher} researcher The researcher to use.
	 *
	 * @returns {Object} The config that should be used.
	 */
	getConfig (researcher) {
		const currentConfig = this._config
		const languageSpecificConfig = researcher.getConfig('paragraphLength')

		/*
		 * If a language has a specific paragraph length config, check further if the assessment is run in product pages.
		 * If it's run in product pages, override the default config parameters with the language specific config for product pages,
		 * otherwise override it with the language specific config for default pages analysis.
		 */
		if (languageSpecificConfig) {
			currentConfig.parameters = this._isProduct ? languageSpecificConfig.productPageParams : languageSpecificConfig.defaultPageParams
		}

		return currentConfig
	}

	/**
	 * Returns the score for the ParagraphTooLongAssessment.
	 * @param {ParagraphLength[]} paragraphsLength The array containing the lengths of individual paragraphs.
	 * @param {Object} config The config to use.
	 * @returns {number} The score.
	 */
	getScore (paragraphsLength, config) {
		if (0 === paragraphsLength.length) {
			return 9
		}

		const sortedParagraphsLength = [ ...paragraphsLength ].sort((a, b) => b.paragraphLength - a.paragraphLength)

		const longestParagraphLength = sortedParagraphsLength[0].paragraphLength
		let score
		if (longestParagraphLength <= config.parameters.recommendedLength) {
			// Green indicator.
			score = 9
		}

		if (inRange(longestParagraphLength, config.parameters.recommendedLength, config.parameters.maximumRecommendedLength)) {
			// Orange indicator.
			score = 6
		}

		if (longestParagraphLength > config.parameters.maximumRecommendedLength) {
			// Red indicator.
			score = 3
		}
		return score
	}

	/**
	 * Returns the scores and text for the ParagraphTooLongAssessment.
	 *
	 * @param {ParagraphLength[]} paragraphsLength The array containing the lengths of individual paragraphs.
	 * @param {Object} config The config to use.
	 *
	 * @returns {AssessmentResult} The assessmentResult.
	 */
	calculateResult (paragraphsLength, config) {
		const tooLongParagraphs = this.getTooLongParagraphs(paragraphsLength, config)

		const assessmentResult = new AssessmentResult()

		const score = this.getScore(paragraphsLength, config)

		assessmentResult.setScore(score)
		assessmentResult.setTitle(7 <= score ? __('Paragraph length', td) : __('Long paragraphs', td))

		if (7 <= score) {
			assessmentResult.setHasMarks(false)
			assessmentResult.setText(__(
				'All your paragraphs are a comfortable length.',
				td
			))
			return assessmentResult
		}

		const wordFeedback = sprintf(
			/* translators: %1$d expands to the number of paragraphs over the recommended limit, %2$d expands to the limit. */
			_n(
				'%1$d paragraph is over the recommended %2$d words. Long paragraphs are hard to read on phones — try splitting it.',
				'%1$d paragraphs are over the recommended %2$d words. Long paragraphs are hard to read on phones — try splitting them.',
				tooLongParagraphs.length,
				td
			),
			tooLongParagraphs.length,
			config.parameters.recommendedLength
		)

		const characterFeedback = sprintf(
			/* translators: %1$d expands to the number of paragraphs over the recommended limit, %2$d expands to the limit. */
			_n(
				'%1$d paragraph is over the recommended %2$d characters. Long paragraphs are hard to read on phones — try splitting it.',
				'%1$d paragraphs are over the recommended %2$d characters. Long paragraphs are hard to read on phones — try splitting them.',
				tooLongParagraphs.length,
				td
			),
			tooLongParagraphs.length,
			config.parameters.recommendedLength
		)
		assessmentResult.setHasMarks(true)
		assessmentResult.setText(config.countCharacters ? characterFeedback : wordFeedback)

		return assessmentResult
	}

	/**
	 * Creates a marker for the paragraphs.
	 *
	 * @param {Paper} _paper The paper to use for the assessment.
	 * @param {Researcher} researcher The researcher used for calling research.
	 *
	 * @returns {Mark[]} An array with marked paragraphs.
	 */
	getMarks (_paper, researcher) {
		const paragraphsLength = researcher.getResearch('getParagraphLength')
		const tooLongParagraphs = this.getTooLongParagraphs(paragraphsLength, this.getConfig(researcher))
		return tooLongParagraphs.flatMap(({ paragraph }) => {
			const scl = paragraph.sourceCodeLocation
			return new Mark({
				original : paragraph.innerText() || '',
				position : {
					startOffset      : scl.startTag ? scl.startTag.endOffset : scl.startOffset,
					endOffset        : scl.endTag ? scl.endTag.startOffset : scl.endOffset,
					startOffsetBlock : 0,
					endOffsetBlock   : scl.endOffset - scl.startOffset,
					clientId         : paragraph.clientId || '',
					attributeId      : paragraph.attributeId || '',
					isFirstSection   : paragraph.isFirstSection || false
				}
			})
		})
	}

	/**
	 * Runs the getParagraphLength module, based on this returns an assessment result with score and text.
	 *
	 * @param {Paper} _paper            Unused; kept for the Assessor interface signature.
	 * @param {Researcher} researcher   The researcher used for calling research.
	 *
	 * @returns {AssessmentResult} The assessment result.
	 */
	getResult (_paper, researcher) {
		const paragraphsLength = researcher.getResearch('getParagraphLength')
		this._config.countCharacters = !!researcher.getConfig('countCharacters')

		return this.calculateResult(paragraphsLength, this.getConfig(researcher))
	}
}