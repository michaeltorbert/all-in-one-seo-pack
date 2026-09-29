// List of video oEmbed domains to detect.
const videoOEmbedDomains = [
	'youtube\\.com',
	'youtu\\.be',
	'vimeo\\.com',
	'player\\.vimeo\\.com',
	'dailymotion\\.com',
	'dai\\.ly',
	'videopress\\.com',
	'animoto\\.com',
	'tiktok\\.com'
]

/**
 * Checks the amount of videos in the text.
 *
 * @param {Paper} paper The paper to check for videos.
 *
 * @returns {number} The amount of found videos.
 */
export default function countVideoInText (paper) {
	const text = paper.getText()

	// Build domain pattern from array (escaping already done in the array).
	const domainPattern = videoOEmbedDomains.join('|')

	// Match HTML5 video tags.
	const videoTag = /(<video).*?(<\/video>)/igs

	// Match oEmbed videos with src attribute (YouTube, Vimeo, Dailymotion, etc.).
	const oEmbedIframe = new RegExp('<iframe[^>]*src=["\']https?://(?:www\\.)?(' + domainPattern + ')[^>]*>', 'ig')

	// Match WordPress sandbox iframes with video platform in title attribute.
	const wpSandboxVideo = new RegExp('<iframe[^>]*title=["\'][^"\']*(?:' + domainPattern + ')[^"\']*["\'][^>]*>', 'ig')

	// Match WordPress video embed blocks.
	const wpVideoEmbed = /wp-block-embed.*?is-type-video|wp-embed-aspect.*?video/ig

	// Match videos occurrences in the text and save the matches in arrays.
	const videoMatches = text.match(videoTag) || []
	const oEmbedMatches = text.match(oEmbedIframe) || []
	const wpSandboxMatches = text.match(wpSandboxVideo) || []
	const wpEmbedMatches = text.match(wpVideoEmbed) || []

	// Combine all matches.
	return videoMatches.length + oEmbedMatches.length + wpSandboxMatches.length + wpEmbedMatches.length
}