export const getVideos = (content) => {
	if ('string' !== typeof content) {
		if (content instanceof HTMLIFrameElement || content instanceof HTMLVideoElement) {
			content = content.outerHTML
		} else {
			content = content?.innerHTML || ''
		}
	}

	const videos = [].concat(
		match(content, '<iframe(?:[^>]+)?>'),
		match(content, '\\[video( [^\\]]+?)?\\]'),
		match(content, '<video(?:[^>]+)?>'),
			match(content, /(http:\/\/|https:\/\/|)(player.|www.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com))\/(video\/|embed\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/) // eslint-disable-line
	)

	return videos.length
}

export const getImages = (content) => {
	if ('string' !== typeof content) {
		if (content instanceof HTMLImageElement) {
			content = content.outerHTML
		} else {
			content = content?.innerHTML || ''
		}
	}

	const images = [].concat(
		match(content, '<img(?:[^>]+)?>'),
		match(content, '\\[gallery( [^\\]]+?)?\\]')
	)

	return images.length
}

export function match (text, regexString) {
	const regex = new RegExp(regexString, 'ig')
	const matches = text.match(regex)

	return null === matches ? [] : matches
}