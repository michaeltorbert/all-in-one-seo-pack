import fs from 'fs'
import path from 'path'

export default function jsonToPhp (files = []) {
	const log = msg => console.log('\x1b[36m%s\x1b[0m', msg)

	// Every JS/CSS/asset path the manifest points at, relative to the assets dir.
	const referencedFiles = manifest => {
		const paths = []

		Object.values(manifest).forEach(entry => {
			if (entry.file) {
				paths.push(entry.file)
			}

			paths.push(...(entry.css || []), ...(entry.assets || []))
		})

		return [ ...new Set(paths) ]
	}

	return {
		name : 'aioseo-rollup-plugin-json-to-php',
		writeBundle () {
			files.forEach(file => {
				log(`Convert JSON to PHP: ${file.from} → ${file.to}`)

				const json = fs.readFileSync(file.from, 'utf8')

				// The manifest is emitted into `<assetsDir>/.vite/`, and every path inside it is
				// relative to that assets dir.
				const assetsDir = path.dirname(path.dirname(file.from))
				const ignore    = file.ignore || []
				const missing   = referencedFiles(JSON.parse(json))
					.filter(asset => !ignore.includes(asset))
					.filter(asset => !fs.existsSync(path.join(assetsDir, asset)))

				// A manifest that points at files which aren't there blanks every Vue admin page,
				// with no PHP error and no console error to go on. Never let it out of the build.
				if (missing.length) {
					this.error(`${file.to} references ${missing.length} file(s) missing from ${assetsDir}: ${missing.join(', ')}`)
				}

				let phpContents = '<?php\n// phpcs:disable\n/* THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY. */\n$manifestJson = \''

				// Add the PHP data.
				phpContents += json
				phpContents += '\';'

				// For Windows users we have to replace backslashes with forward slashes.
				// Otherwise the manifest JSON isn't valid.
				phpContents = phpContents.replace(/\\\\/g, '/')

				fs.writeFileSync(file.to, phpContents)
				fs.rmSync(file.from)

				log(`• Generated PHP file ${file.to}`)
			})
		}
	}
}