import dayjs from 'dayjs'
import { businessCalendarDate, businessToday, businessWallClock, formatScheduleTime, nextOpening, scheduleTimezoneFormatter } from '~/utils/businessTime'

// Whether a store is open now, from its schedule and its own time zone. The API's `open` flag only
// closes: `open === false` (a paused store) wins over an open schedule, but `open: true` or a missing
// flag never opens a store the schedule says is closed. `schedule` is the API's (index 0-6, Sunday
// first, each { enabled, lapses }), read in `timezone`.

// The lapses of yesterday and today as instants. One that closes at or before it opens (18:00-02:00, or
// a close at 00:00) ends the next day, as userWeeklySchedule reads it; yesterday's is what keeps a store
// open after midnight.
const recentRanges = (schedule, timezone, now) => {
  const today = businessToday(timezone, now)
  return [-1, 0].flatMap((offset) => {
    const date = dayjs.utc(today).add(offset, 'day').format('YYYY-MM-DD')
    const day = schedule[businessCalendarDate(date, timezone).day()]
    return (day?.enabled ? day.lapses || [] : []).map((lapse) => {
      const from = businessWallClock(date, lapse?.open, timezone)
      let to = businessWallClock(date, lapse?.close, timezone)
      if (to.valueOf() <= from.valueOf()) to = businessWallClock(dayjs.utc(date).add(1, 'day').format('YYYY-MM-DD'), lapse?.close, timezone)
      return { from, to }
    })
  })
}

/**
 * @returns {null | { open: true, closes: dayjs } | { open: false, opens: { instant: dayjs, dayOffset: number } | null }}
 *   null when the store has no schedule at all and is not paused (nothing to say); `closes` is where the open
 *   stretch ends (lapses that touch or overlap are one stretch); `opens` the next opening of the coming
 *   week, or null (also for a paused store whose schedule says open, and for one with no schedule).
 */
export const storeStatus = (store, now) => {
  const { schedule, timezone } = store || {}
  const paused = store?.open === false
  if (!Array.isArray(schedule) || !schedule.length) return paused ? { open: false, opens: null } : null
  const nowMs = now === undefined ? Date.now() : dayjs(now).valueOf()
  const ranges = recentRanges(schedule, timezone, now)
  const current = ranges.find((r) => nowMs >= r.from.valueOf() && nowMs <= r.to.valueOf())
  if (!current) return { open: false, opens: nextOpening(schedule, timezone, now) }
  // paused store: closed without a next opening (the schedule's would be misleading)
  if (paused) return { open: false, opens: null }
  let closes = current.to
  // a lapse that starts where this one ends (or inside it) and goes on is the same stretch
  for (let more = ranges.find((r) => r.from <= closes && r.to > closes); more; more = ranges.find((r) => r.from <= closes && r.to > closes)) closes = more.to
  return { open: true, closes }
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * The card's status line: "Open · until 9:00 pm", "Closed · opens 7:00 am", "Closed · opens Thu 7:00 am"
 * (a day shown when it is not today), or "Closed" alone when nothing opens in the coming week. Times are
 * the store's own, in the project's clock format (`timeFormat`), with the store's zone abbreviation when
 * it is not the visitor's. null without a schedule.
 * @returns {null | { open: boolean, text: string }}
 */
export const statusLine = (store, { now, timeFormat, t }) => {
  const status = storeStatus(store, now)
  if (!status) return null
  const zone = scheduleTimezoneFormatter(store.timezone, { forBusiness: true })
  const clock = (instant) => formatScheduleTime(instant, timeFormat, zone)
  if (status.open) return { open: true, text: `${t('LANDING_OPEN', 'Open')} · ${t('LANDING_UNTIL_TIME', 'until _time_').replace('_time_', clock(status.closes))}` }
  const closed = t('CLOSED', 'Closed')
  if (!status.opens) return { open: false, text: closed }
  const { instant, dayOffset } = status.opens
  const day = instant.day()
  const opens = dayOffset === 0
    ? t('LANDING_OPENS_TIME', 'opens _time_')
    : t('LANDING_OPENS_DAY_TIME', 'opens _day_ _time_').replace('_day_', t(`DAYSHORT${day || 7}`, SHORT_DAYS[day]))
  return { open: false, text: `${closed} · ${opens.replace('_time_', clock(instant))}` }
}
