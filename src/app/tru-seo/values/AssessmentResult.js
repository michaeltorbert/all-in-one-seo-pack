import { isArray, isNumber, isUndefined } from '@/app/tru-seo/helpers'

// import Mark from './Mark'

/**
 * A function that only returns an empty that can be used as an empty marker
 *
 * @returns {Array} A list of empty marks.
 */
const emptyMarker = () => []

/**
 * Represents the assessment result.
 */
class AssessmentResult {
	/**
	 * Constructs the AssessmentResult value object.
	 *
	 * @param {Object} [values] The values for this assessment result.
	 * @param {number} [values.score] The score for this assessment result.
	 * @param {string} [values.text] The text for this assessment result. This is the text that can be used as a feedback message associated with the score.
	 * @param {Array} [values.marks] The marks for this assessment result.
	 * @param {boolean} [values._hasJumps] Whether this result causes a jump to a different field.
	 * @constructor
	 * @returns {void}
	 */
	constructor (values) {
		this._hasScore = false
		this._identifier = ''
		this._hasMarks = false
		this._hasJumps = false
		this._marker = emptyMarker
		this.score = 0
		this.text = ''
		this.title = ''
		this.marks = []

		if (isUndefined(values)) {
			values = {}
		}

		if (!isUndefined(values.score)) {
			this.setScore(values.score)
		}

		if (!isUndefined(values.text)) {
			this.setText(values.text)
		}

		if (!isUndefined(values.marks)) {
			this.setMarks(values.marks)
		}

		if (!isUndefined(values._hasJumps)) {
			this.setHasJumps(values._hasJumps)
		}
	}

	/**
	 * Checks if a score is available.
	 * @returns {boolean} Whether or not a score is available.
	 */
	hasScore () {
		return this._hasScore
	}

	/**
	 * Gets the available score.
	 * @returns {number} The score associated with the AssessmentResult.
	 */
	getScore () {
		return this.score
	}

	/**
	 * Sets the score for the assessment.
	 * @param {number} score The score to be used for the score property.
	 * @returns {void}
	 */
	setScore (score) {
		if (isNumber(score)) {
			this.score = Math.max(0, Math.min(9, score))
			this._hasScore = true
		}
	}

	/**
	 * Checks if a text for the assessment result is available.
	 * @returns {boolean} Whether or not a text is available.
	 */
	hasText () {
		return '' !== this.text
	}

	/**
	 * Gets the available text for the assessment result.
	 * @returns {string} The text associated with the AssessmentResult.
	 */
	getText () {
		return this.text
	}

	/**
	 * Sets the text for the assessment.
	 * @param {string} text The text to be used for the text property.
	 * @returns {void}
	 */
	setText (text) {
		if (isUndefined(text)) {
			text = ''
		}

		this.text = text
	}

	/**
	 * Checks if a title for the assessment result is available.
	 * @returns {boolean} Whether or not a title is available.
	 */
	hasTitle () {
		return '' !== this.title
	}

	/**
	 * Gets the available title for the assessment result.
	 * @returns {string} The title associated with the AssessmentResult.
	 */
	getTitle () {
		return this.title
	}

	/**
	 * Sets the title for the assessment.
	 * @param {string} title The title to be used for the title property.
	 * @returns {void}
	 */
	setTitle (title) {
		if (isUndefined(title)) {
			title = ''
		}

		this.title = title
	}

	/**
	 * Gets the available marks.
	 *
	 * @returns {Array} The marks associated with the AssessmentResult.
	 */
	getMarks () {
		return this.marks
	}

	/**
	 * Sets the marks for the assessment.
	 *
	 * @param {Array} marks The marks to be used for the marks property.
	 *
	 * @returns {void}
	 */
	setMarks (marks) {
		if (isArray(marks)) {
			this.marks = marks
			this._hasMarks = 0 < marks.length
		}
	}

	/**
	 * Sets the identifier.
	 *
	 * @param {string} identifier An alphanumeric identifier for this result.
	 * @returns {void}
	 */
	setIdentifier (identifier) {
		this._identifier = identifier
	}

	/**
	 * Gets the identifier.
	 *
	 * @returns {string} An alphanumeric identifier for this result.
	 */
	getIdentifier () {
		return this._identifier
	}

	/**
	 * Sets the marker, a pure function that can return the marks for a given Paper.
	 *
	 * @param {Function} marker The marker to set.
	 * @returns {void}
	 */
	setMarker (marker) {
		this._marker = marker
	}

	/**
	 * Returns whether this result has a marker that can be used to mark for a given Paper.
	 *
	 * @returns {boolean} Whether this result has a marker.
	 */
	hasMarker () {
		return this._hasMarks && this._marker !== emptyMarker
	}

	/**
	 * Gets the marker, a pure function that can return the marks for a given Paper.
	 *
	 * @returns {Function} The marker.
	 */
	getMarker () {
		return this._marker
	}

	/**
	 * Sets the value of _hasMarks to determine if there is something to mark.
	 *
	 * @param {boolean} hasMarks Is there something to mark.
	 * @returns {void}
	 */
	setHasMarks (hasMarks) {
		this._hasMarks = hasMarks
	}

	/**
	 * Returns the value of _hasMarks to determine if there is something to mark.
	 *
	 * @returns {boolean} Is there something to mark.
	 */
	hasMarks () {
		return this._hasMarks
	}

	/**
	 * Sets the value of _hasJumps to determine whether it's needed to jump to a different field.
	 *
	 * @param {boolean} hasJumps Whether this result causes a jump to a different field.
	 * @returns {void}
	 */
	setHasJumps (hasJumps) {
		this._hasJumps = hasJumps
	}

	/**
	 * Returns the value of _hasJumps to determine whether it's needed to jump to a different field.
	 *
	 * @returns {bool} Whether this result causes a jump to a different field.
	 */
	hasJumps () {
		return this._hasJumps
	}

	/**
	 * Serializes the AssessmentResult instance to an object.
	 *
	 * @returns {Object} The serialized AssessmentResult.
	 */
	serialize () {
		const serializedMarks = this.marks.map(m => m.serialize())
		const highlightSentences = this.marks
			.map(m => m.getOriginal())
			.filter(Boolean)

		return {
			_parseClass        : 'AssessmentResult',
			identifier         : this._identifier,
			score              : this.score,
			text               : this.text,
			title              : this.title,
			marks              : serializedMarks,
			highlightSentences : highlightSentences
		}
	}

	/**
	 * Parses the object to an AssessmentResult.
	 *
	 * @param {Object} serialized The serialized object.
	 *
	 * @returns {AssessmentResult} The parsed AssessmentResult.
	 */
	static parse (serialized) {
		const result = new AssessmentResult({
			title : serialized.title,
			text  : serialized.text,
			score : serialized.score
		})

		result.setIdentifier(serialized.identifier)
		result.setTitle(serialized.title)

		if (serialized.marks) {
			result.marks = serialized.marks
			result._hasMarks = 0 < serialized.marks.length
		}

		if (serialized.highlightSentences) {
			result.highlightSentences = serialized.highlightSentences
		}

		return result
	}
}

export default AssessmentResult