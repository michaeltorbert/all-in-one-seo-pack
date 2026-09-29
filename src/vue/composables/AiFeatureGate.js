import { computed, unref } from 'vue'

import { getFeatureCost } from '@/vue/composables/AiContent'
import { getFeatureIcon } from '@/vue/standalone/post-settings/views/partials/ai-content/utils'

import {
	useOptionsStore,
	usePostEditorStore,
	useTruSeoHighlighterStore
} from '@/vue/stores'

/**
 * Decides whether an AI feature should run or sell, for every entry point that offers one.
 *
 * NOTE: Shared so the upsell can't differ between the AI Copilot tab and the editors that
 * launch the same generator from elsewhere.
 *
 * @param {Object|import('vue').Ref} feature One of the definitions in the ai-content utils.
 * @returns {Object} The gate.
 */
export const useAiFeatureGate = (feature) => {
	const optionsStore           = useOptionsStore()
	const postEditorStore        = usePostEditorStore()
	const truSeoHighlighterStore = useTruSeoHighlighterStore()

	const resolved = computed(() => unref(feature) || {})

	// Auto-Optimize's price moves with whether the post needs spelling work, so it can't be
	// read from the published cost map the way every other feature's can.
	const creditCost = computed(() => ('auto-optimize' === resolved.value.slug
		? Number(truSeoHighlighterStore.optimizeCreditCost)
		: getFeatureCost(resolved.value.costKey)))

	// Results the user already paid for stay reachable at any balance.
	const hasExistingContent = computed(() => {
		const contentKey = resolved.value.contentKey

		return !!contentKey && 0 < (postEditorStore.currentPost?.ai?.[contentKey]?.length || 0)
	})

	const cannotAfford = computed(() => {
		const remaining = optionsStore.internalOptions.internal.ai.credits.remaining
		const cost      = creditCost.value

		// A price of 0 means the feature is billed as part of another charge, and an unknown
		// one can't be compared — either way an empty balance is still a refusal.
		return Number.isFinite(cost) && 0 < cost ? remaining < cost : !remaining
	})

	const shouldUpsell = computed(() => cannotAfford.value && !hasExistingContent.value)

	const upsellFeature = computed(() => ({
		slug          : resolved.value.slug,
		title         : resolved.value.strings?.name,
		description   : resolved.value.strings?.description,
		// Only Auto-Optimize hands over a figure; the rest let the upsell quote from the cost
		// map, which is what keeps the Image Generator's price labelled as a minimum.
		cost          : 'auto-optimize' === resolved.value.slug ? creditCost.value : undefined,
		costKey       : resolved.value.costKey,
		costIsMinimum : resolved.value.costIsMinimum,
		icon          : getFeatureIcon(resolved.value)
	}))

	return {
		cannotAfford,
		creditCost,
		hasExistingContent,
		shouldUpsell,
		upsellFeature
	}
}