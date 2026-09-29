const autoLoadComponents = (app, components, prefix = '') => {
	Object.keys(components).forEach(k => {
		const component = components[k]

		if ('Index' === k) {
			k = ''
		}

		app.component(`${prefix}${k}`, component)
	})
}

export {
	autoLoadComponents
}