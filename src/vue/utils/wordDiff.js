// Token cap for the LCS diff. The table is O(m*n); past this we skip the
// word-level diff and fall back to a coarse before/after (see diffWords).
const MAX_TOKENS = 1500

const tokenize = (text) => (text || '').match(/\s+|\S+/g) || []

const pushPart = (parts, value, flag) => {
	if (!value) {
		return
	}

	const last = parts[parts.length - 1]
	if (last && last.added === ('added' === flag) && last.removed === ('removed' === flag)) {
		last.value += value

		return
	}

	parts.push({ value, added: 'added' === flag, removed: 'removed' === flag })
}

/**
 * Word-level diff of two strings via a longest-common-subsequence walk.
 *
 * @param {string} before The original text.
 * @param {string} after  The updated text.
 * @returns {Array<{value: string, added: boolean, removed: boolean}>} Ordered diff parts.
 */
export const diffWords = (before, after) => {
	const a = tokenize(before)
	const b = tokenize(after)
	const m = a.length
	const n = b.length

	if (!m && !n) {
		return []
	}

	// Coarse fallback for very large inputs — avoid an O(m*n) table blow-up.
	if (m > MAX_TOKENS || n > MAX_TOKENS) {
		const parts = []
		pushPart(parts, before, 'removed')
		pushPart(parts, after, 'added')

		return parts
	}

	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
	for (let i = m - 1; 0 <= i; i--) {
		for (let j = n - 1; 0 <= j; j--) {
			dp[i][j] = a[i] === b[j]
				? dp[i + 1][j + 1] + 1
				: Math.max(dp[i + 1][j], dp[i][j + 1])
		}
	}

	const parts = []
	let i = 0,
		j = 0
	while (i < m && j < n) {
		if (a[i] === b[j]) {
			pushPart(parts, a[i], null)
			i++
			j++
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			pushPart(parts, a[i], 'removed')
			i++
		} else {
			pushPart(parts, b[j], 'added')
			j++
		}
	}

	while (i < m) {
		pushPart(parts, a[i], 'removed')
		i++
	}

	while (j < n) {
		pushPart(parts, b[j], 'added')
		j++
	}

	return parts
}