import mapValues from 'lodash-es/mapValues'
import { isArray, isObject } from '@/app/tru-seo/helpers'

/**
 * Serializes a data structure to transfer it over a web worker message.
 *
 * @param {*} thing The data structure to serialize.
 *
 * @returns {*} The serialized data structure.
 */
export default function serialize (thing) {
	if (isArray(thing)) {
		return thing.map(serialize)
	}

	const thingIsObject = isObject(thing)

	if (thingIsObject && thing.serialize) {
		return thing.serialize()
	}

	if (thingIsObject) {
		return mapValues(thing, (value) => serialize(value))
	}

	return thing
}