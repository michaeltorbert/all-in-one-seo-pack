/**
 * External dependencies
 */
import classnames from 'classnames'

/**
 * Internal dependencies
 */
import URLInput from './url-input'

const wp = window.wp

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n
const { IconButton } = wp.components

export default function LinkEditor ({
	autocompleteRef,
	className,
	onChangeInputValue,
	value,
	...props
}) {
	return (
		<form
			className={ classnames(
				'block-editor-url-popover__link-editor',
				className
			) }
			{ ...props }
		>
			<URLInput
				value={ value }
				onChange={ onChangeInputValue }
				autocompleteRef={ autocompleteRef }
			/>
			<IconButton icon="editor-break" label={ __('Apply', 'all-in-one-seo-pack') } type="submit" />
		</form>
	)
}