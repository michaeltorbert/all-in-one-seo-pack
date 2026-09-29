/* globals ET_Builder */
import { getText } from '@/vue/utils/html'
import { getImages, getVideos } from '@/vue/standalone/page-builders/helpers/index'

const sectionSelector = '.et_pb_section'

// Divi 5 wraps the post's own content in this element, on Theme Builder layouts and
// plain posts alike. Everything else on the canvas belongs to the template. Divi 4
// doesn't render it, so Divi 4 keeps the whole-canvas scrape.
const postContentSelector = '.et-fb-post-content'

// Divi 5 flags every builder-UI subtree ("Settings", "Clone", …) with this class, so
// the builder's own controls can be dropped structurally instead of matched by label,
// which would only work in English.
const builderUiSelector = '.et-vb-ui'

const styleRegex = /<style.*?<\/style>|\[object Object\]/gi

// Unwraps a paragraph holding nothing but an image. Bounded to a single tag: an
// unbounded `.*` reaches past the paragraph it should match and swallows every
// preceding paragraph on the same line.
const imageParagraphRegex = /<p[^>]*>\s*(<img[^>]*>)\s*<\/p>/gi

/**
 * Get the content area.
 *
 * @returns {HTMLElement} The content area.
 */
export const getContentArea = () => {
	const frame = ET_Builder?.Frames?.app?.frameElement ||
		document.querySelector('iframe#et-fb-app-frame') ||
		document.querySelector('iframe#et-vb-app-frame')

	if (!frame) {
		return document.createElement('div')
	}

	const content = frame.contentWindow.document.querySelectorAll('#et-fb-app')

	return Array.from(content).find(n => n.classList.contains('et-fb-root-ancestor')) ||
		content[0] ||
		document.createElement('div')
}

/**
 * Get the element to scrape the post's content from.
 *
 * @returns {HTMLElement} The post content wrapper, or the whole content area.
 */
const getScrapeRoot = () => {
	const contentArea = getContentArea()
	const postContent = contentArea.querySelector(postContentSelector)

	// Fall back when the wrapper is missing or holds no sections — analyzing the
	// surrounding template is wrong, but handing the analyzer nothing is worse.
	return postContent?.querySelector(sectionSelector) ? postContent : contentArea
}

/**
 * Check whether another section sits between this one and the root.
 *
 * NOTE: `closest()` can't answer this — the root itself may live inside a section
 * that is outside the root.
 *
 * @param   {HTMLElement} root    The root being scraped.
 * @param   {HTMLElement} section The section to test.
 * @returns {boolean}             Whether the section is nested inside another one.
 */
const hasSectionAncestorWithin = (root, section) => {
	for (let parent = section.parentElement; parent && parent !== root; parent = parent.parentElement) {
		if (parent.matches(sectionSelector)) {
			return true
		}
	}

	return false
}

/**
 * Get a section's inner HTML without the builder's own interface.
 *
 * @param   {HTMLElement} section The section.
 * @returns {string}              The inner HTML.
 */
const getSectionHtml = (section) => {
	const clone = section.cloneNode(true)
	clone.querySelectorAll(builderUiSelector).forEach(node => node.remove())

	return clone.innerHTML
}

/**
 * Get the content from the builder by scraping the DOM.
 *
 * @returns {string} The content.
 */
export const getScrapedContent = () => {
	const root = getScrapeRoot()

	return Array.from(root.querySelectorAll(sectionSelector))
		.filter(section => !hasSectionAncestorWithin(root, section))
		.map(section => getSectionHtml(section)
			.replace(styleRegex, '')
			.replaceAll(imageParagraphRegex, '$1'))
		.filter(html => getText(html) || getImages(html) || getVideos(html))
		.join(' ')
}