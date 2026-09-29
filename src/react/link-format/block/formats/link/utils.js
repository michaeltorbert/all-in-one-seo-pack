/**
 * External dependencies
 */
import { startsWith } from 'lodash-es'

/**
 * WordPress dependencies
 */
import {
	getProtocol,
	isValidProtocol,
	getAuthority,
	isValidAuthority,
	getPath,
	isValidPath,
	getQueryString,
	isValidQueryString,
	getFragment,
	isValidFragment
} from '@wordpress/url'

/**
 * Check for issues with the provided href.
 *
 * @param {string} href The href.
 *
 * @returns {boolean} Is the href invalid?
 */
export function isValidHref (href) {
	if (!href) {
		return false
	}

	const trimmedHref = href.trim()

	if (!trimmedHref) {
		return false
	}

	// Does the href start with something that looks like a URL protocol?
	if (/^\S+:/.test(trimmedHref)) {
		const protocol = getProtocol(trimmedHref)
		if (!isValidProtocol(protocol)) {
			return false
		}

		// Add some extra checks for http(s) URIs, since these are the most common use-case.
		// This ensures URIs with an http protocol have exactly two forward slashes following the protocol.
		if (
			startsWith(protocol, 'http') &&
			!/^https?:\/\/[^/\s]/i.test(trimmedHref)
		) {
			return false
		}

		const authority = getAuthority(trimmedHref)
		if (!isValidAuthority(authority)) {
			return false
		}

		const path = getPath(trimmedHref)
		if (path && !isValidPath(path)) {
			return false
		}

		const queryString = getQueryString(trimmedHref)
		if (queryString && !isValidQueryString(queryString)) {
			return false
		}

		const fragment = getFragment(trimmedHref)
		if (fragment && !isValidFragment(fragment)) {
			return false
		}
	}

	// Validate anchor links.
	if (startsWith(trimmedHref, '#') && !isValidFragment(trimmedHref)) {
		return false
	}

	return true
}

/**
 * Generates the format object that will be applied to the link text.
 *
 * NOTE: Attributes are replaced wholesale, so omitting one clears it from the link.
 *
 * @param {Object}  options                  The options.
 * @param {string}  options.url              The href of the link.
 * @param {boolean} options.opensInNewWindow Whether this link will open in a new window.
 * @param {boolean} options.nofollow         Whether to add rel="nofollow".
 * @param {boolean} options.sponsored        Whether to add rel="sponsored".
 * @param {boolean} options.ugc              Whether to add rel="ugc".
 * @param {string}  options.title            The title attribute; blank clears it.
 *
 * @returns {Object} The final format object.
 */
export function createLinkFormat ({ url, opensInNewWindow, nofollow, sponsored, ugc, title }) {
	const format = {
		type       : 'core/link',
		attributes : {
			url
		}
	}

	const relAttributes = []

	if (opensInNewWindow) {
		format.attributes.target = '_blank'
		relAttributes.push('noopener')
	}

	if (nofollow) {
		relAttributes.push('nofollow')
	}

	if (sponsored) {
		relAttributes.push('sponsored')
	}

	if (ugc) {
		relAttributes.push('ugc')
	}

	if (0 < relAttributes.length) {
		format.attributes.rel = relAttributes.join(' ')
	}

	const trimmedTitle = title?.trim()

	if (trimmedTitle) {
		format.attributes.title = trimmedTitle
	}

	return format
}