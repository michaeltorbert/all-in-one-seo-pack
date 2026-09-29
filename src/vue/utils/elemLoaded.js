/**
 * Prints an invisible CSS keyframes animation to the page.
 * You can then listen for this animation to detect when an element is available.
 *
 * // Example usage.
 * elemLoaded('.snippet-title-row', 'tagsVisible')
 * document.addEventListener('animationstart', function (event) {
 * 	if ('tagsVisible' === event.animationName) {
 * 		const postTitleTags = document.querySelector('.snippet-title-row')
 * 		if (postTitleTags) {
 * 			updateTagInput(postTitleTags)
 * 		}
 * 	}
 * }, false)
 *
 * @param  {string} selector A CSS selector for the element.
 * @param  {string} namedAnimation An identifier for the animationName. *
 */

export const elemLoaded = (selector, namedAnimation) => {
	// Add CSS animation we'll listen for.
	const style = document.createElement('style')
	style.innerHTML =
		`@keyframes ${namedAnimation} {
			from { opacity: 0.99; }
			to { opacity: 1; }
		}
		${selector} {
			animation-duration: 0.001s;
			animation-name: ${namedAnimation};
		}`

	document.head.appendChild(style)
}