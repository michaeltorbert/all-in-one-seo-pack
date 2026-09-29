import { useBlockPropsSave } from '../utils'

const {
	InnerBlocks
} = window.wp.blockEditor

export default function save () {
	const blockProps = useBlockPropsSave()
	return (
		<div {...blockProps}>
			<div className="aioseo-key-points-block-content">
				<InnerBlocks.Content />
			</div>
		</div>
	)
}

export function deprecatedSave ({ className }) {
	return (
		<div className={className}>
			<div className="aioseo-key-points-block-content">
				<InnerBlocks.Content />
			</div>
		</div>
	)
}
