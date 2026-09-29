/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import { createLinkFormat, isValidHref } from './utils'
import PositionedAtSelection from './positioned-at-selection'
import LinkEditor from './link-editor'
import LinkViewer from './link-viewer'

const wp = window.wp

const { __ } = wp.i18n
const { Component, createRef, useMemo, Fragment } = wp.element
const {
	ToggleControl,
	withSpokenMessages
} = wp.components
const { LEFT, RIGHT, UP, DOWN, BACKSPACE, ENTER, ESCAPE } = wp.keycodes
const { getRectangleFromRange } = wp.dom
const { prependHTTP } = wp.url
const {
	create,
	insert,
	isCollapsed,
	applyFormat,
	getTextContent,
	slice
} = wp.richText
const { URLPopover } = wp.blockEditor

const stopKeyPropagation = (event) => event.stopPropagation()

function isShowingInput (props, state) {
	return props.addingLink || state.editLink
}

const URLPopoverAtLink = ({ isActive, addingLink, value, resetOnMount, ...props }) => {
	const anchorRect = useMemo(() => {
		const selection = window.getSelection()
		const range = 0 < selection.rangeCount ? selection.getRangeAt(0) : null
		if (!range) {
			return
		}

		if (addingLink) {
			return getRectangleFromRange(range)
		}

		let element = range.startContainer

		// If the caret is right before the element, select the next element.
		element = element.nextElementSibling || element

		while (element.nodeType !== window.Node.ELEMENT_NODE) {
			element = element.parentNode
		}

		const closest = element.closest('a')
		if (closest) {
			return closest.getBoundingClientRect()
		}
	}, [ isActive, addingLink, value.start, value.end ])

	if (!anchorRect) {
		return null
	}

	resetOnMount(anchorRect)

	return <URLPopover anchorRect={ anchorRect } { ...props } />
}

class InlineLinkUI extends Component {
	constructor () {
		super(...arguments)

		this.editLink = this.editLink.bind(this)
		this.submitLink = this.submitLink.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onChangeInputValue = this.onChangeInputValue.bind(this)
		this.setLinkTarget = this.setLinkTarget.bind(this)
		this.setNoFollow = this.setNoFollow.bind(this)
		this.setSponsored = this.setSponsored.bind(this)
		this.setUgc = this.setUgc.bind(this)
		this.onFocusOutside = this.onFocusOutside.bind(this)
		this.resetState = this.resetState.bind(this)
		this.autocompleteRef = createRef()
		this.resetOnMount = this.resetOnMount.bind(this)

		this.state = {
			opensInNewWindow : false,
			noFollow         : false,
			sponsored        : false,
			ugc              : false,
			inputValue       : '',
			anchorRect       : false
		}
	}

	static getDerivedStateFromProps (props, state) {
		const { activeAttributes: { url, target, rel } } = props
		const opensInNewWindow = '_blank' === target

		const derivedState = {}

		if (!isShowingInput(props, state)) {
			if (url !== state.inputValue) {
				derivedState.inputValue = url
			}

			if (opensInNewWindow !== state.opensInNewWindow) {
				derivedState.opensInNewWindow = opensInNewWindow
			}

			if ('string' === typeof rel) {
				const noFollow  = rel.split(' ').includes('nofollow')
				const sponsored = rel.split(' ').includes('sponsored')
				const ugc       = rel.split(' ').includes('ugc')

				if (noFollow !== state.noFollow) {
					derivedState.noFollow = noFollow
				}

				if (sponsored !== state.sponsored) {
					derivedState.sponsored = sponsored
				}

				if (ugc !== state.ugc) {
					derivedState.ugc = ugc
				}
			}
		}

		return derivedState
	}

	onKeyDown (event) {
		if (-1 < [ LEFT, DOWN, RIGHT, UP, BACKSPACE, ENTER ].indexOf(event.keyCode)) {
			// Stop the key event from propagating up to ObserveTyping.startTypingInTextField.
			event.stopPropagation()
		}

		if (-1 < [ ESCAPE ].indexOf(event.keyCode)) {
			this.resetState()
		}
	}

	onChangeInputValue (inputValue) {
		this.setState({ inputValue })
	}

	setLinkTarget (opensInNewWindow) {
		const { activeAttributes: { url = '' }, value, onChange } = this.props

		this.setState({ opensInNewWindow })

		// Apply now if URL is not being edited.
		if (!isShowingInput(this.props, this.state)) {
			const selectedText = getTextContent(slice(value))

			onChange(applyFormat(value, createLinkFormat({
				url,
				opensInNewWindow,
				noFollow  : this.state.noFollow,
				sponsored : this.state.sponsored,
				ugc       : this.state.ugc,
				text      : selectedText
			})))
		}
	}

	setNoFollow (noFollow) {
		const { activeAttributes: { url = '' }, value, onChange } = this.props

		this.setState({ noFollow })

		// Apply now if URL is not being edited.
		if (!isShowingInput(this.props, this.state)) {
			const selectedText = getTextContent(slice(value))

			onChange(applyFormat(value, createLinkFormat({
				url,
				opensInNewWindow : this.state.opensInNewWindow,
				noFollow,
				sponsored        : this.state.sponsored,
				ugc              : this.state.ugc,
				text             : selectedText
			})))
		}
	}

	setSponsored (sponsored) {
		const { activeAttributes: { url = '' }, value, onChange } = this.props

		this.setState({ sponsored })

		// Apply now if URL is not being edited.
		if (!isShowingInput(this.props, this.state)) {
			const selectedText = getTextContent(slice(value))

			onChange(applyFormat(value, createLinkFormat({
				url,
				opensInNewWindow : this.state.opensInNewWindow,
				noFollow         : this.state.noFollow,
				sponsored,
				ugc              : this.state.ugc,
				text             : selectedText
			})))
		}
	}

	setUgc (ugc) {
		const { activeAttributes: { url = '' }, value, onChange } = this.props

		this.setState({ ugc })

		// Apply now if URL is not being edited.
		if (!isShowingInput(this.props, this.state)) {
			const selectedText = getTextContent(slice(value))

			onChange(applyFormat(value, createLinkFormat({
				url,
				opensInNewWindow : this.state.opensInNewWindow,
				noFollow         : this.state.noFollow,
				sponsored        : this.state.sponsored,
				ugc,
				text             : selectedText
			})))
		}
	}

	editLink (event) {
		this.setState({ editLink: true })
		event.preventDefault()
	}

	submitLink (event) {
		const { isActive, value, onChange, speak } = this.props
		const { inputValue, opensInNewWindow, noFollow, sponsored, ugc } = this.state
		const url = prependHTTP(inputValue)
		const selectedText = getTextContent(slice(value))
		const format = createLinkFormat({
			url,
			opensInNewWindow,
			noFollow,
			sponsored,
			ugc,
			text : selectedText
		})

		event.preventDefault()

		if (isCollapsed(value) && !isActive) {
			const toInsert = applyFormat(create({ text: url }), format, 0, url.length)
			onChange(insert(value, toInsert))
		} else {
			onChange(applyFormat(value, format))
		}

		this.resetState()

		if (!isValidHref(url)) {
			speak(__('Warning: the link has been inserted but could have errors. Please test it.', 'all-in-one-seo-pack'), 'assertive')
		} else if (isActive) {
			speak(__('Link edited.', 'all-in-one-seo-pack'), 'assertive')
		} else {
			speak(__('Link inserted.', 'all-in-one-seo-pack'), 'assertive')
		}
	}

	onFocusOutside () {
		// The autocomplete suggestions list renders in a separate popover (in a portal),
		// so onClickOutside fails to detect that a click on a suggestion occured in the
		// LinkContainer. Detect clicks on autocomplete suggestions using a ref here, and
		// return to avoid the popover being closed.
		const autocompleteElement = this.autocompleteRef.current
		if (autocompleteElement && autocompleteElement.contains(event.target)) {
			return
		}

		this.resetState()
	}

	resetState () {
		this.props.stopAddingLink()
		this.setState({ editLink: false })
	}

	resetOnMount (anchorRect) {
		if (this.state.anchorRect !== anchorRect) {
			this.setState({ opensInNewWindow: false, noFollow: false, sponsored: false, ugc: false, anchorRect: anchorRect })
		}
	}

	render () {
		const { isActive, activeAttributes: { url }, addingLink, value } = this.props

		if (!isActive && !addingLink) {
			return null
		}

		const { inputValue, opensInNewWindow, noFollow, sponsored, ugc } = this.state
		const showInput = isShowingInput(this.props, this.state)

		return (
			<PositionedAtSelection
				key={ `${value.start}${value.end}` /* Used to force rerender on selection change */ }
			>
				<URLPopoverAtLink
					resetOnMount={ this.resetOnMount }
					value={ value }
					isActive={ isActive }
					addingLink={ addingLink }
					onFocusOutside={ this.onFocusOutside }
					onClose={ () => {
						if (!inputValue) {
							this.resetState()
						}
					} }
					focusOnMount={ showInput ? 'firstElement' : false }
					renderSettings={ () => (
						<Fragment>
							<ToggleControl
								label={ __('Open in New Tab', 'all-in-one-seo-pack') }
								checked={ opensInNewWindow }
								onChange={ this.setLinkTarget }
							/>
							<ToggleControl
								label={ __('Add "nofollow" to link', 'all-in-one-seo-pack') }
								checked={ noFollow }
								onChange={ this.setNoFollow }
							/>
							<ToggleControl
								label={ __('Add "sponsored" to link', 'all-in-one-seo-pack') }
								checked={ sponsored }
								onChange={ this.setSponsored }
							/>
							<ToggleControl
								label={ __('Add "ugc" to link', 'all-in-one-seo-pack') }
								checked={ ugc }
								onChange={ this.setUgc }
							/>
						</Fragment>
					) }
				>
					{ showInput
						? (
							<LinkEditor
								className="editor-format-toolbar__link-container-content block-editor-format-toolbar__link-container-content"
								value={ inputValue }
								onChangeInputValue={ this.onChangeInputValue }
								onKeyDown={ this.onKeyDown }
								onKeyPress={ stopKeyPropagation }
								onSubmit={ this.submitLink }
								autocompleteRef={ this.autocompleteRef }
							/>
						)
						: (
							<LinkViewer
								className="editor-format-toolbar__link-container-content block-editor-format-toolbar__link-container-content"
								onKeyPress={ stopKeyPropagation }
								url={ url }
								onEditLinkClick={ this.editLink }
								linkClassName={ isValidHref(prependHTTP(url)) ? undefined : 'has-invalid-link' }
							/>
						) }

				</URLPopoverAtLink>
			</PositionedAtSelection>
		)
	}
}

export default withSpokenMessages(InlineLinkUI)