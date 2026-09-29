/**
 * Base Language class that all language implementations should extend.
 * Defines the interface and default behavior for language-specific functionality.
 *
 * @since 5.0.0
 */
export default class Language {
	constructor () {
		this.locale = null
		this.code = null
		this.researcher = null
	}

	getResearcher () {
		return this.researcher
	}
}