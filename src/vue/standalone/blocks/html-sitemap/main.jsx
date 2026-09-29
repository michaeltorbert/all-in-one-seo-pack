import { registerBlock, useBlockProps } from '../utils'

import { h, createApp } from 'vue'
import { observeElement } from '@/vue/utils/helpers'

import icon from './icon'
import metadata from './block.json'

import { maybeDeleteBlockVueApp, panelBodyMountTarget, useBlockSettingsRemount } from '@/vue/standalone/blocks/utils'

import loadPlugins from '@/vue/plugins'
import { loadPiniaStores } from '@/vue/stores'
import SidebarOptions from './vue/SidebarOptions'

import loadComponents from '@/vue/components/common'
import loadVersionedComponents from '@/vue/components/AIOSEO_VERSION'

import { __ } from '@/vue/plugins/translations'
const td = import.meta.env.VITE_TEXTDOMAIN

const {
	name,
	title,
	description,
	category,
	supports,
	attributes
} = metadata
export { metadata, name }

const wp                = window.wp
const ServerSideRender  = wp.serverSideRender || wp.components.ServerSideRender
const InspectorControls = wp.blockEditor?.InspectorControls || wp.editor.InspectorControls
const PanelBody         = wp.components.PanelBody

const initialBlockState = {}
const htmlSitemapSidebarApps = []

export const settings = {
	title,
	description,
	category,
	supports,
	attributes,
	icon,
	edit : function (props) {
		const blockProps = useBlockProps()
		const { setAttributes, attributes, clientId, isSelected, toggleSelection } = props
		const vueAioseoId = 'aioseo-' + clientId

		// Default dynamic attribute
		attributes.is_admin = window?.location && window?.location?.pathname.startsWith('/wp-admin/')

		const observeElementArgs = {
			id      : vueAioseoId,
			parent  : document.querySelector('.block-editor'),
			subtree : true,
			loop    : false,
			done    : function (node) {
				maybeDeleteBlockVueApp(clientId, htmlSitemapSidebarApps)

				let app = createApp({
					name : 'Blocks/HtmlSitemap',
					data : function () {
						return initialBlockState[clientId]
					},
					watch : {
						$data : {
							handler : function (val) {
								setAttributes(val)
							},
							deep : true
						}
					},
					render : () => h(SidebarOptions)
				})

				app = loadPlugins(app)
				app = loadComponents(app)
				app = loadVersionedComponents(app)

				loadPiniaStores(app)

				app.mount(node)

				htmlSitemapSidebarApps.push({ id: clientId, app })
			}
		}

		if (isSelected) {
			// Refresh the initial state object.
			initialBlockState[clientId] = {}
			Object.keys(attributes).forEach((key) => {
				initialBlockState[clientId][key] = attributes[key]
			})

			observeElement(observeElementArgs)
		}

		useBlockSettingsRemount(toggleSelection)

		return (
			<>
				<InspectorControls>
					<PanelBody title={__('Block Settings', td)} initialOpen={true}>
						{panelBodyMountTarget(vueAioseoId)}
					</PanelBody>
				</InspectorControls>
				<div {...blockProps}>
					<ServerSideRender
						block={name}
						attributes={{ ...attributes }}
					/>
				</div>
			</>
		)
	},
	save : function () {
		return null
	}
}

registerBlock({
	name,
	settings
})