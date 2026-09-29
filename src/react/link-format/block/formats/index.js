// jshint ignore: start
/* eslint-disable */

/**
 * Internal dependencies
 */
import { link } from './link';

/**
 * WordPress dependencies
 */
const { registerFormatType, unregisterFormatType } = wp.richText;

function registerFormats() {
	[ link ].forEach( ( { name, ...settings } ) => {
		if ( name ) {
			unregisterFormatType('core/link');
			registerFormatType( name, settings )
		}
	} );
}

registerFormats();