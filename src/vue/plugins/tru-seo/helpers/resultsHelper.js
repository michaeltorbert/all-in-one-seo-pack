import { usePostEditorStore } from '@/vue/stores'
import { isBlockEditor } from '@/vue/utils/context'
import { getFocusKeywordResults, getReadabilityResults, getSpellingResults } from '@/app/tru-seo/helpers/resultsFilter'

const SPELLING_IDENTIFIER = 'spellingChecker'

// The overall score is a weighted blend, not a 50/50 SEO/readability average. On-page
// SEO dominates because it's what actually drives ranking; readability is a lighter
// content-quality signal; spelling is a small polish factor.
const SEO_WEIGHT               = 0.75
const READABILITY_WEIGHT       = 0.20
const SPELLING_WEIGHT          = 0.05
// Readability "green" cutoff — matches the readability tab's own green threshold so the
// number the user sees and the number the score uses agree.
const READABILITY_GREEN_SCORE  = 60
// Each misspelled word costs one overall point (SPELLING_WEIGHT * POINTS_PER_MISTAKE = 1),
// capped at the full 5-point spelling weight.
const SPELLING_POINTS_PER_MISTAKE = 20
// Individual assessments score 1-9, the scale SEOScoreAggregator averages over.
const MAX_ITEM_SCORE = 9

function resultIdentifier (result) {
	return result._identifier || result.identifier
}

function resultScore (result) {
	return undefined !== result._score ? result._score : result.score
}

/**
 * Computes the overall 0-100 TruSEO score from the SEO and content analyses.
 *
 * Blend: 75% SEO + 20% readability + 5% spelling. Readability is the fine-grained
 * percentage of the content checks EXCLUDING spelling, and contributes full marks once
 * it reads "green" so minor readability items can't drag down an optimized post. Spelling
 * contributes full marks unless the language has a loaded dictionary (the assessment ran
 * with a score above 0), in which case it loses one point per misspelled word up to five.
 *
 * @since 5.0.0
 *
 * @param {Object} seoAnalysis     The SEO analysis ({ score, results }).
 * @param {Object} contentAnalysis The content/readability analysis ({ score, results }).
 * @returns {number}               The overall score (0-100).
 */
export function calculateOverallScore (seoAnalysis, contentAnalysis) {
	const seoScore       = seoAnalysis?.score || 0
	const contentResults = contentAnalysis?.results || []

	const readabilityResults = contentResults.filter(result => {
		const identifier = resultIdentifier(result)

		return identifier && SPELLING_IDENTIFIER !== identifier && '' !== (result.title ?? '')
	})

	const spellingResult = contentResults.find(result => SPELLING_IDENTIFIER === resultIdentifier(result))

	// Both default to full marks: a content type that produces no readability results (a term, whose
	// description is one short block and whose Readability tab is hidden) must not silently forfeit
	// the 20 points the block is worth.
	let readabilityContribution = 100,
		spellingContribution    = 100

	if (readabilityResults.length) {
		const total          = readabilityResults.reduce((sum, result) => sum + Math.max(0, resultScore(result) || 0), 0)
		const readabilityPct = Math.round((total / (readabilityResults.length * 9)) * 100)
		readabilityContribution = READABILITY_GREEN_SCORE <= readabilityPct ? 100 : readabilityPct
	}

	if (spellingResult && 0 < (resultScore(spellingResult) || 0)) {
		const mistakes = new Set(
			(spellingResult.highlightSentences || [])
				.map(word => String(word).trim().toLowerCase())
				.filter(Boolean)
		).size
		spellingContribution = Math.max(0, 100 - (SPELLING_POINTS_PER_MISTAKE * mistakes))
	}

	const overall = Math.round(
		(SEO_WEIGHT * seoScore) +
		(READABILITY_WEIGHT * readabilityContribution) +
		(SPELLING_WEIGHT * spellingContribution)
	)

	return Math.max(0, overall)
}

/**
 * Aggregates the focus-keyword score from only the focus-keyword checks.
 *
 * Mirrors SEOScoreAggregator's math (sum / (count · 9) · 100) but over just the checks
 * shown in the focus-keyword checklist, so an all-green focus keyword reaches 100 — the
 * full SEO score still folds in the non-keyphrase checks (internal links, meta description
 * length, etc.) that live under Basic SEO.
 *
 * @since 5.0.0
 *
 * @param {Object} items The focus-keyword results keyed by identifier ({ score }).
 * @returns {number}     The focus-keyword score (0-100).
 */
function calculateFocusKeywordScore (items) {
	const results = Object.values(items || {})
	if (!results.length) {
		return 0
	}

	const total = results.reduce((sum, result) => sum + Math.max(0, resultScore(result) || 0), 0)

	return Math.round((total / (results.length * 9)) * 100) || 0
}

/**
 * Transforms raw worker results into structured format for store/database.
 *
 * @since 5.0.0
 *
 * @param {Object} contentAnalysis           The readability analysis results.
 * @param {Object} seoAnalysis               The SEO analysis results.
 * @param {Array}  additionalKeywordsAnalysis The additional keywords analysis results.
 * @returns {Object}                         Transformed results object.
 */
/**
 * Returns the overall-score points a SEO check would add by going from its score to full.
 *
 * NOTE: Mirrors the SEO term of {@see calculateOverallScore} — that block is a flat average
 * over the SEO results, so one check reaching full marks is worth its share of the weight.
 *
 * @since 5.0.0
 *
 * @param {Object} generalResults Identifier-keyed map of every analysis result.
 * @param {number} score          The check's current score.
 * @returns {number}              Whole points gained, 0 when it rounds to less than one.
 */
export function potentialSeoScoreGain (generalResults, score) {
	const results = generalResults || {}
	const excluded = {
		...getReadabilityResults(results),
		...getSpellingResults(results)
	}

	const seoCount = Object.entries(results)
		.filter(([ identifier, result ]) => result?.title && 'number' === typeof result.score && !(identifier in excluded))
		.length

	if (!seoCount) {
		return 0
	}

	const remaining = Math.max(0, MAX_ITEM_SCORE - score)

	return Math.round((SEO_WEIGHT * remaining * 100) / (seoCount * MAX_ITEM_SCORE))
}

export function transformWorkerResults (contentAnalysis, seoAnalysis, additionalKeywordsAnalysis) {
	// Aggregate all results into a Map
	const allResults = new Map()

	// Process SEO analysis results
	seoAnalysis?.results?.forEach((result) => {
		const identifier = result._identifier || result.identifier
		const score = result._score !== undefined ? result._score : result.score

		if (identifier) {
			allResults.set(identifier, {
				score,
				title : result.title,
				text  : result.text
			})
		}
	})

	// Process content/readability analysis results
	contentAnalysis?.results?.forEach((result) => {
		const identifier = result._identifier || result.identifier
		const score = result._score !== undefined ? result._score : result.score

		if (identifier) {
			allResults.set(identifier, {
				score,
				title              : result.title,
				text               : result.text,
				highlightSentences : result.highlightSentences || [],
				marks              : result.marks || []
			})
		}
	})

	// Overall score: 75% SEO / 20% readability / 5% spelling.
	const seoScore = calculateOverallScore(seoAnalysis, contentAnalysis)

	// Build SEO results object
	const seoResults = {
		score   : seoAnalysis.score,
		results : {}
	}

	seoAnalysis?.results?.forEach((result) => {
		const identifier = result._identifier || result.identifier
		const score = result._score !== undefined ? result._score : result.score

		seoResults.results[identifier] = {
			score,
			title : result.title,
			text  : result.text
		}
	})

	// Transform additional keywords
	const additionalKeywordsResults = additionalKeywordsAnalysis?.map((item) => {
		const { word, score, results } = item
		const items = {}

		results?.forEach(result => {
			const identifier = result._identifier || result.identifier
			const scoreTotal = result._score !== undefined ? result._score : result.score

			items[identifier] = {
				score : scoreTotal,
				title : result.title,
				text  : result.text
			}
		})

		return { word, score, items }
	})

	return {
		allResults,
		seoScore                  : Math.max(0, seoScore),
		seoResults,
		additionalKeywordsResults : additionalKeywordsResults || []
	}
}

/**
 * Updates post editor store with analysis results.
 *
 * @since 5.0.0
 *
 * @param {Object} results The transformed analysis results.
 * @returns {void}
 */
export function updateStoreWithResults (results) {
	const postEditorStore = usePostEditorStore()

	// SEO total score
	postEditorStore.currentPost.seo_score = results.seoScore

	// Preserve the current focus keyword word (the column now stores only the string).
	postEditorStore.currentPost.focus_keyword = postEditorStore.truseoData?.focusKeyword || ''

	// All TruSEO analysis results live under `truseo`. highlightSentences/marks are
	// stripped server-side by sanitizeTruseo before persistence.
	const focusKeywordItems = getFocusKeywordResults(results.seoResults?.results || {})
	postEditorStore.currentPost.truseo = {
		focus_keyword : {
			score : calculateFocusKeywordScore(focusKeywordItems),
			items : focusKeywordItems
		},
		general : Object.fromEntries(results.allResults)
	}

	// Additional keywords analysis
	postEditorStore.currentPost.additional_keywords = results.additionalKeywordsResults

	setTruSeoSidebarButtonScore(results.seoScore)
}

function setTruSeoSidebarButtonScore (score) {
	const button      = document.getElementById('aioseo-post-settings-sidebar-button')
	const postScore   = document.getElementById('aioseo-post-score')
	if (!button || !postScore) {
		return
	}

	let className
	if (79 < score) {
		className = 'score-green'
	} else if (49 < score) {
		className = 'score-orange'
	} else {
		className = 'score-red'
	}
	button.className = className
	if (!isBlockEditor()) {
		button.classList.add('aioseo-score-button', 'classic-editor')
		score = `${score}/100`
	}
	postScore.textContent = score
}

/**
 * Builds results object formatted for database saving (used by BatchScanManager).
 *
 * @since 5.0.0
 *
 * @param {Object} contentAnalysis            The readability analysis results.
 * @param {Object} seoAnalysis                The SEO analysis results.
 * @param {Array}  additionalKeywordsAnalysis The additional keywords analysis results.
 * @param {Object} postData                   The post data object.
 * @returns {Object}                          Results formatted for database.
 */
export function buildDatabaseResults (contentAnalysis, seoAnalysis, additionalKeywordsAnalysis, postData) {
	const general = {}
	const results = {
		seo_score : 0,
		truseo    : {
			focus_keyword : null,
			general
		},
		focus_keyword       : '',
		additional_keywords : []
	}

	const seoResultsObject = {}

	// Process SEO analysis
	if (seoAnalysis?.results) {
		seoAnalysis.results.forEach(result => {
			const identifier = result._identifier || result.identifier
			const score = result._score !== undefined ? result._score : result.score

			if (identifier) {
				general[identifier] = {
					score,
					title : result.title,
					text  : result.text
				}

				seoResultsObject[identifier] = {
					score,
					title : result.title,
					text  : result.text
				}
			}
		})
	}

	// Process content analysis
	if (contentAnalysis?.results) {
		contentAnalysis.results.forEach(result => {
			const identifier = result._identifier || result.identifier
			const score = result._score !== undefined ? result._score : result.score

			if (identifier) {
				general[identifier] = {
					score,
					title : result.title,
					text  : result.text
				}
			}
		})
	}

	// Overall score: 75% SEO / 20% readability / 5% spelling.
	results.seo_score = calculateOverallScore(seoAnalysis, contentAnalysis)

	// Focus keyword: the column stores just the string; analysis lives under truseo.focus_keyword.
	results.focus_keyword = ('string' === typeof postData.focusKeyword ? postData.focusKeyword : '') || ''
	if (undefined !== seoAnalysis?.score) {
		const focusKeywordItems = getFocusKeywordResults(seoResultsObject)
		results.truseo.focus_keyword = {
			score : calculateFocusKeywordScore(focusKeywordItems),
			items : focusKeywordItems
		}
	}

	// Process additional keywords
	if (additionalKeywordsAnalysis && 0 < additionalKeywordsAnalysis.length) {
		additionalKeywordsAnalysis.forEach((analysis, index) => {
			if (analysis?.results) {
				const items = {}

				analysis.results.forEach(result => {
					const identifier = result._identifier || result.identifier
					const score = result._score !== undefined ? result._score : result.score

					if (identifier) {
						items[identifier] = {
							score,
							title : result.title,
							text  : result.text
						}
					}
				})

				const keyword = postData.additionalKeywords?.[index]
				if (keyword) {
					results.additional_keywords.push({
						word  : keyword.word || '',
						score : analysis.score || 0,
						items
					})
				}
			}
		})
	}

	return results
}