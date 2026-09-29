<template>
	<div class="aioseo-spelling-analysis">
		<p
			v-if="!hideDescription"
			class="aioseo-spelling-analysis__description"
		>
			{{ strings.description }}

			<button
				v-if="showManageDictionary"
				type="button"
				class="aioseo-spelling-analysis__manage-dictionary"
				@click="emit('manage-dictionary')"
			>
				{{ strings.manageDictionary }}

				<svg-right-arrow-short />
			</button>
		</p>

		<hr
			v-if="!hideDescription"
			class="aioseo-spelling-analysis__divider"
		/>

		<core-alert
			v-if="isBlockCodeEditor"
			type="yellow"
		>
			{{ strings.switchToVisualEditor }}
		</core-alert>

		<template v-else>
			<dictionary-download-bar />

			<template v-if="words.length">
				<div class="aioseo-spelling-analysis__list">
					<div
						v-for="word in pagedWords"
						:key="word.word"
						class="aioseo-spelling-analysis__item"
					>
						<div class="aioseo-spelling-analysis__item-header">
							<span class="aioseo-spelling-analysis__word">{{ word.word }}</span>

							<button
								v-if="canJump"
								type="button"
								class="aioseo-spelling-analysis__jump"
								:aria-label="strings.jumpToWord(word.word)"
								@click="jumpToWord(word.word)"
							>
								{{ strings.instancesFound(word.count) }}

								<svg-right-arrow-short class="aioseo-spelling-analysis__jump-arrow" />
							</button>
						</div>

						<div class="aioseo-spelling-analysis__actions">
							<template v-if="isLoading(word.word)">
								<span class="aioseo-spelling-analysis__spinner" />
							</template>

							<template v-else-if="hasSuggestions(word.word)">
								<button
									v-for="(suggestion, index) in suggestionsFor(word.word)"
									:key="index"
									type="button"
									class="aioseo-spelling-analysis__chip"
									@click="applySuggestion(word, suggestion)"
								>
									{{ suggestion }}
								</button>

								<span
									v-if="!suggestionsFor(word.word).length"
									class="aioseo-spelling-analysis__no-suggestions"
								>
									{{ strings.noSuggestions }}
								</span>
							</template>

							<button
								type="button"
								class="aioseo-spelling-analysis__add"
								:disabled="addingWords.includes(word.word)"
								@click="addWord(word.word)"
							>
								<svg-plus class="aioseo-spelling-analysis__add-icon" />

								{{ addingWords.includes(word.word) ? strings.addingToDictionary : strings.addToDictionary }}
							</button>
						</div>
					</div>
				</div>

				<div
					v-if="showPager"
					class="aioseo-spelling-analysis__pager"
				>
					<button
						type="button"
						class="aioseo-spelling-analysis__pager-btn"
						:disabled="page <= 1"
						@click="page--"
					>
						{{ strings.previous }}
					</button>

					<span class="aioseo-spelling-analysis__pager-status">{{ pagerLabel }}</span>

					<button
						type="button"
						class="aioseo-spelling-analysis__pager-btn"
						:disabled="page >= totalPages"
						@click="page++"
					>
						{{ strings.next }}
					</button>
				</div>
			</template>

			<template v-else-if="!dictStore.downloading && !dictStore.failed">
				<div class="aioseo-spelling-analysis__all-good">
					<svg-circle-check width="16" />

					<span>{{ strings.noMistakes }}</span>
				</div>
			</template>
		</template>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'

import {
	usePostEditorStore,
	useSpellCheckerDictionaryStore,
	useTruSeoHighlighterStore
} from '@/vue/stores'

import { __, sprintf } from '@/vue/plugins/translations'
import { wordBoundaryPattern } from '@/vue/utils/regex'
import { replaceWordInContent } from '@/vue/plugins/tru-seo/highlighter/spellingReplace'
import { getFormatClassName } from '@/vue/plugins/tru-seo/highlighter/wpDataStore'
import { useEditorMode } from '@/vue/composables/EditorMode'

import CoreAlert from '@/vue/components/common/core/alert/Index'
import DictionaryDownloadBar from '@/vue/components/common/tru-seo/DictionaryDownloadBar'
import SvgCircleCheck from '@/vue/components/common/svg/circle/Check'
import SvgPlus from '@/vue/components/common/svg/Plus'
import SvgRightArrowShort from '@/vue/components/common/svg/right-arrow/Short'

const td = import.meta.env.VITE_TEXTDOMAIN

defineProps({
	showManageDictionary : {
		type    : Boolean,
		default : false
	},
	hideDescription : {
		type    : Boolean,
		default : false
	}
})

const emit = defineEmits([ 'manage-dictionary' ])

const postEditorStore        = usePostEditorStore()
const dictStore              = useSpellCheckerDictionaryStore()
const truSeoHighlighterStore = useTruSeoHighlighterStore()

const { isBlockCodeEditor } = useEditorMode()

const strings = {
	switchToVisualEditor : __('TruSEO can\'t analyze your post in the Code Editor. Switch to the Visual Editor to see your results.', td),
	description          : __('Fix spelling mistakes flagged in your content. Words you add to your dictionary won\'t be flagged again.', td),
	addToDictionary      : __('Add to dictionary', td),
	addingToDictionary   : __('Adding…', td),
	instancesFound       : (count) => sprintf(
		// Translators: 1 - The number of times the misspelled word appears.
		__('%1$d found', td),
		count
	),
	noSuggestions    : __('No suggestions', td),
	manageDictionary : __('Manage Dictionary', td),
	noMistakes       : __('No spelling mistakes found.', td),
	previous         : __('Previous', td),
	next             : __('Next', td),
	jumpToWord       : (word) => sprintf(
		// Translators: 1 - The misspelled word.
		__('Jump to the first instance of “%1$s” in the editor', td),
		word
	)
}

// Each misspelled occurrence is a separate highlightSentence entry, so group by
// word to build the per-word rows with an occurrence count.
const words = computed(() => {
	const sentences = postEditorStore.truseoData?.truseo?.general?.spelling?.spellingChecker?.highlightSentences || []
	const counts = new Map()

	for (const sentence of sentences) {
		const word = (sentence || '').trim()
		if (!word) {
			continue
		}

		counts.set(word, (counts.get(word) || 0) + 1)
	}

	return Array.from(counts, ([ word, count ]) => ({ word, count }))
})

const PER_PAGE = 10
const page = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(words.value.length / PER_PAGE)))

const pagedWords = computed(() => {
	const start = (page.value - 1) * PER_PAGE

	return words.value.slice(start, start + PER_PAGE)
})

const showPager = computed(() => PER_PAGE < words.value.length)

const pagerLabel = computed(() => {
	const start = (page.value - 1) * PER_PAGE

	return sprintf(
		// Translators: 1 - First result number, 2 - Last result number, 3 - Total number of results.
		__('%1$d–%2$d of %3$d', td),
		start + 1,
		Math.min(start + PER_PAGE, words.value.length),
		words.value.length
	)
})

// The list shrinks as words are fixed or added to the dictionary; keep the
// current page in range so it never lands on an empty page.
watch(words, () => {
	if (page.value > totalPages.value) {
		page.value = totalPages.value
	}
})

// The term editor's description textarea, when that is what is being analysed.
const getTermDescription = () => document.querySelector('#edittag textarea#description')

// Jump is marks-independent (it can find the word in the raw editor content), but on a post it is
// only offered alongside highlighting. A term has no highlighting at all, and its textarea can
// always be searched, so it gets the action unconditionally.
const canJump = computed(() => !!getTermDescription() || truSeoHighlighterStore.highlightingEnabled)

const suggestionsFor = (word) => truSeoHighlighterStore.suggestionsCache[word] || []

const hasSuggestions = (word) => word in truSeoHighlighterStore.suggestionsCache

const isLoading = (word) => truSeoHighlighterStore.suggestionsLoadingFor === word

const addingWords = computed(() => truSeoHighlighterStore.addToSafeWordsLoadingFor)

// Prefetch suggestions for every misspelled word so the chips are ready inline
// without waiting on hover, matching the popover behavior. The shared worker is
// registered by TruSeoWrapper shortly after init; before then requestSpelling-
// Suggestions returns [] and fetchSpellingSuggestions would cache that empty
// result permanently, so wait for the worker instead of poisoning the cache.
let prefetchRetry   = null,
	prefetchRetries = 0

const PREFETCH_MAX_RETRIES = 30

const prefetchSuggestions = () => {
	if (prefetchRetry) {
		clearTimeout(prefetchRetry)
		prefetchRetry = null
	}

	if (!words.value.length) {
		return
	}

	// The shared worker is registered by TruSeoWrapper shortly after init. Until
	// then requestSpellingSuggestions returns [] and fetchSpellingSuggestions
	// would cache that empty result permanently, so wait for the worker.
	if (!truSeoHighlighterStore.isSpellingWorkerReady()) {
		if (prefetchRetries++ < PREFETCH_MAX_RETRIES) {
			prefetchRetry = setTimeout(prefetchSuggestions, 300)
		}

		return
	}

	prefetchRetries = 0

	for (const { word } of words.value) {
		if (!(word in truSeoHighlighterStore.suggestionsCache)) {
			truSeoHighlighterStore.fetchSpellingSuggestions(word)
		}
	}
}

const marksForWord = (word) => truSeoHighlighterStore.highlightMarks.filter(
	hm => 'spellingChecker' === hm.analyzer && hm.sentence === word
)

const applySuggestion = async (word, suggestion) => {
	// Replace straight from the editor content — the list is built from the
	// assessment, not painted marks, so the fix must work whether or not spelling
	// highlighting is toggled on (with it off, no marks exist and the old
	// marks-based path silently no-opped).
	const success = replaceWordInContent(word.word, suggestion)
	if (!success) {
		return
	}

	// Drop the fixed word's marks immediately for snappy feedback, then run one
	// canonical re-analysis so the list loses the word deterministically instead
	// of waiting on the race-prone ambient re-analysis.
	truSeoHighlighterStore.dismissAfterFix({ analyzer: 'spellingChecker', sentence: word.word })
	await truSeoHighlighterStore.reanalyzeNow()
}

const addWord = async (word) => {
	if (truSeoHighlighterStore.addToSafeWordsLoadingFor.includes(word)) {
		return
	}

	const added = await truSeoHighlighterStore.addToSafeWords(word)
	if (added) {
		truSeoHighlighterStore.dismissAfterFix({ analyzer: 'spellingChecker', sentence: word })
	}
}

// A spelling <mark> wraps exactly one word, and every misspelled word shares the
// same class, so a bare `mark.<class>` selector returns the first misspelling in
// the content regardless of which row was clicked. Match on the mark's text so
// the jump lands on the requested word's first instance.
const findWordMark = (root, className, word) => {
	for (const mark of root.querySelectorAll(`mark.${className}`)) {
		if ((mark.textContent || '').trim() === word) {
			return mark
		}
	}

	return null
}

const findScrollTarget = (word) => {
	const marks = marksForWord(word)
	const className = getFormatClassName('spellingChecker')

	// A store-tracked node still attached to the DOM. The Classic editor links
	// these synchronously; the Block editor links them asynchronously once the
	// marks are painted, so this often misses in the sidepanel and falls through.
	const live = marks.find(hm => hm.node && hm.node.isConnected)
	if (live) {
		return live.node
	}

	// Re-query the word's <mark> from a still-attached parent block.
	for (const hm of marks) {
		if (hm.parent && hm.parent.isConnected) {
			const candidate = findWordMark(hm.parent, className, word)
			if (candidate) {
				return candidate
			}
		}
	}

	// Store refs are often left unlinked while the <mark> elements are painted, so
	// query the live editor DOM. The Block editor renders inside an iframe; the
	// Classic editor renders in the main document.
	const docs = [ document ]
	const canvas = document.querySelector('iframe[name="editor-canvas"]')
	if (canvas && canvas.contentDocument) {
		docs.push(canvas.contentDocument)
	}

	for (const doc of docs) {
		const candidate = findWordMark(doc, className, word)
		if (candidate) {
			return candidate
		}
	}

	const withParent = marks.find(hm => hm.parent && hm.parent.isConnected)
	if (withParent?.parent) {
		return withParent.parent
	}

	// No painted mark (highlighting off, or marks not yet linked): fall back to
	// the word's raw text in the editor content so jump still works.
	return findWordInEditorContent(word)
}

// The editor's content root(s). Scoped to the editor — never the panel — so a
// text search here can't match the same word shown in this list. Covers the
// iframed Block editor (WP 6.3+), the non-iframed Block editor, and Classic.
const getEditorContentRoots = () => {
	const roots = []

	const canvas = document.querySelector('iframe[name="editor-canvas"]')
	if (canvas?.contentDocument?.body) {
		roots.push(canvas.contentDocument.body)
	} else {
		const blockRoot = document.querySelector('.editor-styles-wrapper .is-root-container')
		if (blockRoot) {
			roots.push(blockRoot)
		}
	}

	const classicFrame = document.getElementById('content_ifr')
	if (classicFrame?.contentDocument?.body) {
		roots.push(classicFrame.contentDocument.body)
	}

	return roots
}

// Locates the first whole-word occurrence of `word` in the editor content and
// returns the element to scroll to. Marks-independent, so jump works with
// spelling highlighting off.
const findWordInEditorContent = (word) => {
	const regex = new RegExp(wordBoundaryPattern(word), 'u')

	for (const root of getEditorContentRoots()) {
		const doc = root.ownerDocument || document
		const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
		let node

		while (null !== (node = walker.nextNode())) {
			if (regex.test(node.nodeValue || '')) {
				return node.parentElement
			}
		}
	}

	return null
}

// Extra top gap so a jump target isn't hidden behind (or flush against) the
// editor's sticky chrome. The Classic editor pins its media/Visual-Code bar and
// format toolbar over the content, so add their heights (stable whether or not
// currently pinned); the Block editor's canvas already renders below its fixed
// header, so the trailing gap alone suffices there. The fixed WP admin bar is
// handled separately by WP's `scroll-padding-top` on the document.
const getStickyEditorOffset = () => {
	let height = 0
	for (const selector of [ '.wp-editor-tools', '.mce-toolbar-grp' ]) {
		const el = document.querySelector(selector)
		if (el) {
			height += el.getBoundingClientRect().height
		}
	}

	return Math.round(height) + 16
}

// A term's description is a plain textarea, so there is no <mark> to scroll to. Selecting the word
// gives the same "here it is" feedback using the browser's own selection highlight, and focusing
// leaves the caret where the user can start typing over it.
const jumpToWordInTermDescription = (textarea, word) => {
	const match = new RegExp(wordBoundaryPattern(word), 'u').exec(textarea.value || '')
	if (!match) {
		return false
	}

	textarea.style.scrollMarginTop = `${getStickyEditorOffset()}px`
	textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })

	// preventScroll so focusing doesn't fight the smooth scroll above with a jump.
	textarea.focus({ preventScroll: true })
	textarea.setSelectionRange(match.index, match.index + match[0].length)

	return true
}

const jumpToWord = (word) => {
	const textarea = getTermDescription()
	if (textarea) {
		jumpToWordInTermDescription(textarea, word)

		return
	}

	const node = findScrollTarget(word)
	if (!node) {
		return
	}

	// `scrollIntoView` crosses the same-origin editor-iframe boundary to scroll the
	// main window, and WP's `scroll-padding-top` already clears the fixed admin bar.
	// The Classic editor's TinyMCE toolbar sticks over the content though, and
	// scroll-padding doesn't know about it — so offset the target by the toolbar's
	// live height, or `block: 'start'` lands the word hidden just beneath it.
	node.style.scrollMarginTop = `${getStickyEditorOffset()}px`
	node.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watchEffect(prefetchSuggestions)

onBeforeUnmount(() => {
	if (prefetchRetry) {
		clearTimeout(prefetchRetry)
	}
})
</script>

<style lang="scss">
.aioseo-spelling-analysis {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;
	font-size: 14px;
	line-height: 22px;

	&__description {
		margin: 0;
		color: #141b38;
		font-size: 14px;
		line-height: 22px;
	}

	&__divider {
		width: 100%;
		height: 1px;
		margin: 0;
		border: 0;
		background: $gray;
	}

	&__list {
		display: flex;
		flex-direction: column;
	}

	&__item {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 0;
		border-top: 1px solid $background;

		&:first-child {
			border-top: 0;
			padding-top: 0;
		}
	}

	&__item-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	&__word {
		font-size: 14px;
		font-weight: 700;
		color: #141b38;
		text-decoration: underline wavy #DC2626;
		text-underline-offset: 3px;
	}

	&__jump {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 13px;
		color: $blue;
		cursor: pointer;

		.aioseo-spelling-analysis__jump-arrow {
			width: 12px;
			height: 12px;
			transform: rotate(-90deg);
		}

		&:hover {
			text-decoration: underline;
		}
	}

	&__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	&__chip {
		padding: 4px 10px;
		border: 1px solid $border;
		border-radius: 100px;
		background: $white;
		font: inherit;
		font-size: 13px;
		color: #141b38;
		cursor: pointer;

		&:hover {
			border-color: $blue;
			color: $blue;
		}
	}

	&__no-suggestions {
		color: $placeholder-color;
		font-size: 13px;
		font-style: italic;
	}

	&__add {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border: 1px solid $border;
		border-radius: 100px;
		background: $white;
		font: inherit;
		font-size: 13px;
		color: $black;
		cursor: pointer;

		&:hover:not(:disabled) {
			border-color: $blue;
			color: $blue;
		}

		&:disabled {
			color: $placeholder-color;
			cursor: not-allowed;
		}
	}

	&__add-icon {
		width: 9px;
		height: 9px;
		flex-shrink: 0;
	}

	&__spinner {
		width: 16px;
		height: 16px;
		border: 2px solid $border;
		border-top-color: $black2;
		border-radius: 50%;
		animation: aioseo-spelling-spin 0.8s linear infinite;
	}

	&__all-good {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 14px;
		border-radius: 6px;
		background-color: #ecfdf5;
		color: #00aa63;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.4;

		svg {
			flex-shrink: 0;
			color: #00aa63;
		}
	}

	&__manage-dictionary {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 13px;
		font-weight: $font-bold;
		color: $blue;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
		}

		svg {
			width: 11px;
			height: 11px;
			flex-shrink: 0;
		}
	}

	&__pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 4px;
	}

	&__pager-status {
		color: $placeholder-color;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	&__pager-btn {
		padding: 4px 12px;
		border: 1px solid $border;
		border-radius: 4px;
		background: $white;
		font: inherit;
		font-size: 13px;
		font-weight: $font-bold;
		color: $blue;
		cursor: pointer;

		&:hover:not(:disabled) {
			border-color: $blue;
		}

		&:disabled {
			color: $placeholder-color;
			cursor: not-allowed;
		}
	}
}

@keyframes aioseo-spelling-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>