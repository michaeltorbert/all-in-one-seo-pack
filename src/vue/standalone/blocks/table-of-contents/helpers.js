export const MODES = {
	STANDALONE : 'standalone',
	SYNCED     : 'synced'
}

export const BLOCK_TYPES = {
	HEADING : 'core/heading',
	FAQ     : 'aioseo/faq',
	TOC     : 'aioseo/table-of-contents'
}

/**
 * Check if the headings are nested.
 *
 * @param   {Array}   headings Heading objects.
 * @returns {boolean}          True if nested.
 */
export const areHeadingsNested = (headings) => {
	const foundNested = headings.find((headingObject) => {
		return 0 < headingObject.headings?.length
	})
	return !!(foundNested && Object.keys(foundNested).length)
}

/**
 * Iterate through an array of heading objects, recursing into nested headings and un-nesting them.
 *
 * @param   {Array}  headings Heading objects to flatten.
 * @param   {number} end 	  The end index of the specified portion of the array.
 * @returns {Array}           Flattened array of heading objects.
 */
export const flattenHeadings = (headings, end = 0) => {
	if (!areHeadingsNested([ ...headings ])) {
		return headings
	}

	const flattenedHeadings = []
	const stack             = [ ...headings ]

	while (stack.length) {
		if (end && flattenedHeadings.length === end) {
			break
		}

		const { ...heading } = stack.shift()
		if (heading.headings?.length) {
			stack.unshift(...heading.headings)
		}
		heading.headings = []
		flattenedHeadings.push(heading)
	}

	return flattenedHeadings
}

/**
 * Assign an editedOrder value to each heading based on its position in the tree.
 * NOTE: Must not go through flattenHeadings() - that discards the nesting the block renders from.
 *
 * @param   {Array} headings Heading objects to order.
 * @returns {Array}          Ordered array of heading objects, nesting intact.
 */
export const orderHeadings = (headings) => {
	let editedOrder = 0

	const order = (headingObjects) => (headingObjects || []).map((heading) => ({
		...heading,
		editedOrder : ++editedOrder,
		headings    : order(heading.headings)
	}))

	return order(headings)
}

/**
 * Find the client ID of the block a heading was parsed from.
 * NOTE: A heading's stored blockClientId goes stale on reload - the editor mints new client IDs on every parse.
 *
 * @param   {Object}      heading Heading object to find the block for.
 * @param   {Array}       blocks  Blocks to search through, as returned by getBlocks().
 * @returns {string|null}         Client ID of the matching block, or null when there is none.
 */
export const findHeadingBlockClientId = (heading, blocks) => {
	if (!heading?.anchor) {
		return null
	}

	const flatten = (blockObjects) => (blockObjects || []).flatMap((block) => [ block, ...flatten(block.innerBlocks) ])

	const candidates = flatten(blocks).filter((block) => {
		return [ BLOCK_TYPES.HEADING, BLOCK_TYPES.FAQ ].includes(block.name) &&
			block.attributes?.anchor === heading.anchor
	})

	if (1 === candidates.length) {
		return candidates[0].clientId
	}

	// An anchor typed over another heading's anchor matches both blocks. Rather than write to
	// whichever comes first, only go ahead when the heading text singles one of them out.
	const namesake = candidates.filter((block) => getBlockHeadingText(block) === normalizeHeadingText(heading.content))

	return 1 === namesake.length ? namesake[0].clientId : null
}

/**
 * Read the heading text a block contributes to the table of contents.
 *
 * @param   {Object} block Block to read.
 * @returns {string}       Normalized heading text.
 */
const getBlockHeadingText = (block) => {
	const attributes = block.attributes || {}
	const content    = attributes.question || // FAQ block.
		attributes.content?.text || // Heading block, WP 6.5 and up.
		attributes.content || '' // Heading block, WP 6.4 and below.

	return normalizeHeadingText('string' === typeof content ? content : '')
}

/**
 * Reduce a heading's text the same way the table of contents does when it stores it.
 * NOTE: Mirrors cleanHtml() rather than importing it - that module binds window.wp.element on load.
 *
 * @param   {string} text Heading text to normalize.
 * @returns {string}      Normalized heading text.
 */
const normalizeHeadingText = (text) => {
	const { body } = document.implementation.createHTMLDocument('')
	body.innerHTML = ('string' === typeof text ? text : '').replace(/(<br *\/?>)+/g, ' ')

	return body.textContent.trim()
}

/**
 * Assign a new anchor to a heading, leaving the rest of the tree untouched.
 *
 * @param   {Array}  headings Heading objects to update.
 * @param   {Object} heading  Heading to update, matched on the values it currently holds.
 * @param   {string} anchor   The new anchor.
 * @returns {Array}           Copy of the heading objects carrying the new anchor.
 */
export const replaceHeadingAnchor = (headings, heading, anchor) => (headings || []).map((h) => {
	if (
		h.content === heading.content &&
		h.level === Number(heading.level) &&
		h.anchor === heading.anchor
	) {
		return { ...h, anchor }
	}

	return h.headings?.length ? { ...h, headings: replaceHeadingAnchor(h.headings, heading, anchor) } : h
})