// Dates and times of a business and of an order.
// - A business's schedule (lapses) is wall-clock time in the business's zone.
// - Dates from the API are UTC; what the user sees is in the user's local time.
// The submodule's timezones module extends dayjs with utc + timezone.
import dayjs from 'dayjs'
import { getValidTimezone, parseBusinessDateTime } from '~components/constants/timezones'

const pad = (value) => String(value).padStart(2, '0')

// The zone the "visitor" is assumed to be in while a server renders (there is none there: the process
// zone is UTC, not the visitor's). Null in the browser, which reads its own.
let assumedVisitorZone = null

/** Runs the synchronous `fn` as a visitor in `zone` would see the schedules (server render only); restores after. */
export const withVisitorZone = (zone, fn) => {
  const previous = assumedVisitorZone
  assumedVisitorZone = zone ? getValidTimezone(zone) : null
  try { return fn() } finally { assumedVisitorZone = previous }
}

const visitorInstant = (ms) => (assumedVisitorZone ? dayjs(ms).tz(assumedVisitorZone) : dayjs(ms))
const minutesOfDay = (instant) => instant.hour() * 60 + instant.minute()

/**
 * A calendar date (YYYY-MM-DD) as that day in the business's zone. Its
 * `.day()` is the weekday of that date wherever the user is (reading the
 * date as the browser's midnight first gave the previous day to users ahead
 * of the business).
 */
export const businessCalendarDate = (dateStr, timezone) => dayjs.tz(dateStr, getValidTimezone(timezone))

/** Today's date (YYYY-MM-DD) in the business's zone, at `now` (default: now). */
export const businessToday = (timezone, now) =>
  (now === undefined ? dayjs() : dayjs(now)).tz(getValidTimezone(timezone)).format('YYYY-MM-DD')

/**
 * The instant of a wall-clock time ({ hour, minute }) on a date of the
 * business's zone. Built from the string, so a DST change that day lands
 * on the right offset (setting .hour() on a zoned dayjs keeps the offset
 * it had).
 */
export const businessWallClock = (dateStr, time, timezone) =>
  parseBusinessDateTime(dateStr, `${pad(time?.hour ?? 0)}:${pad(time?.minute ?? 0)}`, timezone)

/** The instants a lapse of the business's today opens and closes. */
export const todayLapseRange = (lapse, timezone, now) => {
  const date = businessToday(timezone, now)
  return {
    from: businessWallClock(date, lapse?.open, timezone),
    to: businessWallClock(date, lapse?.close, timezone)
  }
}

/** The lapse of today that `now` falls in, or undefined. */
export const findCurrentLapse = (lapses, timezone, now) => {
  const nowMs = now === undefined ? Date.now() : dayjs(now).valueOf()
  return lapses?.find((lapse) => {
    const { from, to } = todayLapseRange(lapse, timezone, nowMs)
    return nowMs >= from.valueOf() && nowMs <= to.valueOf()
  })
}

/**
 * The order's delivery time, UTC from the API (`delivery_datetime_utc`).
 * `delivery_datetime` is not in UTC and has no zone, so it is never read as
 * the delivery time: without the UTC field there is no delivery time.
 */
export const orderDeliveryUtc = (order) => order?.delivery_datetime_utc || null

const isPreorderEtaRequestedTimeEnabled = (configs) =>
  ['1', 1, true].includes(configs?.preorder_eta_requested_time_enabled?.value)

export const isScheduledOrder = (order) => {
  const delivery = orderDeliveryUtc(order)
  if (!delivery) return false
  if (parseInt(order.status, 10) === 13) return true
  return !!order.created_at && dayjs.utc(delivery).isAfter(dayjs.utc(order.created_at))
}

export const scheduledOrderEtaUtc = (order, minutes, configs) => {
  if (!isPreorderEtaRequestedTimeEnabled(configs) || !isScheduledOrder(order)) return null
  const requested = dayjs.utc(orderDeliveryUtc(order))
  if (!order.created_at) return requested
  const immediate = dayjs.utc(order.created_at).add(Number(minutes) || 0, 'minute')
  return immediate.isAfter(requested) ? immediate : requested
}

/**
 * The instant of a slot: a wall clock 'HH:mm' on a date (YYYY-MM-DD) of a
 * zone (a business's, a professional's), or of the user's without one.
 */
export const zonedSlotInstant = (dateStr, wallClock, timezone) => {
  const [hour, minute] = String(wallClock).split(':').map(Number)
  return timezone
    ? businessWallClock(dateStr, { hour, minute }, timezone)
    : dayjs(`${dateStr} ${String(wallClock)}`)
}

/**
 * An instant as the API takes it: its UTC wall clock 'YYYY-MM-DD HH:mm:ss'
 * (a cart's reserve_date, a service's service_start).
 */
export const utcWallClock = (instant) => dayjs.utc(dayjs(instant).valueOf()).format('YYYY-MM-DD HH:mm:ss')

/**
 * A UTC value of the API ('YYYY-MM-DD HH:mm:ss') as the date and wall clock
 * ({ date, time: 'HH:mm' }) of a zone, or of the user's without one; null
 * without a value.
 */
export const utcInZone = (utcValue, timezone) => {
  if (!utcValue) return null
  const instant = dayjs.utc(utcValue)
  if (!instant.isValid()) return null
  const zoned = timezone ? instant.tz(getValidTimezone(timezone)) : dayjs(instant.valueOf())
  return { date: zoned.format('YYYY-MM-DD'), time: zoned.format('HH:mm') }
}

/**
 * `count` dates (YYYY-MM-DD) of a zone (the user's without one), from the
 * date it is there `fromMinutes` after `now` (default: now).
 */
export const zonedDatesFrom = (timezone, { fromMinutes = 0, count = 1, now } = {}) => {
  const base = (now === undefined ? dayjs() : dayjs(now)).add(Number(fromMinutes) || 0, 'minute')
  const first = timezone ? base.tz(getValidTimezone(timezone)).format('YYYY-MM-DD') : base.format('YYYY-MM-DD')
  return Array.from({ length: Math.max(0, count) }, (_, i) => dayjs.utc(first).add(i, 'day').format('YYYY-MM-DD'))
}

/**
 * The zone a professional's schedule is in: the professional's, else the
 * business's (api-core: professional->timezone ?? business->timezone).
 */
export const professionalTimezone = (professional, businessTimezone) =>
  professional?.timezone || businessTimezone || undefined

/**
 * Whether a professional can not take a service that starts at `start` and
 * lasts `duration` minutes, as api-core decides it when the service is added
 * (CartController: CalendarHelper::checkRange + checkFreeRange):
 * - it starts and ends on one day, inside one lapse of that weekday of the
 *   professional's schedule, read in the professional's zone (`timezone`);
 * - it does not overlap a busy time (UTC from the API); touching one by a
 *   minute is free. `ignoreBusy(item)` leaves a busy time out (the service's
 *   own, when it is edited).
 * Without a zone the schedule is read in the user's.
 */
export const isProfessionalBusy = (professional, start, { timezone, duration = 0, ignoreBusy } = {}) => {
  if (!professional?.schedule) return true
  if (!start) return false
  const from = dayjs(dayjs(start).valueOf())
  const to = from.add(Number(duration) || 0, 'minute')
  const zone = timezone ? getValidTimezone(timezone) : null
  const zonedFrom = zone ? from.tz(zone) : from
  const zonedTo = zone ? to.tz(zone) : to
  const day = professional.schedule[zonedFrom.day()]
  if (!day?.enabled) return true
  if (zonedTo.format('YYYY-MM-DD') !== zonedFrom.format('YYYY-MM-DD')) return true
  const startMinutes = minutesOfDay(zonedFrom)
  const endMinutes = minutesOfDay(zonedTo)
  const inLapse = (day.lapses || []).some((lapse) => {
    const open = (lapse?.open?.hour ?? 0) * 60 + (lapse?.open?.minute ?? 0)
    const close = (lapse?.close?.hour ?? 0) * 60 + (lapse?.close?.minute ?? 0)
    return startMinutes >= open && endMinutes <= close
  })
  if (!inLapse) return true
  return (professional.busy_times || []).some((item) => {
    if (ignoreBusy?.(item)) return false
    const busyFrom = dayjs.utc(item?.start).add(1, 'minute').valueOf()
    const busyTo = dayjs.utc(item?.end).subtract(1, 'minute').valueOf()
    return from.valueOf() <= busyTo && busyFrom <= to.valueOf()
  })
}

/**
 * A time as the user reads it: 'HH:mm', or 'hh:mm AM' / 'hh:mm PM' (the
 * preorder slots' own 12-hour text, which their split into parts reads).
 */
export const formatUserClock = (instant, is12Hours) => {
  const local = dayjs(dayjs(instant).valueOf())
  if (!is12Hours) return local.format('HH:mm')
  return `${local.format('hh:mm')} ${local.hour() < 12 ? 'AM' : 'PM'}`
}

/**
 * A preorder slot of a business day (`dateStr` + its wall clock 'HH:mm',
 * plus `addMinutes` for a window's end) as the user sees it: the instant in
 * the user's time ({ text }) and the user's date of it ({ date }), which
 * is another day than the business's when the zones are hours apart.
 * Without a zone the wall clock is the user's own (as the slot is sent).
 */
export const businessSlotForUser = (dateStr, wallClock, timezone, { is12Hours, addMinutes = 0 } = {}) => {
  const instant = zonedSlotInstant(dateStr, wallClock, timezone).add(addMinutes, 'minute')
  return {
    text: formatUserClock(instant, is12Hours),
    date: dayjs(instant.valueOf()).format('YYYY-MM-DD')
  }
}

/**
 * The user's date of a slot, only when it is not the business day it was
 * picked under (the label then names the user's day).
 */
export const slotUserDate = (slot, dateStr) =>
  slot?.userDate && slot.userDate !== dateStr ? slot.userDate : null

/**
 * The next instant (a dayjs in the business's own zone) its weekly
 * `schedule` (the format `userWeeklySchedule` reads: index 0-6 Sun-Sat,
 * each `{ enabled, lapses: [{ open: { hour, minute }, close }] }`) opens,
 * strictly after `now` (default: now). Scans today through the next 6 days;
 * a lapse already open (its open instant in the past, e.g. a midnight
 * crossing one) is not a candidate. `dayOffset` is how far that is from
 * today (0 today, 1 tomorrow, 2+ a later day). `null` without a schedule or
 * nothing opens in the next week.
 * Defensive: a malformed schedule (or date math in an odd environment)
 * never throws into the header it feeds — it just reads as "no next opening".
 */
export const nextOpening = (schedule, timezone, now) => {
  if (!Array.isArray(schedule)) return null
  try {
    const nowMs = (now === undefined ? dayjs() : dayjs(now)).valueOf()
    const today = businessToday(timezone, now)
    for (let offset = 0; offset < 7; offset++) {
      const date = dayjs.utc(today).add(offset, 'day').format('YYYY-MM-DD')
      const day = businessCalendarDate(date, timezone).day()
      const businessDay = schedule[day]
      if (!businessDay?.enabled) continue
      const lapses = [...(businessDay.lapses || [])].sort((a, b) =>
        ((a?.open?.hour ?? 0) * 60 + (a?.open?.minute ?? 0)) - ((b?.open?.hour ?? 0) * 60 + (b?.open?.minute ?? 0))
      )
      for (const lapse of lapses) {
        const open = businessWallClock(date, lapse?.open, timezone)
        if (open.valueOf() > nowMs) return { instant: open, dayOffset: offset }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Whether `moment` (the order's local-storage format, 'YYYY-MM-DD HH:mm:ss'
 * UTC) is a real scheduled instant, not the ASAP placeholder — the same check
 * BusinessAndProductList's own `isValidMoment` uses before sending it as a
 * timestamp.
 */
export const isValidOrderMoment = (moment) =>
  !!moment && dayjs.utc(moment, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss') === moment

/**
 * Whether the business is closed right now. The business the API sends for a scheduled `moment` says whether it is
 * open at that moment (`open`), so with a valid moment its own schedule for today (`today`, which the moment does
 * not change) tells: open when a lapse of it is running. Without a moment, or a schedule, `open` is the answer.
 */
export const isClosedNow = (business, moment, now = Date.now()) => {
  if (!business?.id) return false
  if (!isValidOrderMoment(moment) || !business.today) return !business.open
  return !(business.today.enabled && findCurrentLapse(business.today.lapses, business.timezone, now))
}

/**
 * Whether a product needs a valid scheduled moment before it can be acted on:
 * the business is closed right now and either there is no valid preorder
 * moment yet, or the product itself does not support scheduling at all
 * (`schedule_available === false`, even with a valid moment). The one
 * predicate the listing's quick-add gate and ProductForm's read-only state
 * share — never duplicate it.
 */
export const productRequiresSchedule = (business, product, moment) =>
  business?.open === false && (!isValidOrderMoment(moment) || product?.schedule_available === false)

/** A short zone label when the two schedules use different civil time at an instant. */
export const scheduleTimezoneFormatter = (businessTimezone, { forBusiness = false } = {}) => {
  const visitorZone = assumedVisitorZone || getValidTimezone()
  const businessZone = getValidTimezone(businessTimezone)
  if (visitorZone === businessZone) return null

  const comparison = { day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'longGeneric' }
  const visitor = new Intl.DateTimeFormat('en-US', { ...comparison, timeZone: visitorZone })
  const business = new Intl.DateTimeFormat('en-US', { ...comparison, timeZone: businessZone })
  if (visitor.resolvedOptions().timeZone === business.resolvedOptions().timeZone) return null

  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: forBusiness ? businessZone : visitorZone,
    timeZoneName: 'short'
  })
  return (instant) => {
    // Different IANA IDs can share a civil zone (e.g. Toronto and New York).
    // Compare the local clocks and generic names on the date shown.
    if (visitor.format(instant) === business.format(instant)) return null
    return label.formatToParts(instant).find(part => part.type === 'timeZoneName')?.value
  }
}

export const formatScheduleTime = (instant, format, formatTimezone) => {
  const time = instant.format(format)
  if (!formatTimezone || !instant.isValid()) return time
  const abbreviation = formatTimezone(instant.toDate())
  return abbreviation ? `${time} ${abbreviation}` : time
}

/** When the business opens next as a sentence ("Opens 12:00 PM", "Opens tomorrow …"), or null: the second half of `closedStatusLabel`. */
export const openingLabel = (business, t, { is12Hours, now, showTimezone } = {}) => {
  const opening = nextOpening(business?.schedule, business?.timezone, now)
  if (!opening) return null
  const zoneFormatter = showTimezone ? scheduleTimezoneFormatter(business?.timezone, { forBusiness: true }) : null
  const time = formatScheduleTime(opening.instant, is12Hours ? 'hh:mm A' : 'HH:mm', zoneFormatter)
  return opening.dayOffset === 0
    ? t('OPENS_AT', 'Opens _time_').replace('_time_', time)
    : opening.dayOffset === 1
      ? t('OPENS_TOMORROW_AT', 'Opens tomorrow _time_').replace('_time_', time)
      : t('OPENS_DAY_AT', 'Opens _day_ _time_').replace('_day_', opening.instant.format('ddd')).replace('_time_', time)
}

/**
 * The header's closed status: "Closed" alone, or with the next opening, in
 * the business's own zone and clock format (`is12Hours`) — "Opens 11 AM"
 * today, "Opens tomorrow 11 AM", or "Opens Mon 11 AM" a later day. Plain
 * "Closed" without a schedule or a next opening in the coming week.
 * `showTimezone` identifies the business's zone when it differs from the visitor's.
 */
export const closedStatusLabel = (business, t, options) => {
  const closed = t('CLOSED', 'Closed')
  const opens = openingLabel(business, t, options)
  return opens ? `${closed} · ${opens}` : closed
}

/**
 * A business's weekly schedule as the user's week: each lapse of the next 7
 * days of the business (today in its zone included) is turned into instants
 * on that very date (so a DST change that week lands on its offset) and
 * shown under the user's weekday it opens on, in the user's time.
 * Index 0-6 is the user's Sunday-Saturday; each day's lapses are
 * { open, close } local dayjs, sorted, with `closeDay` (the user's weekday
 * it closes on) when that is a later day; a close at the user's midnight is
 * that day's end. A day with no lapse is closed.
 */
export const userWeeklySchedule = (schedule, timezone, now) => {
  const week = Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] }))
  if (!Array.isArray(schedule)) return week
  const today = businessToday(timezone, now)
  for (let offset = 0; offset < 7; offset++) {
    const date = dayjs.utc(today).add(offset, 'day').format('YYYY-MM-DD')
    const day = businessCalendarDate(date, timezone).day()
    const businessDay = schedule[day]
    if (!businessDay?.enabled) continue
    for (const lapse of businessDay.lapses || []) {
      const from = businessWallClock(date, lapse?.open, timezone)
      let to = businessWallClock(date, lapse?.close, timezone)
      // a lapse that closes past midnight (or at it) ends the next day
      if (to.valueOf() <= from.valueOf()) {
        to = businessWallClock(dayjs.utc(date).add(1, 'day').format('YYYY-MM-DD'), lapse?.close, timezone)
      }
      const open = visitorInstant(from.valueOf())
      const close = visitorInstant(to.valueOf())
      // the user's midnight that closes a day is that day's end
      const closeDayEnd = minutesOfDay(close) === 0 ? close.subtract(1, 'minute') : close
      const closeDay = closeDayEnd.format('YYYY-MM-DD') !== open.format('YYYY-MM-DD') ? close.day() : null
      week[open.day()].enabled = true
      week[open.day()].lapses.push({ open, close, closeDay })
    }
  }
  week.forEach(day => day.lapses.sort((a, b) => minutesOfDay(a.open) - minutesOfDay(b.open)))
  return week
}
