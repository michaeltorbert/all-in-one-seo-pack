/* eslint-disable one-var */
// External dependencies.
import { parseFragment } from 'parse5'
// Internal dependencies.
import adapt from './private/adapt'
import tokenize from './private/tokenize'
import filterTree from './private/filterTree'
import permanentFilters from './private/alwaysFilterElements'
import { filterBeforeTokenizing } from './private/filterBeforeTokenizing'
import parseBlocks from './private/parseBlocks'
import filterShortcodesFromTree from '@/app/tru-seo/languageProcessing/helpers/sanitize/filterShortcodesFromTree'
import { htmlEntitiesRegex } from '@/app/tru-seo/helpers/htmlEntities'
import { registerCache } from '@/app/tru-seo/cache'
import { contentHash, djb2Hash } from '@/app/tru-seo/helpers/hash'

/**
 * Cache for parsed paper trees.
 * Uses LRU-like eviction to prevent unbounded growth.
 *
 * @since 5.0.0
 */
const treeCache = new Map()
const MAX_TREE_CACHE_SIZE = 5

// Register tree cache with CacheManager.
registerCache('treeCache', {
	clear : () => treeCache.clear(),
	get size () {
		return treeCache.size
	}
})

/**
 * Generates a cache key for the paper tree based on content hash.
 *
 * @since 5.0.0
 * @param {string} html The HTML content.
 * @param {string[]} [shortcodes] The shortcodes array.
 * @returns {string} The cache key.
 */
function generateTreeCacheKey (html, shortcodes) {
	const htmlHash = contentHash(html)

	// Hash shortcodes separately (they're usually small).
	const shortcodesKey = shortcodes ? djb2Hash(shortcodes.join(',')).toString(36) : '0'

	return `${htmlHash}-${shortcodesKey}`
}

/**
 * Clears the tree cache.
 * Useful when navigating between posts or for memory management.
 *
 * @since 5.0.0
 * @returns {void}
 */
export function clearTreeCache () {
	treeCache.clear()
}

/**
 * Gets the current tree cache size.
 *
 * @since 5.0.0
 * @returns {number} The number of cached trees.
 */
export function getTreeCacheSize () {
	return treeCache.size
}

/**
 * Parses the HTML string to a tree representation of the HTML document.
 * Uses caching to avoid re-parsing identical content.
 *
 * @since 5.0.0 Added tree caching.
 * @param {Paper} paper The paper to build the tree from.
 * @param {LanguageProcessor} languageProcessor The language processor to use.
 * @param {string[]} [shortcodes] An optional array of all active shortcodes.
 *
 * @returns {Node} The tree representation of the HTML string.
 */
export default function build (paper, languageProcessor, shortcodes) {
	let html = paper.getText()

	// Check cache first.
	const cacheKey = generateTreeCacheKey(html, shortcodes)

	if (treeCache.has(cacheKey)) {
		// Move to end to mark as recently used (LRU).
		const cached = treeCache.get(cacheKey)
		treeCache.delete(cacheKey)
		treeCache.set(cacheKey, cached)

		return cached
	}

	let tree = null

	// Change HTML entities like "&amp;" to "#amp;" to prevent early conversion to "&" -- which would invalidate token positions.
	html = html.replace(htmlEntitiesRegex, '#$1')

	tree = adapt(parseFragment(html, { sourceCodeLocationInfo: true }))
	if (tree.childNodes && 0 < tree.childNodes.length) {
		parseBlocks(paper, tree)
	}

	/*
	 * Filter out some content from the tree so that it can be correctly tokenized. We don't want to tokenize text in
	 * between tags such as 'code' and 'script', but we do want to take into account the length of those elements when
	 * calculating sentence and token positions.
	 */
	tree = filterBeforeTokenizing(tree)

	// Add sentences and tokens to the tree's paragraph and heading nodes.
	tree = tokenize(tree, languageProcessor)

	// Filter out shortcodes from the tree.
	if (shortcodes) {
		filterShortcodesFromTree(tree, shortcodes)
	}

	/*
	 * Filter out elements we don't want to include in the analysis. Only do this after tokenization as we need to
	 * have all inline elements in the tree during tokenization to correctly calculate sentence and token positions.
	 */
	tree = filterTree(tree, permanentFilters)

	// Cache the result.
	if (treeCache.size >= MAX_TREE_CACHE_SIZE) {
		// Remove oldest entry.
		const oldestKey = treeCache.keys().next().value
		treeCache.delete(oldestKey)
	}
	treeCache.set(cacheKey, tree)

	return tree
}