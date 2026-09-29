import dayjs from '@/vue/utils/dayjs'
import { __ } from '@/vue/plugins/translations'
import { td } from '@/vue/plugins/constants'

export function dateSqlToLocal (date, format = 'YYYY-MM-DD HH:mm:ss') {
	return dayjs.utc(date).tz(dayjs.tz.guess()).format(format)
}
export function dateSqlToLocalRelative (date) {
	return dayjs.utc(date).tz(dayjs.tz.guess()).fromNow()
		.replace('a few seconds ago', __('a few seconds ago', td))
		.replace('a minute ago', __('a minute ago', td))
		.replace(
			'minutes ago',
			// Translators: A number will be prepended to this string, e.g. "2 minutes ago".
			__('minutes ago', td)
		)
		.replace('a day ago', __('a day ago', td))
		.replace(
			'days ago',
			// Translators: A number will be prepended to this string, e.g. "2 days ago".
			__('days ago', td))
		.replace('a month ago', __('a month ago', td))
		.replace(
			'months ago',
			// Translators: A number will be prepended to this string, e.g. "2 months ago".
			__('months ago', td)
		)
		.replace('a year ago', __('a year ago', td))
		.replace(
			'years ago',
			// Translators: A number will be prepended to this string, e.g. "2 years ago".
			__('years ago', td)
		)
}
export function dateJsToLocal (date, format = 'YYYY-MM-DD HH:mm:ss') {
	if (!date) {
		return null
	}

	return dayjs(date).tz(dayjs.tz.guess()).format(format)
}
export function dateStringToLocalJs (date) {
	if (!date) {
		return null
	}

	return dayjs(date).tz(dayjs.tz.guess()).toDate()
}