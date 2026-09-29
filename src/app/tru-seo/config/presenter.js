import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

/**
 * Returns the configuration used for score ratings and the AssessorPresenter.
 * @returns {Object} The config object.
 */
export default function () {
	const contentOptimizationLabel = __('Content optimization:', td)
	return {
		feedback : {
			className                   : 'na',
			screenReaderText            : __('Heads up', td),
			fullText                    : `${contentOptimizationLabel} ${__('Heads up', td)}`,
			screenReaderReadabilityText : __('Heads up', td)
		},
		bad : {
			className                   : 'bad',
			screenReaderText            : __('Needs improvement', td),
			fullText                    : `${contentOptimizationLabel} ${__('Needs improvement', td)}`,
			screenReaderReadabilityText : __('Needs improvement', td)
		},
		ok : {
			className                   : 'ok',
			screenReaderText            : __('OK', td),
			fullText                    : `${contentOptimizationLabel} ${__('OK', td)}`,
			screenReaderReadabilityText : __('OK', td)
		},
		good : {
			className                   : 'good',
			screenReaderText            : __('Good', td),
			fullText                    : `${contentOptimizationLabel} ${__('Good', td)}`,
			screenReaderReadabilityText : __('Good', td)
		}
	}
}