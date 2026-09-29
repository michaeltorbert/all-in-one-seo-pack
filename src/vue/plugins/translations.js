import { setLocaleData } from '@wordpress/i18n'

// In Web Workers, window is polyfilled as self (see tru-seo/index.js)
// This check ensures we're in a context where window exists (browser or polyfilled worker at runtime)
if ('undefined' !== typeof window && window.aioseoTranslations) {
	setLocaleData(window.aioseoTranslations.translations, import.meta.env.VITE_TEXTDOMAIN)

	if (window.aioseoTranslationsPro && window.aioseoTranslationsPro.translationsPro) {
		setLocaleData(window.aioseoTranslationsPro.translationsPro, import.meta.env.VITE_TEXTDOMAIN_PRO)
	}
} else if ('undefined' !== typeof window && window.aioseo) {
	// Check if AIOSEO is present at all. If not, we might be in another plugin like BLC.
	console.warn('AIOSEO translations couldn\'t be loaded.')
}

export * from '@wordpress/i18n'