const test = text => {
	// Single char. U+20E3 to detect keycaps. U+00A9 "copyright sign" and U+00AE "registered sign" not included.
	// eslint-disable-next-line no-misleading-character-class
	const single = /[\u203C\u2049\u20E3\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2300\u231A\u231B\u2328\u2388\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638\u2639\u263A\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267B\u267F\u2692\u2693\u2694\u2696\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753\u2754\u2755\u2757\u2763\u2764\u2795\u2796\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05\u2B06\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]/
	// Surrogate pair range. Only tests for the second half.
	const pair = /[\uDC00-\uDFFF]/

	if (text) {
		return  pair.test(text) || single.test(text)
	}

	return false
}

const confirmRevertingEmoji = node => {
	// If the class name of a non-element node doesn't contain 'emoji' and it's not an image.
	if (
		!node ||
		'IMG' !== node.nodeName ||
		-1 === node.className.indexOf('emoji')
	) {
		return null
	}

	if (!test(node.getAttribute('alt'))) {
		return null
	}

	return node
}

const processSwappingNodes = swapNodes => {
	swapNodes.forEach(n => {
		const text = document.createTextNode(n.getAttribute('alt'))
		n.parentNode.classList.add('wp-exclude-emoji')
		n.parentNode.replaceChild(text, n)
	})
}

const processAddEmojiExclusion = node => {
	// If the node is not a ql-editor node.
	if (
		!node ||
		'DIV' !== node.nodeName ||
		-1 === node.className.indexOf('ql-editor')
	) {
		return
	}

	node.querySelectorAll('.ql-editor > p').forEach(p => {
		p.classList.add('wp-exclude-emoji')
	})
}

const observe = () => {
	// If the emoji being replaced is inside our app, we want to convert it back with a class that tells the wp emoji script to exclude it.
	const revertEmoji = mutationRecords => {
		let i = mutationRecords.length,
			addedNodes, ii, node

		const swapNodes = []
		while (i--) {
			addedNodes = mutationRecords[i].addedNodes
			ii         = addedNodes.length

			// Loop through all the added nodes.
			while (ii--) {
				node = addedNodes[ii]

				const swapNode = confirmRevertingEmoji(node)

				if (swapNode) {
					processAddEmojiExclusion(node)
					swapNodes.push(swapNode)
				}
			}
		}

		processSwappingNodes(swapNodes)
	}

	const mutationObserver = new MutationObserver(revertEmoji)

	const aioseoAppWraps = document.querySelectorAll('.aioseo-app, .vue-portal-target')
	aioseoAppWraps.forEach(aioseoApp => {
		mutationObserver.observe(aioseoApp, {
			childList : true,
			subtree   : true
		})
	})

	// Revert emoji that triggered on start.
	const allEmoji = document.querySelectorAll('.aioseo-app img.emoji')
	const swapNodes = []
	allEmoji.forEach(emoji => {
		const swapNode = confirmRevertingEmoji(emoji)
		if (swapNode) {
			swapNodes.push(swapNode)
		}
	})

	processSwappingNodes(swapNodes)
}

document.addEventListener('DOMContentLoaded', observe)