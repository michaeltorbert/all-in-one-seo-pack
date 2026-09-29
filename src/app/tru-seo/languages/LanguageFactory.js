// Only import the language code resolver statically.
// Language classes are loaded dynamically for code splitting.
import getLanguage from '@/app/tru-seo/languages/getLanguage.js'

/**
 * Dynamic import loaders for each supported language.
 * Using dynamic imports enables Vite/Webpack to code-split each language into separate chunks.
 *
 * @since 5.0.0
 */
const languageLoaders = {
	en : () => import('@/app/tru-seo/languages/en/EnLanguage.js').then(m => m.EnLanguage),
	de : () => import('@/app/tru-seo/languages/de/DeLanguage.js').then(m => m.DeLanguage),
	fr : () => import('@/app/tru-seo/languages/fr/FrLanguage.js').then(m => m.FrLanguage),
	es : () => import('@/app/tru-seo/languages/es/EsLanguage.js').then(m => m.EsLanguage),
	nl : () => import('@/app/tru-seo/languages/nl/NlLanguage.js').then(m => m.NlLanguage),
	it : () => import('@/app/tru-seo/languages/it/ItLanguage.js').then(m => m.ItLanguage),
	pt : () => import('@/app/tru-seo/languages/pt/PtLanguage.js').then(m => m.PtLanguage),
	pl : () => import('@/app/tru-seo/languages/pl/PlLanguage.js').then(m => m.PlLanguage),
	ru : () => import('@/app/tru-seo/languages/ru/RuLanguage.js').then(m => m.RuLanguage),
	sv : () => import('@/app/tru-seo/languages/sv/SvLanguage.js').then(m => m.SvLanguage),
	id : () => import('@/app/tru-seo/languages/id/IdLanguage.js').then(m => m.IdLanguage),
	ar : () => import('@/app/tru-seo/languages/ar/ArLanguage.js').then(m => m.ArLanguage),
	ca : () => import('@/app/tru-seo/languages/ca/CaLanguage.js').then(m => m.CaLanguage),
	hu : () => import('@/app/tru-seo/languages/hu/HuLanguage.js').then(m => m.HuLanguage),
	cs : () => import('@/app/tru-seo/languages/cs/CsLanguage.js').then(m => m.CsLanguage),
	el : () => import('@/app/tru-seo/languages/el/ElLanguage.js').then(m => m.ElLanguage),
	fa : () => import('@/app/tru-seo/languages/fa/FaLanguage.js').then(m => m.FaLanguage),
	he : () => import('@/app/tru-seo/languages/he/HeLanguage.js').then(m => m.HeLanguage),
	ja : () => import('@/app/tru-seo/languages/ja/JaLanguage.js').then(m => m.JaLanguage),
	nb : () => import('@/app/tru-seo/languages/nb/NbLanguage.js').then(m => m.NbLanguage),
	sk : () => import('@/app/tru-seo/languages/sk/SkLanguage.js').then(m => m.SkLanguage),
	tr : () => import('@/app/tru-seo/languages/tr/TrLanguage.js').then(m => m.TrLanguage)
}

/**
 * Cache for language instances to avoid recreating them.
 *
 * @since 5.0.0
 */
const languageInstances = {}

/**
 * Asynchronously loads and returns a language instance for the given locale.
 * Uses dynamic imports for code splitting - only the requested language is loaded.
 *
 * @since 5.0.0
 * @param {string} locale The locale to get language instance for (e.g., 'en_US', 'de_DE').
 * @returns {Promise<Language>} Promise resolving to the language instance.
 */
export async function loadLanguageInstance (locale) {
	const langCode = getLanguage(locale)

	// Return cached instance if exists.
	if (languageInstances[langCode]) {
		return languageInstances[langCode]
	}

	// Load language class dynamically if supported.
	const loader = languageLoaders[langCode]

	if (loader) {
		try {
			const LanguageClass = await loader()
			languageInstances[langCode] = new LanguageClass()

			return languageInstances[langCode]
		} catch (error) {
			console.warn(`Failed to load language "${langCode}", falling back to English:`, error)
		}
	}

	// Default to English if language not found or failed to load.
	if (!languageInstances?.en) {
		const EnLanguage = await languageLoaders.en()
		languageInstances.en = new EnLanguage()
	}

	return languageInstances.en
}