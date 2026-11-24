// Runs a test as a user in a given IANA zone, whatever the host's zone is:
// Node applies a new process.env.TZ at once (Date, Intl, dayjs, moment).
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export const withUserTimezone = (timezone, fn) => {
  const previous = process.env.TZ
  process.env.TZ = timezone
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

// The UtilsContext's parseDate / parseTime (submodule): a UTC value (the
// API's) shown in the user's local time unless { utc: false }
export const parseDateLikeApp = (date, options = {}) => {
  const outputFormat = options.outputFormat || 'YYYY-MM-DD HH:mm'
  const isUtc = typeof options.utc === 'boolean' ? options.utc : true
  return (isUtc ? dayjs.utc(date).local() : dayjs(date)).format(outputFormat)
}

export const parseTimeLikeApp = (time, options = {}) => {
  if (!time) return '00:00'
  return parseDateLikeApp(time, { ...options, outputFormat: options.outputFormat || 'HH:mm' })
}
