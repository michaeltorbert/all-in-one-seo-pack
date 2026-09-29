/**
 * Interpreters a score and gives it a particular rating.
 *
 * @param {number} score The score to interpreter.
 * @returns {string} The rating, given based on the score.
 */
const ScoreToRating = function (score) {
	if (-1 === score) {
		return 'error'
	}

	if (0 === score) {
		return 'feedback'
	}

	if (4 >= score) {
		return 'bad'
	}

	if (4 < score && 7 >= score) {
		return 'ok'
	}

	if (7 < score) {
		return 'good'
	}

	return ''
}

export default ScoreToRating