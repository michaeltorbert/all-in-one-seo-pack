import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN
const loadView = view => {
	return () => import(`../views/${view}.vue`)
}

export default [
	{
		path     : '/:pathMatch(.*)*',
		redirect : '/'
	},
	{
		path      : '/',
		name      : 'ai-bulk-generate',
		component : loadView('Main'),
		meta      : {
			access : 'aioseo_page_ai_content_settings',
			name   : __('AI Bulk Generate', td)
		}
	}
]