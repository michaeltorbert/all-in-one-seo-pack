import { registerBlock } from '../utils'

import icon from './icon'
import metadata from './block.json'

import { edit } from './edit'
import { save, deprecatedSave } from './save'

const {
	name,
	title,
	description,
	category,
	supports,
	attributes
} = metadata
export { metadata, name }

export const settings = {
	title,
	description,
	category,
	supports,
	attributes,
	icon,
	deprecated : [
		{
			attributes,
			supports,
			save : deprecatedSave
		}
	],
	edit,
	save
}

registerBlock({
	name,
	settings
})