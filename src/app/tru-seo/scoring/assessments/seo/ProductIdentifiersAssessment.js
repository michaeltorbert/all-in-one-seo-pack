import merge from 'lodash-es/merge'
import Assessment from '../assessment'
import AssessmentResult from '../../../values/AssessmentResult'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Represents the assessment that checks whether a product has identifier(s).
 */
export default class ProductIdentifiersAssessment extends Assessment {
	/**
	 * Constructs a product identifier assessment.
	 *
	 * @param {Object} config   Potential additional config for the assessment.
	 * @param {Object} [config.scores] The scores to use for the assessment.
	 * @param {number} [config.scores.good] The score to return if the product has an identifier.
	 * @param {number} [config.scores.ok] The score to return if the product doesn't have an identifier.
	 * @param {boolean} [config.assessVariants] Whether to assess variants.
	 * @param {boolean} [config.shouldShowEditButton] Whether to show edit button.
	 * @param {Function} [config.callbacks] The callbacks to use for the assessment.
	 * @param {Function} [config.callbacks.getResultTexts] The function that returns the result texts.
	 *
	 * @returns {void}
	 */
	constructor (config = {}) {
		super()

		const defaultConfig = {
			scores : {
				good : 9,
				ok   : 6
			},
			assessVariants       : false,
			shouldShowEditButton : false,
			callbacks            : {}
		}

		this.identifier = 'productIdentifier'
		this._config = merge(defaultConfig, config)
	}

	/**
	 * Executes the assessment and returns a result based on the research.
	 *
	 * @param {Paper}       paper       The paper to use for the assessment.
	 *
	 * @returns {AssessmentResult} An assessment result with the score and formatted text.
	 */
	getResult (paper) {
		const productIdentifierData = paper.getCustomData()

		const result = this.scoreProductIdentifier(productIdentifierData, this._config)

		const assessmentResult = new AssessmentResult()

		if (result) {
			assessmentResult.setScore(result.score)
			assessmentResult.setTitle(__('Product identifier', td))
			assessmentResult.setText(result.text)
		}

		if (9 > assessmentResult.getScore() && this._config.shouldShowEditButton) {
			assessmentResult.setHasJumps(true)
		}

		return assessmentResult
	}

	/**
	 * Checks whether the assessment is applicable. It is applicable unless the product has variants, and we don't want to
	 * assess variants (this is the case for Shopify since we cannot at the moment easily access variant data in Shopify).
	 *
	 * @param {Paper} paper The paper to check.
	 *
	 * @returns {boolean} Whether the assessment is applicable.
	 */
	isApplicable (paper) {
		const customData = paper.getCustomData()

		/*
		 * If the global identifier cannot be retrieved, the assessment shouldn't be applicable if the product is a simple
		 * or external product, or doesn't have variants. Even though in reality a simple or external product doesn't have variants,
		 * this double check is added because the hasVariants variable doesn't always update correctly when changing product type.
		 */
		if (false === customData.canRetrieveGlobalIdentifier &&
			([ 'simple', 'external', 'grouped' ].includes(customData.productType) || false === customData.hasVariants)) {
			return false
		}

		// If variant identifiers cannot be retrieved for a variable product with variants, the assessment shouldn't be applicable.
		if (false === customData.canRetrieveVariantIdentifiers && true === customData.hasVariants && 'variable' === customData.productType) {
			return false
		}

		// Assessment is not applicable if we don't want to assess variants and the product has variants.
		return !(false === this._config.assessVariants && customData.hasVariants)
	}

	/**
	 * Returns a score based on whether the product (variants) have an identifier.
	 *
	 * @param {Object} productIdentifierData  Whether product has variants, global identifier, and variant identifiers.
	 * @param {Object} config                 The configuration to use.
	 *
	 * @returns {{score: number, text: string} | {}}	The result object with score and text
	 * 													or empty object if no score should be returned.
	 */
	scoreProductIdentifier (productIdentifierData, config) {
		const { good, okay } = this.getFeedbackStrings()

		// Apply the following scoring conditions to products without variants.
		if ([ 'simple', 'grouped', 'external' ].includes(productIdentifierData.productType) ||
			('variable' === productIdentifierData.productType && !productIdentifierData.hasVariants)) {
			if (!productIdentifierData.hasGlobalIdentifier) {
				return {
					score : config.scores.ok,
					text  : okay.withoutVariants
				}
			}

			return {
				score : config.scores.good,
				text  : good.withoutVariants
			}
		} else if ('variable' === productIdentifierData.productType && productIdentifierData.hasVariants) {
			if (!productIdentifierData.doAllVariantsHaveIdentifier) {
				// If we want to assess variants, and if product has variants but not all variants have an identifier, return orange bullet.
				// If all variants have an identifier, return green bullet.
				return {
					score : config.scores.ok,
					text  : okay.withVariants
				}
			}
			return {
				score : config.scores.good,
				text  : good.withVariants
			}
		}
		return {}
	}

	/**
	 * Gets the feedback strings for the assessment.
	 * If you want to override the feedback strings, you can do so by providing a custom callback in the config: `this._config.callbacks.getResultTexts`.
	 * The callback function should return an object with the following properties:
	 * - good: {withoutVariants: string, withVariants: string}
	 * - okay: {withoutVariants: string, withVariants: string}
	 *
	 * @returns {{good: {withoutVariants: string, withVariants: string}, okay: {withoutVariants: string, withVariants: string}}} The feedback strings.
	 */
	getFeedbackStrings () {
		if (!this._config.callbacks.getResultTexts) {
			return {
				good : {
					withoutVariants : __('Your product has an identifier (GTIN or similar).', td),
					withVariants    : __('All your product variants have an identifier.', td)
				},
				okay : {
					withoutVariants : __('Your product is missing an identifier like a GTIN, ISBN, or MPN. Adding one helps your product show up in Google Shopping and rich results.', td),
					withVariants    : __('Some of your product variants are missing an identifier (GTIN, ISBN, or MPN). Adding one to each helps your products show up in Google Shopping and rich results.', td)
				}
			}
		}

		return this._config.callbacks.getResultTexts()
	}
}