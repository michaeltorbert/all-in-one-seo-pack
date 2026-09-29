/* globals ETBuilderBackendDynamic */
import * as Divi5 from './divi5-helpers'
import * as Legacy from './legacy-helpers'
import { getScrapedContent } from './dom-helpers'

export const isDivi5 = 5 <= (parseInt(window.aioseo?.theme?.templateVersion, 10) || 0)

export const isDivi5Ready = Divi5.isDivi5Ready

/**
 * Get the featured image ID.
 *
 * @returns {number} The featured image ID.
 */
export const getFeaturedImageId = () => {
	return isDivi5 ? Divi5.getDivi5FeaturedImageId() : Legacy.getLegacyFeaturedImageId()
}

/**
 * Get the permalink.
 *
 * @returns {string} The permalink.
 */
const getPermalink = () => {
	const url = isDivi5 ? Divi5.getDivi5Permalink() : Legacy.getLegacyPermalink()
	try {
		const link = new URL(url)
		link.searchParams.delete('PageSpeed')
		return link.href
	} catch {
		return url || ''
	}
}

/**
 * Get the title.
 *
 * @returns {string} The title.
 */
const getTitle = () => {
	return isDivi5 ? Divi5.getDivi5Title() : Legacy.getLegacyTitle()
}

/**
 * Get the excerpt.
 *
 * @returns {string} The excerpt.
 */
const getExcerpt = () => {
	return isDivi5 ? Divi5.getDivi5Excerpt() : Legacy.getLegacyExcerpt()
}

/**
 * Get the slug.
 *
 * @returns {string} The slug.
 */
const getSlug = () => {
	return isDivi5 ? Divi5.getDivi5Slug() : Legacy.getLegacySlug()
}

/**
 * Get the featured image URL.
 *
 * @returns {Promise<string>} The featured image URL.
 */
const getFeaturedImage = async () => {
	const { wp } = window
	const id     = getFeaturedImageId()
	if (!wp || !id) {
		return ''
	}

	try {
		const attachment = wp.media.attachment(id)
		if (!attachment.get('url')) {
			await attachment.fetch()
		}
		const url = attachment.get('url')
		if (!isDivi5 && ETBuilderBackendDynamic?.currentPage) {
			ETBuilderBackendDynamic.currentPage.thumbnailUrl = url
		}
		return url
	} catch {
		return ''
	}
}

/**
 * Get the content.
 *
 * @returns {string} The content.
 */
const getContent = () => {
	return isDivi5 ? Divi5.getDivi5Content() : getScrapedContent()
}

/**
 * Get all editor data.
 *
 * @param   {Object}  options                      Options.
 * @param   {boolean} options.includeFeaturedImage Whether to include the featured image URL (triggers a network request). Default: true.
 * @returns {Object}                               The editor data.
 */
export const getEditorData = ({ includeFeaturedImage = true } = {}) => ({
	content   : getContent(),
	title     : getTitle(),
	excerpt   : getExcerpt(),
	slug      : getSlug(),
	permalink : getPermalink(),
	...(includeFeaturedImage && { featuredImage: getFeaturedImage() })
})