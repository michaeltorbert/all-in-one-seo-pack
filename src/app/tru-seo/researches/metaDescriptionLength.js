import countMetaDescriptionLength from '@/app/tru-seo/languageProcessing/helpers/word/countMetaDescriptionLength'

/**
 * Count the meta description length.
 *
 * @param {Paper} paper The paper to check for images.
 *
 * @returns {number|*}  The meta description length.
 */
export default function metaDescriptionLength (paper) {
	return countMetaDescriptionLength(paper.getDate(), paper.getDescription())
}