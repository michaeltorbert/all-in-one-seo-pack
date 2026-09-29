/* eslint-disable complexity */
// External dependencies.
import { setLocaleData } from '@wordpress/i18n'
import isEqual from 'lodash-es/isEqual'
import merge from 'lodash-es/merge'

// Internal dependencies.
import { build, clearTreeCache } from '@/app/tru-seo/parsers/parse/build'
import { clearAllCaches, getCacheStats } from '@/app/tru-seo/cache'
import { configureShortlinker } from '@/app/tru-seo/helpers/shortlinker'
import getLanguage from '@/app/tru-seo/languages/getLanguage'
import spellChecker from '@/app/tru-seo/helpers/spellChecker'
import {
	forEach,
	getLanguagesWithSpellChecker,
	has,
	isEmpty,
	isFunction,
	isNull,
	isObject,
	isString,
	isUndefined
} from '@/app/tru-seo/helpers'
import InvalidTypeError from '@/app/tru-seo/errors/InvalidTypeError.js'
import includesAny from '@/app/tru-seo/helpers/includesAny.js'
import LanguageProcessor from '@/app/tru-seo/parsers/parse/language/LanguageProcessor.js'
import MissingArgumentError from '@/app/tru-seo/errors/MissingArgumentError.js'
import Paper from '@/app/tru-seo/values/Paper.js'
import Scheduler from '@/app/tru-seo/worker/scheduler'
import Transporter from '@/app/tru-seo/worker/transporter'
import wrapTryCatchAroundAction from '@/app/tru-seo/worker/wrapTryCatchAroundAction.js'

// Assessor classes.
import ContentAssessor from '@/app/tru-seo/scoring/assessors/contentAssessor.js'
import CornerstoneContentAssessor from '@/app/tru-seo/scoring/assessors/cornerstone/CornerstoneContentAssessor.js'
import CornerstoneRelatedKeywordAssessor from '@/app/tru-seo/scoring/assessors/cornerstone/CornerstoneRelatedKeywordAssessor.js'
import CornerstoneSEOAssessor from '@/app/tru-seo/scoring/assessors/cornerstone/CornerstoneSEOAssessor.js'
import RelatedKeywordAssessor from '@/app/tru-seo/scoring/assessors/relatedKeywordAssessor.js'
import RelatedKeywordTaxonomyAssessor from '@/app/tru-seo/scoring/assessors/relatedKeywordTaxonomyAssessor.js'
import SEOAssessor from '@/app/tru-seo/scoring/assessors/seoAssessor.js'
import TaxonomyAssessor from '@/app/tru-seo/scoring/assessors/taxonomyAssessor.js'

/**
 * SEO assessments that never apply to a term. Its description is a single short block, so these
 * pass unconditionally and inflate the score.
 */
const TAXONOMY_EXCLUDED_ASSESSMENTS = [ 'keyphraseDistribution' ]

/**
 * Assessor types that analyse a term. Keyed off the assessor rather than the `useTaxonomy` config
 * flag: a term can reach a collection assessor through `customAnalysisType` without that flag ever
 * being set, so gating on the flag silently misses it.
 */
const TAXONOMY_ASSESSOR_TYPES = [
	'taxonomyAssessor',
	'collectionSEOAssessor',
	'collectionCornerstoneSEOAssessor',
	'relatedKeywordsTaxonomyAssessor',
	'collectionRelatedKeywordAssessor'
]

/**
 * The only content-assessor assessment a term keeps. It lives on the readability assessor but has
 * its own tab, which terms do show.
 */
const SPELLING_IDENTIFIER = 'spellingChecker'

/**
 * Analysis Web Worker.
 *
 * Worker API:     https://developer.mozilla.org/en-US/docs/Web/API/Worker
 * Webpack loader: https://github.com/webpack-contrib/worker-loader
 */
export default class AnalysisWebWorker {
	/* eslint-disable max-statements */
	/**
	 * Initializes the AnalysisWebWorker class.
	 *
	 * @param {Object}      scope       The scope for the messaging. Expected to have the
	 *                                  `onmessage` event and the `postMessage` function.
	 * @param {Researcher}  researcher  The researcher to use.
	 */
	constructor (scope, researcher) {
		this._scope = scope

		this._configuration = {
			contentAnalysisActive : true,
			keywordAnalysisActive : true,
			useCornerstone        : false,
			useTaxonomy           : false,
			// The locale used for language-specific configurations in Flesch-reading ease and Sentence length assessments.
			locale                : 'en_US',
			customAnalysisType    : '',
			// Nouns for result copy, e.g. "Your product category is 43 words long". Null for posts,
			// where the assessments fall back to their own default noun.
			contentNouns          : null
		}

		this._scheduler = new Scheduler()

		this._paper = null
		this._relatedKeywords = {}
		this._spellCheckerInitPromise = null

		this._researcher = researcher

		this._contentAssessor = null
		this._seoAssessor = null
		this._relatedKeywordAssessor = null

		this.additionalAssessors = {}

		/*
		 * The cached analysis results.
		 *
		 * A single result has the following structure:
		 * {AssessmentResult[]} 	readability.results An array of assessment results; in serialized format.
		 * {number}             	readability.score   The overall score.
		 *
		 * The results have the following structure.
		 * {Object} 				readability 		    Content assessor results.
		 * {Object} 				seo         		    SEO assessor results, per keyword identifier or empty string for the main.
		 * {Object} 				seo[ focusKeyword ] The result of the paper analysis for the main keyword.
		 * {Array|null} 		seo[ additionalKeywords ] The result of the paper analysis for the additional keywords.
		 * {Object} 				seo[ key ]  		    Same as above, but instead for a related keyword.
		 */
		this._results = {
			readability : {
				results : [],
				score   : 0
			},
			seo : {
				focusKeyword : {
					results : [],
					score   : 0
				},
				additionalKeywords : null
			}
		}
		this._registeredAssessments = []
		this._registeredMessageHandlers = {}
		this._registeredParsers = []

		// Custom assessor classes.
		this._CustomSEOAssessorClasses = {}
		this._CustomCornerstoneSEOAssessorClasses = {}
		this._CustomContentAssessorClasses = {}
		this._CustomCornerstoneContentAssessorClasses = {}
		this._CustomRelatedKeywordAssessorClasses = {}
		this._CustomCornerstoneRelatedKeywordAssessorClasses = {}

		// Custom assessor options.
		this._CustomSEOAssessorOptions = {}
		this._CustomCornerstoneSEOAssessorOptions = {}
		this._CustomContentAssessorOptions = {}
		this._CustomCornerstoneContentAssessorOptions = {}
		this._CustomRelatedKeywordAssessorOptions = {}
		this._CustomCornerstoneRelatedKeywordAssessorOptions = {}

		this.bindActions()

		this.assessRelatedKeywords = this.assessRelatedKeywords.bind(this)

		// Bind register functions to this scope.
		this.registerAssessment = this.registerAssessment.bind(this)
		this.registerMessageHandler = this.registerMessageHandler.bind(this)
		this.refreshAssessment = this.refreshAssessment.bind(this)
		this.setCustomContentAssessorClass = this.setCustomContentAssessorClass.bind(this)
		this.setCustomCornerstoneContentAssessorClass = this.setCustomCornerstoneContentAssessorClass.bind(this)
		this.setCustomSEOAssessorClass = this.setCustomSEOAssessorClass.bind(this)
		this.setCustomCornerstoneSEOAssessorClass = this.setCustomCornerstoneSEOAssessorClass.bind(this)
		this.setCustomRelatedKeywordAssessorClass = this.setCustomRelatedKeywordAssessorClass.bind(this)
		this.setCustomCornerstoneRelatedKeywordAssessorClass = this.setCustomCornerstoneRelatedKeywordAssessorClass.bind(this)
		this.registerAssessor = this.registerAssessor.bind(this)
		this.registerResearch = this.registerResearch.bind(this)
		this.registerHelper = this.registerHelper.bind(this)
		this.registerResearcherConfig = this.registerResearcherConfig.bind(this)

		// Bind event handlers to this scope.
		this.handleMessage = this.handleMessage.bind(this)

		// Wrap try/catch around actions.
		this.analyze = wrapTryCatchAroundAction(this.analyze,
			'An error occurred while running the analysis.')
		this.runResearch = wrapTryCatchAroundAction(this.runResearch,
			'An error occurred after running the \'%%name%%\' research.')
	}
	/* eslint-enable max-statements */

	/**
	 * Binds actions to this scope.
	 *
	 * @returns {void}
	 */
	bindActions () {
		// Bind actions to this scope.
		this.analyze = this.analyze.bind(this)
		this.analyzeDone = this.analyzeDone.bind(this)
		this.loadScript = this.loadScript.bind(this)
		this.loadScriptDone = this.loadScriptDone.bind(this)
		this.customMessage = this.customMessage.bind(this)
		this.customMessageDone = this.customMessageDone.bind(this)
		this.clearCache = this.clearCache.bind(this)
		this.runResearch = this.runResearch.bind(this)
		this.runResearchDone = this.runResearchDone.bind(this)
	}

	/**
	 * Sets a custom content assessor class.
	 *
	 * @param {ContentAssessor}  ContentAssessorClass     A content assessor class.
	 * @param {string} customAnalysisType       The type of analysis.
	 * @param {Object} customAssessorOptions    The options to use.
	 *
	 * @returns {void}
	 */
	setCustomContentAssessorClass (ContentAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomContentAssessorClasses[customAnalysisType] = ContentAssessorClass
		this._CustomContentAssessorOptions[customAnalysisType] = customAssessorOptions
		this._contentAssessor = this.createContentAssessor()
	}

	/**
	 * Sets a custom cornerstone content assessor class.
	 *
	 * @param {CornerstoneContentAssessor}  CornerstoneContentAssessorClass  A cornerstone content assessor class.
	 * @param {string} customAnalysisType               The type of analysis.
	 * @param {Object} customAssessorOptions            The options to use.
	 *
	 * @returns {void}
	 */
	setCustomCornerstoneContentAssessorClass (CornerstoneContentAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomCornerstoneContentAssessorClasses[customAnalysisType] = CornerstoneContentAssessorClass
		this._CustomCornerstoneContentAssessorOptions[customAnalysisType] = customAssessorOptions
		this._contentAssessor = this.createContentAssessor()
	}

	/**
	 * Sets a custom SEO assessor class.
	 *
	 * @param {SEOAssessor}   SEOAssessorClass   An SEO assessor class.
	 * @param {string}  customAnalysisType       The type of analysis.
	 * @param {Object}  customAssessorOptions    The options to use.
	 *
	 * @returns {void}
	 */
	setCustomSEOAssessorClass (SEOAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomSEOAssessorClasses[customAnalysisType] = SEOAssessorClass
		this._CustomSEOAssessorOptions[customAnalysisType] = customAssessorOptions
		this._seoAssessor = this.createSEOAssessor()
	}

	/**
	 * Sets a custom cornerstone SEO assessor class.
	 *
	 * @param {CornerstoneSEOAssessor}   CornerstoneSEOAssessorClass  A cornerstone SEO assessor class.
	 * @param {string}  customAnalysisType           The type of analysis.
	 * @param {Object}  customAssessorOptions        The options to use.
	 *
	 * @returns {void}
	 */
	setCustomCornerstoneSEOAssessorClass (CornerstoneSEOAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomCornerstoneSEOAssessorClasses[customAnalysisType] = CornerstoneSEOAssessorClass
		this._CustomCornerstoneSEOAssessorOptions[customAnalysisType] = customAssessorOptions
		this._seoAssessor = this.createSEOAssessor()
	}

	/**
	 * Sets a custom related keyword assessor class.
	 *
	 * @param {RelatedKeywordAssessor}   RelatedKeywordAssessorClass A related keyword assessor class.
	 * @param {string}  customAnalysisType          The type of analysis.
	 * @param {Object}  customAssessorOptions       The options to use.
	 *
	 * @returns {void}
	 */
	setCustomRelatedKeywordAssessorClass (RelatedKeywordAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomRelatedKeywordAssessorClasses[customAnalysisType] = RelatedKeywordAssessorClass
		this._CustomRelatedKeywordAssessorOptions[customAnalysisType] = customAssessorOptions
		this._relatedKeywordAssessor = this.createRelatedKeywordsAssessor()
	}

	/**
	 * Sets a custom cornerstone related keyword assessor class.
	 *
	 * @param {CornerstoneRelatedKeywordAssessor}   CornerstoneRelatedKeywordAssessorClass  A cornerstone related keyword assessor class.
	 * @param {string}  customAnalysisType                      The type of analysis.
	 * @param {Object}  customAssessorOptions                   The options to use.
	 *
	 * @returns {void}
	 */
	setCustomCornerstoneRelatedKeywordAssessorClass (CornerstoneRelatedKeywordAssessorClass, customAnalysisType, customAssessorOptions) {
		this._CustomCornerstoneRelatedKeywordAssessorClasses[customAnalysisType] = CornerstoneRelatedKeywordAssessorClass
		this._CustomCornerstoneRelatedKeywordAssessorOptions[customAnalysisType] = customAssessorOptions
		this._relatedKeywordAssessor = this.createRelatedKeywordsAssessor()
	}

	/**
	 * Registers this web worker with the scope passed to its constructor.
	 *
	 * @returns {void}
	 */
	register () {
		this._scope.onmessage = this.handleMessage
		this._scope.analysisWorker = this
	}

	/**
	 * Receives the post message and determines the action.
	 *
	 * See: https://developer.mozilla.org/en-US/docs/Web/API/Worker/onmessage
	 *
	 * @param {MessageEvent} event              The post message event.
	 * @param {Object}       event.data         The data object.
	 * @param {string}       event.data.type    The action type.
	 * @param {string}       event.data.id      The request id.
	 * @param {string}       event.data.payload The payload of the action.
	 *
	 * @returns {void}
	 */
	handleMessage ({ data: { type, id, payload } }) {
		payload = Transporter.parse(payload)

		switch (type) {
			case 'initialize':
				this.initialize(id, payload)
				this._scheduler.startPolling()
				break
			case 'analyze':
				this._scheduler.schedule({
					id,
					execute : this.analyze,
					done    : this.analyzeDone,
					data    : payload,
					type    : type
				})
				break
			case 'loadScript':
				this._scheduler.schedule({
					id,
					execute : this.loadScript,
					done    : this.loadScriptDone,
					data    : payload,
					type    : type
				})
				break
			case 'runResearch':
				this._scheduler.schedule({
					id,
					execute : this.runResearch,
					done    : this.runResearchDone,
					data    : payload
				})
				break
			case 'customMessage': {
				const name = payload.name
				if (name && this._registeredMessageHandlers[name]) {
					this._scheduler.schedule({
						id,
						execute : this.customMessage,
						done    : this.customMessageDone,
						data    : payload,
						type    : type
					})
					break
				}
				this.customMessageDone(id, { error: new Error('No message handler registered for messages with name: ' + name) })
				break
			}
			case 'spellChecker:suggest':
				this.sendSpellingSuggestions(id, payload)
				break
			case 'spellChecker:check':
				this.sendSpellingCheck(id, payload)
				break
			case 'spellChecker:addSafeWord':
				this.addSafeWord(id, payload)
				break
			case 'spellChecker:removeSafeWord':
				this.removeSafeWord(id, payload)
				break
			case 'spellChecker:setSafeWordMatchCase':
				this.setSafeWordMatchCase(id, payload)
				break
			case 'clearCaches':
				this.clearCaches(id)
				break
			case 'getCacheStats':
				this.sendCacheStats(id)
				break
			default:
				console.warn('AnalysisWebWorker unrecognized action:', type)
		}
	}

	/**
	 * Initializes the appropriate content assessor.
	 *
	 * @returns {ContentAssessor|null} The chosen content assessor.
	 */
	createContentAssessor () {
		const {
			contentAnalysisActive,
			useCornerstone,
			customAnalysisType
		} = this._configuration

		if (false === contentAnalysisActive) {
			return null
		}

		let assessor

		if (true === useCornerstone) {
			/*
			 * Use a custom cornerstone content assessor if available,
			 * otherwise set the default cornerstone content assessor.
			 */
			assessor = this._CustomCornerstoneContentAssessorClasses[customAnalysisType]
				? new this._CustomCornerstoneContentAssessorClasses[customAnalysisType](
					this._researcher,
					this._CustomCornerstoneContentAssessorOptions[customAnalysisType])
				: new CornerstoneContentAssessor(this._researcher)

			// Add the readability assessment for cornerstone content to the cornerstone content assessor.
			this._registeredAssessments.forEach(({ name, assessment, type }) => {
				if (isUndefined(assessor.getAssessment(name)) && 'cornerstoneReadability' === type) {
					assessor.addAssessment(name, assessment)
				}
			})
		} else {
			/*
			 * For non-cornerstone content, use a custom SEO assessor if available,
	         * otherwise use the default SEO assessor.
			 */
			assessor = this._CustomContentAssessorClasses[customAnalysisType]
				? new this._CustomContentAssessorClasses[customAnalysisType](
					this._researcher,
					this._CustomContentAssessorOptions[customAnalysisType])
				: new ContentAssessor(this._researcher)

			// Add the readability assessment for regular content to the regular content assessor.
			this._registeredAssessments.forEach(({ name, assessment, type }) => {
				if (isUndefined(assessor.getAssessment(name)) && 'readability' === type) {
					assessor.addAssessment(name, assessment)
				}
			})
		}

		// A term is a single short description, so the readability assessments either pass
		// unconditionally or read as noise — which is why the Readability tab is hidden for terms.
		// Leaving them running would still persist their results into the stored analysis. Spelling
		// is kept: it rides on this assessor but has its own tab, which terms do show.
		if (this.isTaxonomyAnalysis()) {
			assessor.getAvailableAssessments()
				.map(assessment => assessment?.identifier)
				.filter(identifier => identifier && SPELLING_IDENTIFIER !== identifier)
				.forEach(identifier => assessor.removeAssessment(identifier))
		}

		return assessor
	}

	/**
	 * Returns whether the current configuration analyses a term.
	 *
	 * NOTE: Read off the configuration rather than the built SEO assessor, because the content
	 * assessor can be (re)created before it. A term reaches a collection assessor through
	 * `customAnalysisType` alone, so the flag on its own is not enough.
	 *
	 * @returns {boolean} Whether a term is being analysed.
	 */
	isTaxonomyAnalysis () {
		return true === this._configuration.useTaxonomy ||
			'collectionPage' === this._configuration.customAnalysisType
	}

	/**
	 * Initializes the appropriate SEO assessor.
	 *
	 * @returns {SEOAssessor|null} The chosen SEO assessor.
	 */
	createSEOAssessor () {
		const {
			keywordAnalysisActive,
			useCornerstone,
			useTaxonomy,
			customAnalysisType
		} = this._configuration

		if (false === keywordAnalysisActive) {
			return null
		}

		let assessor

		if (true === useTaxonomy) {
			/*
			 * A term can still carry a custom analysis type — `product_cat` and `product_tag`
			 * resolve to `collectionPage`. Prefer that over the taxonomy default, otherwise
			 * enabling `useTaxonomy` would silently bypass the collection assessors.
			 */
			const CustomTaxonomyAssessor = true === useCornerstone
				? this._CustomCornerstoneSEOAssessorClasses[customAnalysisType]
				: this._CustomSEOAssessorClasses[customAnalysisType]
			const customTaxonomyOptions = true === useCornerstone
				? this._CustomCornerstoneSEOAssessorOptions[customAnalysisType]
				: this._CustomSEOAssessorOptions[customAnalysisType]

			assessor = CustomTaxonomyAssessor
				? new CustomTaxonomyAssessor(this._researcher, customTaxonomyOptions)
				: new TaxonomyAssessor(this._researcher)
		} else {
			// Set cornerstone SEO assessor for cornerstone content.
			if (true === useCornerstone) {
				// Use a custom cornerstone SEO assessor if available, otherwise set the default cornerstone SEO assessor.
				assessor = this._CustomCornerstoneSEOAssessorClasses[customAnalysisType]
					? new this._CustomCornerstoneSEOAssessorClasses[customAnalysisType](
						this._researcher,
						this._CustomCornerstoneSEOAssessorOptions[customAnalysisType])
					: new CornerstoneSEOAssessor(this._researcher)
			} else {
				/*
				 * For non-cornerstone content, use a custom SEO assessor if available,
				 * otherwise use the default SEO assessor.
				 */
				assessor = this._CustomSEOAssessorClasses[customAnalysisType]
					? new this._CustomSEOAssessorClasses[customAnalysisType](
						this._researcher,
						this._CustomSEOAssessorOptions[customAnalysisType])
					: new SEOAssessor(this._researcher)
			}
		}

		this._registeredAssessments.forEach(({ name, assessment, type }) => {
			if (isUndefined(assessor.getAssessment(name)) && 'seo' === type) {
				assessor.addAssessment(name, assessment)
			}
		})

		if (TAXONOMY_ASSESSOR_TYPES.includes(assessor.type)) {
			TAXONOMY_EXCLUDED_ASSESSMENTS.forEach(identifier => assessor.removeAssessment(identifier))
		}

		this.stampContentType(assessor)

		return assessor
	}

	/**
	 * Stamps the assessor's type onto any assessment that doesn't carry one.
	 *
	 * Assessments built by the assessor receive it through their own config, but ones registered
	 * dynamically never see the assessor's options — and result copy reads it to pick between
	 * "post" and "category".
	 *
	 *
	 * @param {Assessor} assessor The assessor to stamp.
	 * @returns {void}
	 */
	stampContentType (assessor) {
		if (!TAXONOMY_ASSESSOR_TYPES.includes(assessor?.type)) {
			return
		}

		const contentNouns = this._configuration.contentNouns

		assessor.getAvailableAssessments().forEach(assessment => {
			if (!assessment._config) {
				return
			}

			if (!assessment._config.customContentType) {
				assessment._config.customContentType = assessor.type
			}

			if (contentNouns) {
				assessment._config.contentNouns = contentNouns
			}
		})
	}

	/**
	 * Returns whether an assessment is excluded for terms.
	 *
	 * NOTE: Registered assessments are added to a live assessor after it is built, so filtering
	 * only inside createSEOAssessor() would miss them.
	 *
	 * @param {Object} assessment The assessment to check.
	 * @returns {boolean} Whether the assessment is excluded for terms.
	 */
	isExcludedForTaxonomy (assessment) {
		return TAXONOMY_ASSESSOR_TYPES.includes(this._seoAssessor?.type) &&
			TAXONOMY_EXCLUDED_ASSESSMENTS.includes(assessment?.identifier)
	}

	/**
	 * Returns whether a readability assessment is excluded for terms.
	 *
	 * NOTE: Registered assessments are added to a live content assessor after it is built, so
	 * filtering only inside createContentAssessor() would miss them.
	 *
	 * @param {Object} assessment The assessment to check.
	 * @returns {boolean} Whether the assessment is excluded for terms.
	 */
	isReadabilityExcludedForTaxonomy (assessment) {
		return this.isTaxonomyAnalysis() && SPELLING_IDENTIFIER !== assessment?.identifier
	}

	/**
	 * Initializes the appropriate SEO assessor for related keywords.
	 *
	 * @returns {RelatedKeywordAssessor|null} The chosen related keyword assessor.
	 */
	createRelatedKeywordsAssessor () {
		const {
			keywordAnalysisActive,
			useCornerstone,
			useTaxonomy,
			customAnalysisType
		} = this._configuration

		if (false === keywordAnalysisActive) {
			return null
		}

		let assessor

		if (true === useTaxonomy) {
			// As in createSEOAssessor: a collection term keeps its custom related-keyword assessor.
			const CustomTaxonomyAssessor = true === useCornerstone
				? this._CustomCornerstoneRelatedKeywordAssessorClasses[customAnalysisType]
				: this._CustomRelatedKeywordAssessorClasses[customAnalysisType]
			const customTaxonomyOptions = true === useCornerstone
				? this._CustomCornerstoneRelatedKeywordAssessorOptions[customAnalysisType]
				: this._CustomRelatedKeywordAssessorOptions[customAnalysisType]

			assessor = CustomTaxonomyAssessor
				? new CustomTaxonomyAssessor(this._researcher, customTaxonomyOptions)
				: new RelatedKeywordTaxonomyAssessor(this._researcher)
		} else {
			// Set cornerstone related keyword assessor for cornerstone content.
			if (true === useCornerstone) {
				// Use a custom related keyword assessor if available, otherwise use the default related keyword assessor.
				assessor = this._CustomCornerstoneRelatedKeywordAssessorClasses[customAnalysisType]
					? new this._CustomCornerstoneRelatedKeywordAssessorClasses[customAnalysisType](
						this._researcher,
						this._CustomCornerstoneRelatedKeywordAssessorOptions[customAnalysisType])
					: new CornerstoneRelatedKeywordAssessor(this._researcher)
			} else {
				/*
				 * For non-cornerstone content, use a custom related keyword assessor if available,
				 * otherwise use the default related keyword assessor.
				 */
				assessor = this._CustomRelatedKeywordAssessorClasses[customAnalysisType]
					? new this._CustomRelatedKeywordAssessorClasses[customAnalysisType](
						this._researcher,
						this._CustomRelatedKeywordAssessorOptions[customAnalysisType])
					: new RelatedKeywordAssessor(this._researcher)
			}
		}

		this._registeredAssessments.forEach(({ name, assessment, type }) => {
			if (isUndefined(assessor.getAssessment(name)) && 'relatedKeyphrase' === type) {
				assessor.addAssessment(name, assessment)
			}
		})

		this.stampContentType(assessor)

		return assessor
	}

	/**
	 * Sends a message.
	 *
	 * @param {string} type      The message type.
	 * @param {number} id        The request id.
	 * @param {Object} [payload] The payload to deliver.
	 *
	 * @returns {void}
	 */
	send (type, id, payload = {}) {
		payload = Transporter.serialize(payload)

		this._scope.postMessage({
			type,
			id,
			payload
		})
	}

	/**
	 * Checks which assessors should update giving a configuration.
	 *
	 * @param {Object} configuration The configuration to check.
	 * @param {ContentAssessor|null} [contentAssessor=null] The content assessor.
	 * @param {SEOAssessor|null} [seoAssessor=null] The SEO assessor.
	 *
	 * @returns {{seo: boolean, readability: boolean}} Whether each assessor should update.
	 */
	static shouldAssessorsUpdate (
		configuration,
		contentAssessor = null,
		seoAssessor = null
	) {
		const readability = [
			'contentAnalysisActive',
			'useCornerstone',
			// The content assessor drops every readability assessment for a term, so it has to be
			// rebuilt when this flips — otherwise the term keeps a post's readability assessments.
			'useTaxonomy',
			'locale',
			'translations',
			'customAnalysisType'
		]
		const seo = [
			'keywordAnalysisActive',
			'useCornerstone',
			'useTaxonomy',
			'locale',
			'translations',
			'researchData',
			'customAnalysisType'
		]

		const configurationKeys = Object.keys(configuration)

		return {
			readability : isNull(contentAssessor) || includesAny(configurationKeys, readability),
			seo         : isNull(seoAssessor) || includesAny(configurationKeys, seo)
		}
	}

	/**
	 * Configures the analysis worker.
	 *
	 * @param {number}   id                                     The request id.
	 * @param {Object}   configuration                          The configuration object.
	 * @param {boolean}  [configuration.contentAnalysisActive]  Whether the content analysis is active.
	 * @param {boolean}  [configuration.keywordAnalysisActive]  Whether the keyword analysis is active.
	 * @param {boolean}  [configuration.useCornerstone]         Whether the paper is cornerstone or not.
	 * @param {boolean}  [configuration.useTaxonomy]            Whether the taxonomy assessor should be used.
	 * @param {string}   [configuration.locale]                 The locale used in the seo assessor.
	 * @param {Object}   [configuration.translations]           The translation strings.
	 * @param {Object}   [configuration.researchData]           Extra research data.
	 * @param {Object}   [configuration.defaultQueryParams]     The default query params for the Shortlinker.
	 * @param {string}   [configuration.logLevel]               Log level, see: https://github.com/pimterry/loglevel#documentation
	 *
	 * @returns {void}
	 */
	initialize (id, configuration) {
		const update = AnalysisWebWorker.shouldAssessorsUpdate(
			configuration,
			this._contentAssessor,
			this._seoAssessor
		)

		if (has(configuration, 'translations')) {
			Object.values(configuration.translations).forEach(translation => {
				// Don't proceed if translation object is null or otherwise falsy.
				if (translation) {
					const { domain, locale_data: localeData } = translation
					setLocaleData(localeData[domain], domain)
				}
			})
		}

		if (has(configuration, 'researchData')) {
			forEach(configuration.researchData, (data, research) => {
				this._researcher.addResearchData(research, data)
			})
			delete configuration.researchData
		}

		if (has(configuration, 'defaultQueryParams')) {
			configureShortlinker({ params: configuration.defaultQueryParams })
			delete configuration.defaultQueryParams
		}

		if (has(configuration, 'logLevel')) {
			delete configuration.logLevel
		}

		this._configuration = merge(this._configuration, configuration)

		// Initialize spell checker dictionary (fire-and-forget).
		// Derives the 2-letter code from the analysis locale for the dictionary folder path.
		// Path: {dictionaryBaseUrl}/{code}/{locale}.aff (e.g. .../en/en_US.aff)
		if (has(configuration, 'spellChecker') && configuration.spellChecker.settingsUrl) {
			spellChecker.setSettingsUrl(configuration.spellChecker.settingsUrl)
		}

		if (has(configuration, 'spellChecker') && configuration.spellChecker.enabled && configuration.spellChecker.dictionaryBaseUrl) {
			const spellLocale = this._configuration.locale || 'en_US'
			const spellLanguage = getLanguage(spellLocale)

			if (getLanguagesWithSpellChecker().includes(spellLanguage)) {
				// Capture the init promise so `analyze()` can await it before
				// running assessments. Without this gate, the first analysis
				// produces a "spelling=0, dictionary not available" placeholder
				// (because Hunspell isn't loaded yet) and the score jumps when
				// the second analysis lands a moment later — visible to the
				// user as 52 → 59 → 70 right after a locale switch.
				this._spellCheckerInitPromise = spellChecker.initialize(
					spellLanguage,
					spellLocale,
					configuration.spellChecker.dictionaryBaseUrl,
					configuration.spellChecker.safeWordsUrl || '',
					configuration.spellChecker.safeWordsMetaUrl || ''
				).then(() => {
					if (spellChecker.isReady()) {
						// Clear cached results so the next analysis includes spelling.
						this.clearCache()
						// Notify the main thread; kept for the rare race where an
						// analyze() somehow slipped past the await (e.g. cached
						// `_paper` reusing pre-init results).
						this.send('spellChecker:ready', 0)
					}
				}).catch(() => {
					// Swallow — the spelling assessment falls back to its
					// "dictionary not available" branch and other assessments
					// still produce a sensible score.
				})
			} else {
				this._spellCheckerInitPromise = null
			}
		}

		if (update.readability) {
			this._contentAssessor = this.createContentAssessor()
		}

		if (update.seo) {
			this._seoAssessor = this.createSEOAssessor()
			this._relatedKeywordAssessor = this.createRelatedKeywordsAssessor()
		}

		// Reset the paper in order to not use the cached results on analyze.
		this.clearCache()

		this.send('initialize:done', id)
	}

	/**
	 * Registers a custom assessor.
	 *
	 * @param {string} name The name of the assessor.
	 * @param {Function} AssessorClass The assessor class to instantiate.
	 * @param {Function} shouldUpdate Function that checks whether the assessor should update.
	 *
	 * @returns {void}
	 */
	registerAssessor (name, AssessorClass, shouldUpdate) {
		const assessor = new AssessorClass(this._researcher)
		this.additionalAssessors[name] = { assessor, shouldUpdate }
	}

	/**
	 * Register an assessment for a specific plugin.
	 *
	 * @param {string}   name       The name of the assessment.
	 * @param {Assessment} assessment The assessment to add.
	 * @param {string}   pluginName The name of the plugin associated with the assessment.
	 * @param {string}   type       The type of the assessment. The default type is "seo".
	 *
	 * @returns {boolean} Whether registering the assessment was successful.
	 */
	registerAssessment (name, assessment, pluginName, type = 'seo') {
		const { useCornerstone } = this._configuration

		if (!isString(name)) {
			throw new InvalidTypeError('Failed to register assessment for plugin ' + pluginName + '. Expected parameter `name` to be a string.')
		}

		if (!isObject(assessment)) {
			throw new InvalidTypeError('Failed to register assessment for plugin ' + pluginName +
										'. Expected parameter `assessment` to be a function.')
		}

		if (!isString(pluginName)) {
			throw new InvalidTypeError('Failed to register assessment for plugin ' + pluginName +
										'. Expected parameter `pluginName` to be a string.')
		}

		// Prefix the name with the pluginName so the test name is always unique.
		const combinedName = pluginName + '-' + name

		if (null !== this._seoAssessor && 'seo' === type && !this.isExcludedForTaxonomy(assessment)) {
			this._seoAssessor.addAssessment(combinedName, assessment)
		}
		if (null !== this._contentAssessor && 'readability' === type && !this.isReadabilityExcludedForTaxonomy(assessment)) {
			this._contentAssessor.addAssessment(combinedName, assessment)
		}
		if (null !== this._contentAssessor && 'cornerstoneReadability' === type && useCornerstone && !this.isReadabilityExcludedForTaxonomy(assessment)) {
			this._contentAssessor.addAssessment(combinedName, assessment)
		}
		if (null !== this._relatedKeywordAssessor && 'relatedKeyphrase' === type) {
			this._relatedKeywordAssessor.addAssessment(combinedName, assessment)
		}
		// Keyed `name` because that is what the four createXAssessor methods destructure when they
		// re-apply these to a freshly built assessor.
		this._registeredAssessments.push({ name: combinedName, assessment, type })

		this.refreshAssessment(name, pluginName)

		return true
	}

	/**
	 * Register a message handler for a specific plugin.
	 *
	 * @param {string}   name       The name of the message handler.
	 * @param {Function} handler    The function to run as a message handler.
	 * @param {string}   pluginName The name of the plugin associated with the message handler.
	 *
	 * @returns {boolean} Whether registering the message handler was successful.
	 */
	registerMessageHandler (name, handler, pluginName) {
		if (!isString(name)) {
			throw new InvalidTypeError('Failed to register handler for plugin ' + pluginName + '. Expected parameter `name` to be a string.')
		}

		if (!isFunction(handler)) {
			throw new InvalidTypeError('Failed to register handler for plugin ' + pluginName +
										'. Expected parameter `handler` to be a function.')
		}

		if (!isString(pluginName)) {
			throw new InvalidTypeError('Failed to register handler for plugin ' + pluginName +
										'. Expected parameter `pluginName` to be a string.')
		}

		// Prefix the name with the pluginName so the test name is always unique.
		name = pluginName + '-' + name

		this._registeredMessageHandlers[name] = handler

		return true
	}

	/**
	 * Refreshes an assessment in the analysis.
	 *
	 * Custom assessments can use this to mark their assessment as needing a
	 * refresh.
	 *
	 * @param {string} name The name of the assessment.
	 * @param {string} pluginName The name of the plugin associated with the assessment.
	 *
	 * @returns {boolean} Whether refreshing the assessment was successful.
	 */
	refreshAssessment (name, pluginName) {
		if (!isString(name)) {
			throw new InvalidTypeError('Failed to refresh assessment for plugin ' + pluginName + '. Expected parameter `name` to be a string.')
		}

		if (!isString(pluginName)) {
			throw new InvalidTypeError('Failed to refresh assessment for plugin ' + pluginName +
										'. Expected parameter `pluginName` to be a string.')
		}

		this.clearCache()

		return true
	}

	/**
	 * Clears the worker cache to force a new analysis.
	 *
	 * @returns {void}
	 */
	clearCache () {
		this._paper = null
	}

	/**
	 * Changes the locale in the configuration.
	 *
	 * If the locale is different:
	 * - Update the configuration locale.
	 * - Create the content assessor.
	 *
	 * @param {string} locale The locale to set.
	 *
	 * @returns {void}
	 */
	setLocale (locale) {
		if (this._configuration.locale === locale) {
			return
		}
		this._configuration.locale = locale
		this._contentAssessor = this.createContentAssessor()
	}

	/**
	 * Checks if the paper contains changes that are used for readability.
	 *
	 * @param {Paper} paper The paper to check against the cached paper.
	 *
	 * @returns {boolean} True if there are changes detected.
	 */
	shouldReadabilityUpdate (paper) {
		if (null === this._paper) {
			return true
		}

		if (this._paper.getText() !== paper.getText()) {
			return true
		}

		if (this._paper.getKeyword() !== paper.getKeyword()) {
			return true
		}

		// Perform deep comparison between the list of Gutenberg blocks as we want to update the readability analysis
		// if the client IDs of the blocks inside `wpBlocks` change.
		if (!isEqual(this._paper._attributes.wpBlocks, paper._attributes.wpBlocks)) {
			return true
		}

		return this._paper.getLocale() !== paper.getLocale()
	}

	/**
	 * Checks if the related keyword contains changes that are used for seo.
	 *
	 * @param {string} key                     The identifier of the related keyword.
	 * @param {Object} relatedKeyword          The related keyword object.
	 * @param {string} relatedKeyword.keyword  The keyword.
	 * @param {string} relatedKeyword.synonyms The synonyms.
	 *
	 * @returns {boolean} True if there are changes detected.
	 */
	shouldSeoUpdate (key, { keyword, synonyms }) {
		if (isUndefined(this._relatedKeywords[key])) {
			return true
		}

		if (this._relatedKeywords[key].keyword !== keyword) {
			return true
		}

		return this._relatedKeywords[key].synonyms !== synonyms
	}

	/**
	 * Checks whether the additional assessor should be updated.
	 *
	 * @param {Paper} paper The paper to check.
	 * @returns {Object} An object containing the information whether each additional assessor needs to be updated.
	 */
	shouldAdditionalAssessorsUpdate (paper) {
		const shouldCustomAssessorsUpdate = {}
		Object.keys(this.additionalAssessors).forEach(
			assessorName => {
				shouldCustomAssessorsUpdate[assessorName] = this.additionalAssessors[assessorName].shouldUpdate(this._paper, paper)
			}
		)
		return shouldCustomAssessorsUpdate
	}

	/**
	 * Updates the results for the additional assessor.
	 *
	 * @param {Object} shouldCustomAssessorsUpdate Whether the results of the additional assessor should be updated.
	 * @returns {void}
	 */
	updateAdditionalAssessors (shouldCustomAssessorsUpdate) {
		Object.keys(this.additionalAssessors).forEach(
			assessorName => {
				const { assessor } = this.additionalAssessors[assessorName]
				if (!this._results[assessorName] || shouldCustomAssessorsUpdate[assessorName]) {
					assessor.assess(this._paper)
					this._results[assessorName] = {
						results : assessor.results,
						score   : assessor.calculateOverallScore()
					}
				}
			}
		)
	}

	/**
	 * Runs analyses on a paper.
	 *
	 * The paper includes the keyword and synonyms data. However, this is
	 * possibly just one instance of these. From here we are going to split up
	 * this data and keep track of the different sets of keyword-synonyms and
	 * their results.
	*
	 * @param {number} _id          The request id.
	 * @param {Object} payload      The payload object.
	 * @param {Paper} payload.paper The paper to analyze.
	 *
	 * @returns {Object} The result, may not contain readability or seo.
	 */
	async analyze (_id, { paper }) {
		// Convert plain object to Paper instance if needed
		if (!(paper instanceof Paper)) {
			paper = Paper.parse(paper)
		}

		// Wait for the Hunspell dictionary to finish loading inside the worker
		// so the first analysis already includes real spelling results. Without
		// this gate, the SpellingCheckerAssessment returns score=0 on the
		// initial pass and the total score jumps once the dictionary lands.
		if (this._spellCheckerInitPromise) {
			await this._spellCheckerInitPromise
		}

		const paperHasChanges = null === this._paper || !this._paper.equals(paper)
		const shouldReadabilityUpdate = this.shouldReadabilityUpdate(paper)
		const shouldCustomAssessorsUpdate = this.shouldAdditionalAssessorsUpdate(paper)

		// Only set the paper and build the tree if the paper has any changes.
		if (paperHasChanges) {
			this._paper = paper
			this._researcher.setPaper(this._paper)

			const languageProcessor = new LanguageProcessor(this._researcher)
			const shortcodes = this._paper._attributes?.shortcodes
			this._paper.setTree(build(this._paper, languageProcessor, shortcodes))

			// Update the configuration locale to the paper locale.
			this.setLocale(this._paper.getLocale())
		}

		if (this._configuration.keywordAnalysisActive && this._seoAssessor) {
			// Only assess the focus keyphrase if the paper has any changes.
			if (paperHasChanges) {
				// Assess the SEO of the content regarding the main keyphrase.
				this._results.seo.focusKeyword = await this.assess(this._paper, this._seoAssessor)
			}

			// Only assess the additional keywords when they are available.
			if (this._paper.hasAdditionalKeywords()) {
				// Get the related keyphrase keys (one for each keyphrase).
				const additionalKeywords = this._paper.getAdditionalKeywords()

				// Analyze the SEO for each additional keyword and wait for the results.
				this._results.seo.additionalKeywords = await this.assessRelatedKeywords(this._paper, additionalKeywords)
			}
		}

		if (this._configuration.contentAnalysisActive && this._contentAssessor && shouldReadabilityUpdate) {
			// Set the locale (we are more lenient for languages that have full analysis support).
			this._contentAssessor.getScoreAggregator().setLocale(this._configuration.locale)
			this._results.readability = await this.assess(this._paper, this._contentAssessor)
		}

		this.updateAdditionalAssessors(shouldCustomAssessorsUpdate)

		return this._results
	}

	/**
	 * Assesses a given paper
	 * using an original Assessor (that works on a string representation of the text).
	 *
	 * The results of both analyses are combined using the given score aggregator.
	 *
	 * @param {Paper}                      paper The paper to analyze.
	 * @param {Assessor}                   assessor     The original assessor.
	 *
	 * @returns {Promise<{score: number, results: AssessmentResult[]}>} The analysis results.
	 */
	async assess (paper, assessor) {
		/*
		 * Assess the paper using the original assessor.
		 */
		assessor.assess(paper)
		const results = assessor.results

		// Filter results to only include those with both text and title
		const validResults = results.filter(result => {
			return result.hasText() && result.hasTitle() && result.hasScore()
		})

		// Aggregate the results.
		const score = assessor.getScoreAggregator().aggregate(validResults)

		return {
			results : validResults,
			score   : score
		}
	}

	/**
	 * Assesses the SEO of a paper on the given related keyphrases and their synonyms.
	 *
	 * The old assessor is used and their results are combined.
	 *
	 * @param {Paper}                 paper           The paper to analyze.
	 * @param {Object}                relatedKeywords The related keyphrases to use in the analysis.
	 *
	 * @returns {Promise<[{results: {score: number, results: AssessmentResult[]}, key: string}]>} The results, one for each keyphrase.
	 */
	async assessRelatedKeywords (paper, relatedKeywords) {
		return Promise.all(relatedKeywords.map(relatedKeyword => {
			const { word } = relatedKeyword
			this._relatedKeywords[word] = relatedKeyword

			const relatedPaper = Paper.parse({
				...paper.serialize(),
				keyword  : word,
				synonyms : this._relatedKeywords[word]?.synonyms || ''
			})

			return this.assess(relatedPaper, this._relatedKeywordAssessor).then(
				results => (
					{
						...results,
						word : word
					}
				)
			)
		}))
	}

	/**
	 * Loads a new script from an external source.
	 *
	 * @param {number} _id  The request id.
	 * @param {string} url The url of the script to load;
	 *
	 * @returns {Object} An object containing whether the url was loaded, the url and possibly an error message.
	 */
	loadScript (_id, { url }) {
		if (isUndefined(url)) {
			return { loaded: false, url, message: 'Load Script was called without an URL.' }
		}

		try {
			this._scope.importScripts(url)
		} catch (error) {
			return { loaded: false, url, message: error.message }
		}

		return { loaded: true, url }
	}

	/**
	 * Sends the load script result back.
	 *
	 * @param {number} id     The request id.
	 * @param {Object} result The result.
	 *
	 * @returns {void}
	 */
	loadScriptDone (id, result) {
		if (!result.loaded) {
			this.send('loadScript:failed', id, result)
			return
		}

		this.send('loadScript:done', id, result)
	}

	/**
	 * Sends the analyze result back.
	 *
	 * @param {number} id     The request id.
	 * @param {Object} result The result.
	 *
	 * @returns {void}
	 */
	analyzeDone (id, result) {
		if (result.error) {
			this.send('analyze:failed', id, result)
			return
		}
		this.send('analyze:done', id, result)
	}

	/**
	 * Clears all caches in the worker.
	 * Call this when navigating between posts or when memory needs to be freed.
	 *
	 * @since 5.0.0
	 * @param {number} id The request id.
	 * @returns {void}
	 */
	clearCaches (id) {
		try {
			// Clear all registered caches via CacheManager.
			clearAllCaches()

			// Also clear the tree cache explicitly.
			clearTreeCache()

			// Clear assessor result caches.
			if (this._contentAssessor) {
				this._contentAssessor.clearCache()
			}
			if (this._seoAssessor) {
				this._seoAssessor.clearCache()
			}
			if (this._relatedKeywordAssessor) {
				this._relatedKeywordAssessor.clearCache()
			}

			this.send('clearCaches:done', id, { success: true })
		} catch (error) {
			this.send('clearCaches:failed', id, { error: error.message })
		}
	}

	/**
	 * Returns spelling suggestions for a word via the spell checker singleton.
	 *
	 * @since 5.0.0
	 *
	 * @param {number} id                The request id.
	 * @param {Object} payload           The request payload.
	 * @param {string} payload.word      The misspelled word.
	 * @returns {void}
	 */
	sendSpellingSuggestions (id, { word }) {
		const suggestions = spellChecker.isReady() ? spellChecker.suggest(word) : []
		this.send('spellChecker:suggest:done', id, { suggestions })
	}

	/**
	 * Reports whether a single word is spelled correctly per the live spell checker.
	 *
	 * Used by the AI spelling pass to reject a "correction" that is itself not a
	 * real word before applying it. Reports valid when the checker isn't ready so
	 * the guard fails open and never blocks the pass.
	 *
	 * @since 5.0.0
	 *
	 * @param {number} id           The request id.
	 * @param {Object} payload      The request payload.
	 * @param {string} payload.word The word to check.
	 * @returns {void}
	 */
	sendSpellingCheck (id, { word }) {
		const valid = spellChecker.isReady() ? spellChecker.check(word) : true
		this.send('spellChecker:check:done', id, { valid })
	}

	/**
	 * Adds a word to the live Hunspell instance (post-persist) and triggers re-analysis.
	 *
	 * The REST endpoint has already persisted the word to safe-words.dic on the
	 * server — this only updates the in-memory dictionary so the highlight
	 * disappears without a page reload.
	 *
	 * @since 5.0.0
	 *
	 * @param {number} id           The request id.
	 * @param {Object} payload      The request payload.
	 * @param {string} payload.word The word to add.
	 * @returns {void}
	 */
	addSafeWord (id, { word, matchCase = false }) {
		if (!spellChecker.isReady() || !word) {
			this.send('spellChecker:addSafeWord:done', id, { success: false })
			return
		}

		const added = matchCase
			? spellChecker.addStrictSafeWord(word)
			: spellChecker.addSafeWord(word)

		if (added) {
			this._clearSpellingCaches()
		}

		this.send('spellChecker:addSafeWord:done', id, { success: added })
	}

	/**
	 * Toggles the match-case state of a safe word in the live instance after the
	 * REST endpoint has persisted the change. Moves the word between the
	 * case-insensitive Hunspell store and the exact-case strict set.
	 *
	 * @since 5.0.0
	 *
	 * @param {number}  id                The request id.
	 * @param {Object}  payload           The request payload.
	 * @param {string}  payload.word      The word to update.
	 * @param {boolean} payload.matchCase The desired match-case state.
	 * @returns {void}
	 */
	setSafeWordMatchCase (id, { word, matchCase = false }) {
		if (!spellChecker.isReady() || !word) {
			this.send('spellChecker:setSafeWordMatchCase:done', id, { success: false })
			return
		}

		if (matchCase) {
			spellChecker.removeSafeWord(word)
			spellChecker.addStrictSafeWord(word)
		} else {
			spellChecker.removeStrictSafeWord(word)
			spellChecker.addSafeWord(word)
		}

		this._clearSpellingCaches()

		this.send('spellChecker:setSafeWordMatchCase:done', id, { success: true })
	}

	/**
	 * Clears every cache that could otherwise return pre-change spelling results.
	 *
	 * Assessor result caches are keyed by paper text + keyword + title + etc. —
	 * not by spell-checker state — so a safe-word change must invalidate them all
	 * for the next analysis to recompute spelling.
	 *
	 * @since 5.0.0
	 *
	 * @returns {void}
	 */
	_clearSpellingCaches () {
		this.clearCache()

		clearAllCaches()
		clearTreeCache()

		if (this._contentAssessor) {
			this._contentAssessor.clearCache()
		}

		if (this._seoAssessor) {
			this._seoAssessor.clearCache()
		}

		if (this._relatedKeywordAssessor) {
			this._relatedKeywordAssessor.clearCache()
		}
	}

	/**
	 * Removes a word from the live Hunspell instance after the REST endpoint
	 * has already removed it from safe-words.dic. Clears assessor caches so
	 * the next analysis flags the word again.
	 *
	 * @since 5.0.0
	 *
	 * @param {number} id           The request id.
	 * @param {Object} payload      The request payload.
	 * @param {string} payload.word The word to remove.
	 * @returns {void}
	 */
	removeSafeWord (id, { word }) {
		if (!spellChecker.isReady() || !word) {
			this.send('spellChecker:removeSafeWord:done', id, { success: false })
			return
		}

		const removedFromHunspell = spellChecker.removeSafeWord(word)
		const removedFromStrict   = spellChecker.removeStrictSafeWord(word)
		const removed             = removedFromHunspell || removedFromStrict

		if (removed) {
			this._clearSpellingCaches()
		}

		this.send('spellChecker:removeSafeWord:done', id, { success: removed })
	}

	/**
	 * Sends cache statistics for debugging.
	 *
	 * @since 5.0.0
	 * @param {number} id The request id.
	 * @returns {void}
	 */
	sendCacheStats (id) {
		try {
			const stats = getCacheStats()
			this.send('getCacheStats:done', id, { stats })
		} catch (error) {
			this.send('getCacheStats:failed', id, { error: error.message })
		}
	}

	/**
	 * Handle a custom message using the registered handler.
	 *
	 * @param {number} _id   The request id.
	 * @param {string} name The name of the message.
	 * @param {Object} data The data of the message.
	 *
	 * @returns {Object} An object containing either success and data or an error.
	 */
	customMessage (_id, { name, data }) {
		try {
			return {
				success : true,
				data    : this._registeredMessageHandlers[name](data)
			}
		} catch (error) {
			return { error }
		}
	}

	/**
	 * Send the result of a custom message back.
	 *
	 * @param {number} id     The request id.
	 * @param {Object} result The result.
	 *
	 * @returns {void}
	 */
	customMessageDone (id, result) {
		if (result.success) {
			this.send('customMessage:done', id, result.data)
			return
		}
		this.send('customMessage:failed', result.error)
	}

	/**
	 * Registers custom research to the researcher.
	 *
	 * @param {string} name         The name of the research.
	 * @param {Function} research   The research function to add.
	 *
	 * @returns {void}
	 */
	registerResearch (name, research) {
		if (!isString(name)) {
			throw new InvalidTypeError('Failed to register the custom research. Expected parameter `name` to be a string.')
		}

		if (!isFunction(research)) {
			throw new InvalidTypeError('Failed to register the custom research. Expected parameter `research` to be a function.')
		}

		const researcher = this._researcher

		if (!researcher.hasResearch(name)) {
			researcher.addResearch(name, research)
		}
	}

	/**
	 * Runs the specified research in the worker. Optionally pass a paper.
	 *
	 * @param {number} _id     The request id.
	 * @param {string} name   The name of the research to run.
	 * @param {Paper} [paper] The paper to run the research on if it shouldn't
	 *                        be run on the latest paper.
	 *
	 * @returns {Object} The result of the research.
	 */
	runResearch (_id, { name, paper = null }) { // eslint-disable-line no-unused-vars
		// Save morphology data if it is available in the current researcher.
		const morphologyData = this._researcher.getData('morphology')

		const researcher = this._researcher
		// When a specific paper is passed we create a temporary new researcher.
		if (null !== paper) {
			researcher.setPaper(paper)
			researcher.addResearchData('morphology', morphologyData)

			// Build and set the tree if it's not been set before.
			if (null === paper.getTree()) {
				const languageProcessor = new LanguageProcessor(researcher)
				const shortcodes = paper._attributes?.shortcodes
				paper.setTree(build(paper, languageProcessor, shortcodes))
			}
		}

		return researcher.getResearch(name)
	}

	/**
	 * Send the result of a custom message back.
	 *
	 * @param {number} id     The request id.
	 * @param {Object} result The result.
	 *
	 * @returns {void}
	 */
	runResearchDone (id, result) {
		if (result.error) {
			this.send('runResearch:failed', id, result)
			return
		}
		this.send('runResearch:done', id, result)
	}

	/**
	 * Registers a custom helper to the researcher.
	 *
	 * @param {string} name       The name of the helper.
	 * @param {Function} helper   The helper function to add.
	 *
	 * @returns {void}
	 */
	registerHelper (name, helper) {
		if (!isString(name)) {
			throw new InvalidTypeError('Failed to register the custom helper. Expected parameter `name` to be a string.')
		}

		if (!isFunction(helper)) {
			throw new InvalidTypeError('Failed to register the custom helper. Expected parameter `helper` to be a function.')
		}

		const researcher = this._researcher

		if (!researcher.hasHelper(name)) {
			researcher.addHelper(name, helper)
		}
	}

	/**
	 * Registers a configuration to the researcher.
	 *
	 * @param {string}  name                The name of the researcher configuration.
	 * @param {*}       researcherConfig    The researcher configuration to add.
	 *
	 * @returns {void}
	 */
	registerResearcherConfig (name, researcherConfig) {
		if (!isString(name)) {
			throw new InvalidTypeError('Failed to register the custom researcher config. Expected parameter `name` to be a string.')
		}

		if (isUndefined(researcherConfig) || isEmpty(researcherConfig)) {
			throw new MissingArgumentError('Failed to register the custom researcher config. Expected parameter `researcherConfig` to be defined.')
		}
		const researcher = this._researcher

		if (!researcher.hasConfig(name)) {
			researcher.addConfig(name, researcherConfig)
		}
	}
}