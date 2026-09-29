import { computed, ref, watch } from 'vue'

import { __, sprintf } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

// Shared by the metabox table and the sidebar panel so the two can't drift apart.
const pageSize = 10

/**
 * Paginates a keywords list.
 *
 * @param   {Object} keywords - Ref holding the full keywords array.
 * @returns {Object}            Pagination state and navigation helpers.
 */
export const useKeywordsPagination = (keywords) => {
	const currentPage = ref(1)

	const totalPages = computed(() => Math.max(1, Math.ceil(keywords.value.length / pageSize)))

	const paginatedKeywords = computed(() => {
		const start = (currentPage.value - 1) * pageSize

		return keywords.value.slice(start, start + pageSize)
	})

	const rangeLabel = computed(() => {
		const total = keywords.value.length
		const start = total ? (currentPage.value - 1) * pageSize + 1 : 0
		const end   = Math.min(currentPage.value * pageSize, total)

		return sprintf(
			// Translators: 1 - First item number, 2 - Last item number, 3 - Total number of keywords.
			__('Showing %1$s–%2$s of %3$s', td),
			start,
			end,
			total
		)
	})

	// Keep the current page in range when keywords are removed.
	watch(() => keywords.value.length, () => {
		if (currentPage.value > totalPages.value) {
			currentPage.value = totalPages.value
		}
	})

	/**
	 * Moves to the given page, clamped to the available range.
	 *
	 * NOTE: Reports whether the page actually changed so callers can collapse an
	 * expanded keyword only when the rows underneath it were swapped out.
	 *
	 * @param   {number}  page - The target page.
	 * @returns {boolean}        Whether the page changed.
	 */
	const goToPage = (page) => {
		const target = Math.min(Math.max(1, page), totalPages.value)
		if (target === currentPage.value) {
			return false
		}

		currentPage.value = target

		return true
	}

	/**
	 * Moves to the last page.
	 *
	 * @returns {void}
	 */
	const goToLastPage = () => {
		currentPage.value = totalPages.value
	}

	/**
	 * Moves to the page holding the given keyword.
	 *
	 * @param   {Object} keyword - The keyword to reveal.
	 * @returns {void}
	 */
	const goToKeyword = (keyword) => {
		const index = keywords.value.findIndex(k => k.id === keyword?.id)
		if (-1 !== index) {
			currentPage.value = Math.floor(index / pageSize) + 1
		}
	}

	return {
		currentPage,
		totalPages,
		paginatedKeywords,
		rangeLabel,
		goToPage,
		goToLastPage,
		goToKeyword
	}
}