import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(advancedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

export default dayjs