/* globals ETBuilderBackendDynamic */
import { cleanForSlug } from '@/vue/utils/cleanForSlug'

/**
 * Get the legacy featured image ID.
 *
 * @returns {number} The image ID.
 */
export const getLegacyFeaturedImageId = () => {
	return ETBuilderBackendDynamic?.currentPage?.thumbnailId || 0
}

/**
 * Get the legacy permalink.
 *
 * @returns {string} The permalink.
 */
export const getLegacyPermalink = () => {
	return ETBuilderBackendDynamic?.currentPage?.permalink
}

/**
 * Get the legacy title.
 *
 * @returns {string} The title.
 */
export const getLegacyTitle = () => {
	return ETBuilderBackendDynamic?.postTitle || ''
}

/**
 * Get the legacy excerpt.
 *
 * @returns {string} The excerpt.
 */
export const getLegacyExcerpt = () => {
	return ETBuilderBackendDynamic?.postMeta?.post_excerpt || ''
}

/**
 * Get the legacy slug.
 *
 * @returns {string} The slug.
 */
export const getLegacySlug = () => {
	return ETBuilderBackendDynamic?.postMeta?.post_name || cleanForSlug(ETBuilderBackendDynamic?.postTitle || '')
}