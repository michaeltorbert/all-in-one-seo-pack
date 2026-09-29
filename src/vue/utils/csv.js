/**
 * Parses a single CSV row, handling quoted fields (RFC 4180).
 *
 * @since 4.9.6
 *
 * @param {string} row The CSV row string.
 * @returns {Array}    An array of field values.
 */
export const parseCsvRow = (row) => {
	const fields = []
	let current  = '',
	 inQuotes = false

	for (let i = 0; i < row.length; i++) {
		const char = row[i]

		if (inQuotes) {
			if ('"' === char) {
				if (i + 1 < row.length && '"' === row[i + 1]) {
					current += '"'
					i++
				} else {
					inQuotes = false
				}
			} else {
				current += char
			}
		} else if ('"' === char) {
			inQuotes = true
		} else if (',' === char) {
			fields.push(current)
			current = ''
		} else {
			current += char
		}
	}

	fields.push(current)

	return fields
}

/**
 * Parses an entire CSV string into rows, handling quoted fields
 * that may contain newlines (RFC 4180).
 *
 * @since 4.9.6
 *
 * @param {string} csvString The full CSV string.
 * @returns {Array}          An array of rows, each being an array of field values.
 */
export const parseCsv = (csvString) => {
	const lines   = []
	let current   = '',
	 inQuotes  = false

	for (let i = 0; i < csvString.length; i++) {
		const char = csvString[i]

		if ('"' === char) {
			inQuotes = !inQuotes
		}

		if (!inQuotes && ('\n' === char || '\r' === char)) {
			if ('\r' === char && '\n' === csvString[i + 1]) {
				i++
			}

			lines.push(current)
			current = ''
			continue
		}

		current += char
	}

	lines.push(current)

	return lines
		.map(line => parseCsvRow(line))
		.filter(row => /\S/.test(row.join('')))
}

export const arrayToCsv = (value) => {
	return value.map(function (d) {
		if ('object' === typeof d) {
			return JSON.stringify(Object.values(d))
		}

		return d
	})
		.join('\n')
		.replace(/(^\[)|(\]$)/mg, '')
}