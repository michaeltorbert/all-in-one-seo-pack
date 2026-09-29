// The Headline Analyzer no longer registers its own WP plugin sidebar. It now
// renders on top of the AIOSEO settings sidebar as an overlay panel (see
// HeadlineAnalyzerPanel.vue, toggled via useHeadlineAnalyzer().openHeadlineAnalyzer).
// Kept as a no-op so the standalone entry can keep importing/calling it unchanged.
export default function registerHeadlineAnalyzer () {}