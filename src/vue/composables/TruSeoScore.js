import { computed } from 'vue'
import { __, _n, sprintf } from '@/vue/plugins/translations'

import { usePostEditorStore } from '@/vue/stores'
import { getTruSeoInstance } from '@/vue/plugins/tru-seo/TruSeoSingleton'
import { updateStoreWithResults } from '@/vue/plugins/tru-seo/helpers/resultsHelper'
import { isBadResult } from '@/app/tru-seo/scoring/interpreters'
import { getPostEditedContentForAnalysis } from '@/vue/plugins/tru-seo/components/postContent'

const td = import.meta.env.VITE_TEXTDOMAIN

// The character count TruSEO treats as "there is something here to analyse", matching the default
// in Assessment.hasEnoughContentForAssessment() that the readability presence check uses.
const MIN_CONTENT_LENGTH = 50

// Copy that names the analysed object. Formatter functions rather than a `strings` map so the
// translator comment leads a sprintf() argument, which is the only position the extractor reads.
const termBasicsDescription = noun => sprintf(
	// Translators: 1 - The taxonomy's singular noun, e.g. "category".
	__('The essential checks that help your %1$s get found — its SEO title, meta description, and description length. Getting these right makes it easier for search engines to understand and rank it.', td),
	noun
)

const termKeywordsDescription = noun => sprintf(
	// Translators: 1 - The taxonomy's singular noun, e.g. "category".
	__('Add the keywords you want this %1$s to rank for. AIOSEO checks how thoroughly your description targets each one and gives you specific suggestions to help it rank higher in search results.', td),
	noun
)

const termSeoScoreTooltip = noun => sprintf(
	// Translators: 1 - The taxonomy's singular noun, e.g. "category".
	__('Your TruSEO score rates how well this %1$s is optimized for search engines. Improve it by resolving the improvements flagged under Keywords and Basics.', td),
	noun
)

export const useTruSeoScore = () => {
	const postEditorStore = usePostEditorStore()

	// Resolved once: an editor session never switches between a post and a term. The taxonomy's own
	// label is preferred over "term", which reads as jargon to anyone editing product categories.
	const isTermContext = 'term' === postEditorStore.currentPost?.context
	const contentNoun   = postEditorStore.currentPost?.contentNouns?.singular || __('term', td)

	// The term list has no current post to read the context from, so it passes its own noun through
	// the screen-level payload instead.
	const listContentNoun = window.aioseo?.objectNouns?.singular || __('term', td)

	const strings = {
		weveGotWorkToDo : sprintf(
			// Translators: 1 - HTML Line break tag.
			__('We\'ve got some%1$swork to do!', td),
			'<br>'
		),
		needsImprovement : sprintf(
			// Translators: 1 - HTML Line break tag.
			__('Needs%1$sImprovement!', td),
			'<br>'
		),
		veryGood                : __('Very Good!', td),
		excellent               : __('Excellent!', td),
		allGood                 : __('All Good!', td),
		// Translators: Description text shown below the Readability tab explaining the readability score.
		readabilityDescription  : __('The readability score shows how easy your text is to read. Aim between 60-80 for most audiences. Easier-to-read content tends to keep readers engaged longer and can help lower your bounce rate. Simplify sentences and words to improve clarity.', td),
		// Translators: Description text shown for the Keywords section.
		keywordsDescriptionPost : __('Add the keywords you want this post to rank for. AIOSEO checks how thoroughly your content targets each one and gives you specific suggestions to help it rank higher in search results.', td),
		// Translators: Description text shown for the Basics section.
		basicsDescriptionPost   : __('The essential checks that help your post get found — your title, meta description, links, and images. Getting these right makes it easier for search engines to understand and rank it, as well as discover other content on your site.', td),
		// Translators: Tooltip shown on the TruSEO score badge.
		seoScoreTooltipPost     : __('Your TruSEO score rates how well this post is optimized for search engines. Improve it by resolving the improvements flagged under Keywords, Basics, and Readability.', td)
	}

	// Resolved here rather than left to each consumer: a term has no links, images or Readability
	// tab, so the post wording promises checks that never run, and every caller that forgot to
	// branch showed it.
	strings.keywordsDescription = isTermContext ? termKeywordsDescription(contentNoun) : strings.keywordsDescriptionPost
	strings.basicsDescription   = isTermContext ? termBasicsDescription(contentNoun) : strings.basicsDescriptionPost
	strings.seoScoreTooltip     = isTermContext ? termSeoScoreTooltip(contentNoun) : strings.seoScoreTooltipPost

	// The term list renders outside any editor, so it asks for the term wording explicitly.
	strings.seoScoreTooltipTerm = termSeoScoreTooltip(listContentNoun)

	const getErrorDisplay = (amountOfErrors) => {
		if (0 < amountOfErrors) {
			return sprintf(
				// Translators: 1 - The amount of errors.
				_n('%1$s Issue', '%1$s Issues', amountOfErrors, td),
				amountOfErrors
			)
		}
		return strings.allGood
	}

	const getErrorClass = (errors) => {
		if (0 < errors) {
			return 'red'
		}

		return 'green'
	}

	const getScoreClass = (score) => {
		return 79 < score ? 'green' : (49 < score ? 'orange' : (0 < score ? 'red' : 'none'))
	}

	// The textPresence assessment is TruSEO's own gauge of whether there's enough body
	// text to analyze (its "Not enough content" state). Below that threshold every other
	// check runs on effectively-empty text and only produces noise — a "Not enough content"
	// row sitting next to a pile of trivially-passing "Good" checks. When it flags too
	// little content we treat the whole analysis as not-ready so the tabs fall back to the
	// empty state, matching a brand-new post with no content.
	// NOTE: textPresence comes from the readability assessor, which terms don't run, so there is no
	// presence check to read for them. textLength's score can't stand in for one — it grades whether
	// the description is long enough for SEO (30 words), not whether there is anything to analyse, so
	// a real 16-word description read as "no content" and the card hid the very check telling the user
	// to lengthen it. Measure the analysed text against the same bar the presence assessment used
	// instead, so the answer doesn't depend on how the content happens to score.
	// The DOM read is not reactive on its own; `general` above is, and it changes on every analysis,
	// which is exactly when this needs re-evaluating.
	const hasEnoughContent = computed(() => {
		const general      = postEditorStore.truseoData?.truseo?.general
		const textPresence = general?.readability?.textPresence
		if (textPresence) {
			return !isBadResult(textPresence.score)
		}

		if (!general?.basic?.textLength) {
			return false
		}

		return MIN_CONTENT_LENGTH <= getPostEditedContentForAnalysis(true).trim().length
	})

	const readabilityScore = computed(() => {
		const results = Object.values(postEditorStore.truseoData?.truseo?.general?.readability || {})
		if (!results.length) {
			return 0
		}

		const validResults = results.filter(item => '' !== item?.title)
		if (!validResults.length) {
			return 0
		}

		const totalScore = validResults.reduce((sum, item) => sum + (item?.score || 0), 0)

		return Math.round((totalScore / (validResults.length * 9)) * 100)
	})

	const getReadabilityScoreClass = (score) => {
		if (60 <= score) {
			return 'score--green'
		}
		if (40 <= score) {
			return 'score--orange'
		}
		return 'score--red'
	}

	const runAnalysis = async (options = {}) => {
		try {
			const truSeo = await getTruSeoInstance()
			const results = await truSeo?.runAnalysis(options)

			if (results) {
				updateStoreWithResults(results)
			}
		} catch (error) {
			console.error('TruSEO analysis failed:', error)
		}
	}

	return {
		getErrorClass,
		getErrorDisplay,
		getReadabilityScoreClass,
		getScoreClass,
		hasEnoughContent,
		readabilityScore,
		runAnalysis,
		strings
	}
}