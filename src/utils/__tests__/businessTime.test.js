import { afterEach, describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import {
  businessCalendarDate,
  businessSlotForUser,
  businessToday,
  businessWallClock,
  closedStatusLabel,
  findCurrentLapse,
  formatUserClock,
  isScheduledOrder,
  isValidOrderMoment,
  nextOpening,
  orderDeliveryUtc,
  productRequiresSchedule,
  scheduledOrderEtaUtc,
  slotUserDate,
  todayLapseRange,
  scheduleTimezoneFormatter,
  userWeeklySchedule,
  withVisitorZone
} from '../businessTime'
import { getTimes } from '~ui/utils'
import { withUserTimezone } from '../../__tests__/helpers/userTimezone'

// setupTests mocks ~ui/utils; getTimes is the real one here
vi.unmock('~ui/utils')

const NY = 'America/New_York'
const MADRID = 'Europe/Madrid'
const USER_ZONES = ['Asia/Kolkata', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland', NY]

const lapse = (open, close) => ({
  open: { hour: open[0], minute: open[1] },
  close: { hour: close[0], minute: close[1] }
})
// one lapse per weekday, each with its own hours (Sunday 0 … Saturday 6)
const weekSchedule = () => Array.from({ length: 7 }, (_, day) => ({
  enabled: true,
  lapses: [lapse([8 + day, 0], [8 + day, 30])]
}))

afterEach(() => {
  vi.useRealTimers()
})

describe('businessCalendarDate (B1: the weekday of the selected date)', () => {
  it.each(USER_ZONES)('2026-10-20 is a Tuesday of a New York business for a user in %s', (zone) => {
    withUserTimezone(zone, () => {
      const date = businessCalendarDate('2026-10-20', NY)
      expect(date.day()).toBe(2)
      expect(date.date()).toBe(20)
    })
  })

  it.each([
    ['2026-03-08', NY, 0],
    ['2026-11-01', NY, 0],
    ['2026-03-29', MADRID, 0],
    ['2026-10-25', MADRID, 0]
  ])('the DST day %s (%s) keeps its weekday', (dateStr, timezone, weekday) => {
    for (const zone of USER_ZONES) {
      withUserTimezone(zone, () => {
        expect(businessCalendarDate(dateStr, timezone).day()).toBe(weekday)
        expect(businessCalendarDate(dateStr, timezone).format('YYYY-MM-DD')).toBe(dateStr)
      })
    }
  })
})

describe('getTimes with the business timezone (B1)', () => {
  it.each(['Asia/Kolkata', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland'])(
    "a user in %s gets Tuesday's slots for Tuesday 2026-10-20 of a New York business",
    (zone) => {
      withUserTimezone(zone, () => {
        vi.useFakeTimers()
        // Monday 12:00 in New York: the selected date is not the business's today
        vi.setSystemTime(new Date('2026-10-19T16:00:00Z'))
        const times = getTimes(new Date(2026, 9, 20), weekSchedule(), false, { timezone: NY })
        // Tuesday (2) opens 10:00-10:30; Monday (1) would be 09:00-09:30
        expect(times.map(time => time.value)).toEqual(['10:00', '10:15', '10:30'])
      })
    }
  )

  it("the business's today drops the slots already gone, in its zone", () => {
    withUserTimezone('Asia/Kolkata', () => {
      vi.useFakeTimers()
      // Tuesday 2026-10-20 10:10 in New York (Wednesday 19:40 in Kolkata)
      vi.setSystemTime(new Date('2026-10-20T14:10:00Z'))
      const times = getTimes(new Date(2026, 9, 20), weekSchedule(), false, { timezone: NY })
      expect(times.map(time => time.value)).toEqual(['10:15', '10:30'])
    })
  })
})

describe('business hours on DST days (B2)', () => {
  // the user's "now" is just before the change, when a zoned dayjs still
  // has the old offset
  const cases = [
    ['US spring 2026-03-08', NY, '2026-03-08T06:00:00Z', '2026-03-08T13:00:00.000Z', '2026-03-09T02:00:00.000Z'],
    ['US fall 2026-11-01', NY, '2026-11-01T05:00:00Z', '2026-11-01T14:00:00.000Z', '2026-11-02T03:00:00.000Z'],
    ['EU spring 2026-03-29', MADRID, '2026-03-29T00:30:00Z', '2026-03-29T07:00:00.000Z', '2026-03-29T20:00:00.000Z'],
    ['EU fall 2026-10-25', MADRID, '2026-10-24T23:30:00Z', '2026-10-25T08:00:00.000Z', '2026-10-25T21:00:00.000Z']
  ]

  it.each(cases)('%s: a 09:00-22:00 lapse opens and closes at the right instants', (_, timezone, now, from, to) => {
    for (const zone of USER_ZONES) {
      withUserTimezone(zone, () => {
        const range = todayLapseRange(lapse([9, 0], [22, 0]), timezone, now)
        expect(range.from.toISOString()).toBe(from)
        expect(range.to.toISOString()).toBe(to)
      })
    }
  })

  it('shows a New York lapse in the user\'s local time (Kolkata, Los Angeles) on the DST day', () => {
    // all of it as that user: a zoned dayjs made in one host zone and read
    // in another is off (dayjs reads the host offset again), which a
    // browser never does
    const now = '2026-03-08T06:00:00Z'
    withUserTimezone('Asia/Kolkata', () => {
      const { from, to } = todayLapseRange(lapse([9, 0], [22, 0]), NY, now)
      expect(dayjs(from.toDate()).format('YYYY-MM-DD HH:mm')).toBe('2026-03-08 18:30')
      expect(dayjs(to.toDate()).format('YYYY-MM-DD HH:mm')).toBe('2026-03-09 07:30')
    })
    withUserTimezone('America/Los_Angeles', () => {
      const { from, to } = todayLapseRange(lapse([9, 0], [22, 0]), NY, now)
      expect(dayjs(from.toDate()).format('HH:mm')).toBe('06:00')
      expect(dayjs(to.toDate()).format('HH:mm')).toBe('19:00')
    })
  })

  it('finds the open lapse on DST days and closes it at the right instant', () => {
    const lapses = [lapse([0, 0], [1, 59]), lapse([3, 0], [23, 0])]
    // 2026-03-08 01:30 EST (06:30Z): the first lapse
    expect(findCurrentLapse(lapses, NY, '2026-03-08T06:30:00Z')).toBe(lapses[0])
    // 03:30 EDT (07:30Z): the second one, which closes 23:00 EDT = 03:00Z
    // (with the -05:00 offset of a "now" before the change: 04:00Z, the
    // preorder switch an hour late)
    expect(findCurrentLapse(lapses, NY, '2026-03-08T07:30:00Z')).toBe(lapses[1])
    expect(todayLapseRange(lapses[1], NY, '2026-03-08T06:30:00Z').to.toISOString()).toBe('2026-03-09T03:00:00.000Z')
    // Madrid 2026-03-29: 01:30Z is 03:30 CEST, 00:30Z is 01:30 CET
    expect(findCurrentLapse(lapses, MADRID, '2026-03-29T01:30:00Z')).toBe(lapses[1])
    expect(findCurrentLapse(lapses, MADRID, '2026-03-29T00:30:00Z')).toBe(lapses[0])
    // Madrid 2026-10-25 08:30Z is 09:30 CET: a 10:00-11:00 lapse is not open
    expect(findCurrentLapse([lapse([10, 0], [11, 0])], MADRID, '2026-10-25T08:30:00Z')).toBeUndefined()
  })

  it("today is the business's date, not the user's", () => {
    withUserTimezone('Asia/Kolkata', () => {
      // 2026-10-20 23:00 in New York is 2026-10-21 08:30 in Kolkata
      expect(businessToday(NY, '2026-10-21T03:00:00Z')).toBe('2026-10-20')
    })
    expect(businessWallClock('2026-10-20', { hour: 9, minute: 5 }, NY).toISOString()).toBe('2026-10-20T13:05:00.000Z')
  })
})

describe('nextOpening: the next time a business opens', () => {
  // Tuesday 2026-10-20 08:00 in New York (EDT, before the fall-back on Nov 1)
  const NOW = '2026-10-20T12:00:00Z'
  const onlyDay = (day, open, close) => Array.from({ length: 7 }, (_, i) => ({
    enabled: i === day,
    lapses: i === day ? [lapse(open, close)] : []
  }))

  it('later today: the earliest lapse of today not yet open', () => {
    for (const zone of USER_ZONES) {
      withUserTimezone(zone, () => {
        const opening = nextOpening(onlyDay(2, [9, 0], [17, 0]), NY, NOW)
        expect(opening.dayOffset).toBe(0)
        expect(opening.instant.toISOString()).toBe('2026-10-20T13:00:00.000Z')
      })
    }
  })

  it("tomorrow: today's lapse already closed", () => {
    const schedule = onlyDay(2, [9, 0], [17, 0])
    schedule[3] = { enabled: true, lapses: [lapse([9, 0], [17, 0])] }
    // Tuesday 18:00 EDT: after the 09:00-17:00 lapse closed
    const opening = nextOpening(schedule, NY, '2026-10-20T22:00:00Z')
    expect(opening.dayOffset).toBe(1)
    expect(opening.instant.toISOString()).toBe('2026-10-21T13:00:00.000Z')
  })

  it('several days later: the only enabled weekday is days away', () => {
    const opening = nextOpening(onlyDay(5, [9, 0], [17, 0]), NY, NOW)
    expect(opening.dayOffset).toBe(3)
    expect(opening.instant.toISOString()).toBe('2026-10-23T13:00:00.000Z')
  })

  it('a lapse crossing midnight: an already-open early lapse is not a candidate, the evening one is', () => {
    const schedule = onlyDay(2, [0, 0], [1, 45])
    schedule[2].lapses.push(lapse([22, 0], [2, 0]))
    // 10:00 EDT: both lapses of today are done opening (the early one closed, the evening one hasn't)
    const laterToday = nextOpening(schedule, NY, '2026-10-20T14:00:00Z')
    expect(laterToday.dayOffset).toBe(0)
    expect(laterToday.instant.toISOString()).toBe('2026-10-21T02:00:00.000Z')
    // 00:30 EDT: inside the early lapse already (its open is in the past) — same evening lapse next
    const insideEarlyLapse = nextOpening(schedule, NY, '2026-10-20T04:30:00Z')
    expect(insideEarlyLapse.dayOffset).toBe(0)
    expect(insideEarlyLapse.instant.toISOString()).toBe('2026-10-21T02:00:00.000Z')
  })

  it('DST: the US spring-forward day keeps the 09:00 wall clock', () => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([9, 0], [22, 0])] }))
    // Saturday 2026-03-07 15:00 EST: inside Saturday's lapse already
    const opening = nextOpening(schedule, NY, '2026-03-07T20:00:00Z')
    expect(opening.dayOffset).toBe(1)
    expect(opening.instant.toISOString()).toBe('2026-03-08T13:00:00.000Z')
  })

  it('DST: the US fall-back day keeps the 09:00 wall clock', () => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([9, 0], [22, 0])] }))
    // Saturday 2026-10-31 16:00 EDT: inside Saturday's lapse already
    const opening = nextOpening(schedule, NY, '2026-10-31T20:00:00Z')
    expect(opening.dayOffset).toBe(1)
    expect(opening.instant.toISOString()).toBe('2026-11-01T14:00:00.000Z')
  })

  it('no schedule, an empty one, or one with nothing enabled: null', () => {
    expect(nextOpening(undefined, NY, NOW)).toBeNull()
    expect(nextOpening([], NY, NOW)).toBeNull()
    expect(nextOpening(Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] })), NY, NOW)).toBeNull()
  })
})

describe('closedStatusLabel: the header\'s "Closed" text', () => {
  const NOW = '2026-10-20T12:00:00Z' // Tuesday 08:00 in New York
  const t = (_key, fallback) => fallback
  const onlyDay = (day, open, close) => Array.from({ length: 7 }, (_, i) => ({
    enabled: i === day,
    lapses: i === day ? [lapse(open, close)] : []
  }))

  it('plain "Closed" without a schedule', () => {
    expect(closedStatusLabel({}, t, { now: NOW })).toBe('Closed')
  })

  it('"Closed · Opens <time>" for later today, in 24h and 12h', () => {
    const business = { schedule: onlyDay(2, [9, 0], [17, 0]), timezone: NY }
    expect(closedStatusLabel(business, t, { now: NOW })).toBe('Closed · Opens 09:00')
    expect(closedStatusLabel(business, t, { now: NOW, is12Hours: true })).toBe('Closed · Opens 09:00 AM')
  })

  it('"Closed · Opens tomorrow <time>" when today already closed', () => {
    const schedule = onlyDay(2, [9, 0], [17, 0])
    schedule[3] = { enabled: true, lapses: [lapse([9, 0], [17, 0])] }
    const business = { schedule, timezone: NY }
    expect(closedStatusLabel(business, t, { now: '2026-10-20T22:00:00Z' })).toBe('Closed · Opens tomorrow 09:00')
  })

  it('"Closed · Opens <Day> <time>" for a later day', () => {
    const business = { schedule: onlyDay(5, [9, 0], [17, 0]), timezone: NY }
    expect(closedStatusLabel(business, t, { now: NOW })).toBe('Closed · Opens Fri 09:00')
  })

  it('reads the keys and placeholders a translator would need to localize', () => {
    const spy = vi.fn((_key, fallback) => fallback)
    const business = { schedule: onlyDay(2, [9, 0], [17, 0]), timezone: NY }
    closedStatusLabel(business, spy, { now: NOW })
    expect(spy).toHaveBeenCalledWith('CLOSED', 'Closed')
    expect(spy).toHaveBeenCalledWith('OPENS_AT', 'Opens _time_')
  })
})

describe('isValidOrderMoment / productRequiresSchedule', () => {
  it('isValidOrderMoment: true only for a real "YYYY-MM-DD HH:mm:ss" instant', () => {
    expect(isValidOrderMoment('2026-10-21 09:00:00')).toBe(true)
    expect(isValidOrderMoment(null)).toBe(false)
    expect(isValidOrderMoment('')).toBe(false)
    expect(isValidOrderMoment('not-a-date')).toBe(false)
  })

  it('an open business never requires a schedule, whatever the moment or the product', () => {
    expect(productRequiresSchedule({ open: true }, {}, null)).toBe(false)
    expect(productRequiresSchedule({ open: true }, { schedule_available: false }, null)).toBe(false)
  })

  it('a business with no open field (not yet loaded) is treated as open, never as closed', () => {
    expect(productRequiresSchedule({}, {}, null)).toBe(false)
    expect(productRequiresSchedule(undefined, {}, null)).toBe(false)
  })

  it('closed + no valid moment requires a schedule', () => {
    expect(productRequiresSchedule({ open: false }, {}, null)).toBe(true)
    expect(productRequiresSchedule({ open: false }, {}, 'not-a-date')).toBe(true)
  })

  it('closed + a valid moment no longer requires one, unless the product itself rules it out', () => {
    expect(productRequiresSchedule({ open: false }, {}, '2026-10-21 09:00:00')).toBe(false)
    expect(productRequiresSchedule({ open: false }, { schedule_available: false }, '2026-10-21 09:00:00')).toBe(true)
  })
})

describe('orderDeliveryUtc (B3)', () => {
  it('is delivery_datetime_utc, never delivery_datetime', () => {
    expect(orderDeliveryUtc({ delivery_datetime_utc: '2026-10-20 18:00:00', delivery_datetime: '2026-10-20 14:00:00' })).toBe('2026-10-20 18:00:00')
    expect(orderDeliveryUtc({ delivery_datetime: '2026-10-20 14:00:00' })).toBeNull()
    expect(orderDeliveryUtc(null)).toBeNull()
  })
})

describe('isScheduledOrder', () => {
  it('is false without delivery_datetime_utc, whatever the status', () => {
    expect(isScheduledOrder(null)).toBe(false)
    expect(isScheduledOrder({ status: 13, created_at: '2026-10-20 10:00:00' })).toBe(false)
  })

  it('is true for a preorder (status 13), with or without created_at', () => {
    expect(isScheduledOrder({ status: 13, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 10:00:00' })).toBe(true)
    expect(isScheduledOrder({ status: 13, delivery_datetime_utc: '2026-10-20 18:00:00' })).toBe(true)
    expect(isScheduledOrder({ status: '13', delivery_datetime_utc: '2026-10-20 18:00:00' })).toBe(true)
  })

  it('is true when the requested time is strictly after created_at', () => {
    expect(isScheduledOrder({ status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 10:00:00' })).toBe(true)
    expect(isScheduledOrder({ status: 7, delivery_datetime_utc: '2026-10-20 18:00:01', created_at: '2026-10-20 18:00:00' })).toBe(true)
  })

  it('is false for an immediate order: delivery equal to or seconds before created_at', () => {
    expect(isScheduledOrder({ status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 18:00:42' })).toBe(false)
    expect(isScheduledOrder({ status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 18:00:00' })).toBe(false)
  })

  it('is false without created_at unless the status is 13', () => {
    expect(isScheduledOrder({ status: 0, delivery_datetime_utc: '2026-10-20 18:00:00' })).toBe(false)
  })
})

describe('scheduledOrderEtaUtc', () => {
  const enabled = { preorder_eta_requested_time_enabled: { value: '1' } }
  const immediate = { status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 18:00:42' }
  const farAhead = { status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 10:00:00' }
  const sooner = { status: 0, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 17:45:00' }
  const iso = (instant) => instant.toISOString()

  it('is null with the config missing or disabled', () => {
    expect(scheduledOrderEtaUtc(farAhead, 60)).toBeNull()
    expect(scheduledOrderEtaUtc(farAhead, 60, {})).toBeNull()
    expect(scheduledOrderEtaUtc(farAhead, 60, { preorder_eta_requested_time_enabled: { value: '0' } })).toBeNull()
    expect(scheduledOrderEtaUtc(farAhead, 60, { preorder_eta_requested_time_enabled: { value: 0 } })).toBeNull()
    expect(scheduledOrderEtaUtc(farAhead, 60, { preorder_eta_requested_time_enabled: { value: false } })).toBeNull()
    expect(scheduledOrderEtaUtc(farAhead, 60, { preorder_eta_requested_time_enabled: { value: null } })).toBeNull()
  })

  it('takes \'1\', 1 and true as enabled', () => {
    for (const value of ['1', 1, true]) {
      expect(iso(scheduledOrderEtaUtc(farAhead, 60, { preorder_eta_requested_time_enabled: { value } }))).toBe('2026-10-20T18:00:00.000Z')
    }
  })

  it('is null for an immediate order with the config enabled', () => {
    expect(scheduledOrderEtaUtc(immediate, 60, enabled)).toBeNull()
  })

  it('is the requested time for an order scheduled far ahead', () => {
    expect(iso(scheduledOrderEtaUtc(farAhead, 60, enabled))).toBe('2026-10-20T18:00:00.000Z')
  })

  it('is created_at plus the minutes when the requested time is sooner than the estimate', () => {
    expect(iso(scheduledOrderEtaUtc(sooner, 60, enabled))).toBe('2026-10-20T18:45:00.000Z')
  })

  it('applies to a preorder (status 13) with created_at, and is the requested time without it', () => {
    expect(iso(scheduledOrderEtaUtc({ ...sooner, status: 13 }, 60, enabled))).toBe('2026-10-20T18:45:00.000Z')
    expect(iso(scheduledOrderEtaUtc({ ...farAhead, status: 13 }, 60, enabled))).toBe('2026-10-20T18:00:00.000Z')
    expect(iso(scheduledOrderEtaUtc({ status: 13, delivery_datetime_utc: '2026-10-20 18:00:00' }, 60, enabled))).toBe('2026-10-20T18:00:00.000Z')
  })

  it('is null without delivery_datetime_utc', () => {
    expect(scheduledOrderEtaUtc({ status: 13, created_at: '2026-10-20 10:00:00' }, 60, enabled)).toBeNull()
  })
})

describe('preorder slots in the user\'s time', () => {
  it('a slot of a New York business day is shown in the user\'s time and date', () => {
    const cases = [
      [NY, '20:00', '2026-10-21'],
      [MADRID, '02:00', '2026-10-22'],
      ['Asia/Kolkata', '05:30', '2026-10-22'],
      ['America/Los_Angeles', '17:00', '2026-10-21'],
      ['Pacific/Auckland', '13:00', '2026-10-22'],
      ['UTC', '00:00', '2026-10-22']
    ]
    for (const [zone, text, date] of cases) {
      withUserTimezone(zone, () => {
        expect(businessSlotForUser('2026-10-21', '20:00', NY)).toEqual({ text, date })
      })
    }
  })

  it('the window\'s end is minutes on, and 12-hour text is hh:mm AM/PM', () => {
    withUserTimezone(MADRID, () => {
      expect(businessSlotForUser('2026-10-21', '17:45', NY, { addMinutes: 30 })).toEqual({ text: '00:15', date: '2026-10-22' })
      expect(businessSlotForUser('2026-10-21', '06:00', NY, { is12Hours: true }).text).toBe('12:00 PM')
      expect(businessSlotForUser('2026-10-21', '18:00', NY, { is12Hours: true }).text).toBe('12:00 AM')
      expect(businessSlotForUser('2026-10-21', '14:30', NY, { is12Hours: true }).text).toBe('08:30 PM')
    })
  })

  it('without a zone, or in the business\'s own zone, the slot is its wall clock', () => {
    withUserTimezone(NY, () => {
      expect(businessSlotForUser('2026-10-21', '09:15', NY)).toEqual({ text: '09:15', date: '2026-10-21' })
      expect(businessSlotForUser('2026-10-21', '21:15', NY, { is12Hours: true }).text).toBe('09:15 PM')
    })
    withUserTimezone('Asia/Kolkata', () => {
      expect(businessSlotForUser('2026-10-21', '09:15')).toEqual({ text: '09:15', date: '2026-10-21' })
    })
  })

  it('the DST change of the business day is that day\'s', () => {
    withUserTimezone(MADRID, () => {
      // New York leaves DST on 2026-11-01: 09:00 is 14:00 UTC that day (15:00 CET), 13:00 UTC the day before
      expect(businessSlotForUser('2026-10-31', '09:00', NY).text).toBe('14:00')
      expect(businessSlotForUser('2026-11-01', '09:00', NY).text).toBe('15:00')
    })
  })

  it('formatUserClock is the same text as getTimes\' own 12-hour one', () => {
    withUserTimezone('UTC', () => {
      expect(formatUserClock('2026-10-21T00:05:00Z', true)).toBe('12:05 AM')
      expect(formatUserClock('2026-10-21T12:05:00Z', true)).toBe('12:05 PM')
      expect(formatUserClock('2026-10-21T13:05:00Z', false)).toBe('13:05')
    })
  })

  it('slotUserDate is the user\'s date only when it is not the business day', () => {
    expect(slotUserDate({ userDate: '2026-10-22' }, '2026-10-21')).toBe('2026-10-22')
    expect(slotUserDate({ userDate: '2026-10-21' }, '2026-10-21')).toBeNull()
    expect(slotUserDate({}, '2026-10-21')).toBeNull()
  })

  it('getTimes with the business zone: values are the business wall clock, texts the user\'s time', () => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([19, 30], [20, 0])] }))
    withUserTimezone(MADRID, () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
      const times = getTimes(new Date(2026, 9, 21), schedule, false, { timezone: NY })
      expect(times).toEqual([
        { value: '19:30', text: '01:30', userDate: '2026-10-22' },
        { value: '19:45', text: '01:45', userDate: '2026-10-22' },
        { value: '20:00', text: '02:00', userDate: '2026-10-22' }
      ])
      expect(getTimes(new Date(2026, 9, 21), schedule, true, { timezone: NY })[0].text).toBe('01:30 AM')
    })
    withUserTimezone(NY, () => {
      vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
      const times = getTimes(new Date(2026, 9, 21), schedule, true, { timezone: NY })
      // the business's own zone: the text getTimes always wrote
      expect(times.map(time => time.text)).toEqual(['07:30 PM', '07:45 PM', '08:00 PM'])
    })
  })
})

describe('userWeeklySchedule: the business week in the user\'s week and time', () => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // the user's week as text: day -> ['HH:mm-HH:mm(+closeDay)']
  const asText = (week) => Object.fromEntries(week.map((day, i) => [
    DAYS[i],
    day.lapses.map(l => `${l.open.format('HH:mm')}-${l.close.format('HH:mm')}${l.closeDay !== null ? `(${DAYS[l.closeDay]})` : ''}`)
  ]))
  const everyDay = (open, close) => Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse(open, close)] }))
  // Tuesday 2026-10-20 08:00 in New York
  const NOW = '2026-10-20T12:00:00Z'

  it('the business\'s own zone: each day as it is', () => {
    const schedule = weekSchedule()
    schedule[0] = { enabled: false, lapses: [lapse([9, 0], [17, 0])] }
    withUserTimezone(NY, () => {
      const week = userWeeklySchedule(schedule, NY, NOW)
      expect(week[0]).toEqual({ enabled: false, lapses: [] })
      for (let day = 1; day < 7; day++) {
        expect(week[day].enabled).toBe(true)
        expect(asText(week)[DAYS[day]]).toEqual([`${String(8 + day).padStart(2, '0')}:00-${String(8 + day).padStart(2, '0')}:30`])
      }
    })
  })

  it('a lapse that closes at the user\'s midnight ends that day', () => {
    withUserTimezone(NY, () => {
      expect(asText(userWeeklySchedule(everyDay([18, 0], [0, 0]), NY, NOW)).Mon).toEqual(['18:00-00:00'])
    })
  })

  it.each([
    ['America/Chicago', ['09:00-17:00', '21:00-01:00(Sun)']],
    ['America/Toronto', ['10:00-18:00', '22:00-02:00(Sun)']]
  ])('keeps the opening day and Sunday close of a Toronto overnight lapse in %s', (zone, hours) => {
    const toronto = 'America/Toronto'
    const saturdayMorning = '2026-11-21T14:00:00Z'
    const schedule = Array.from({ length: 7 }, (_, day) => ({
      enabled: day === 6,
      lapses: day === 6 ? [lapse([10, 0], [18, 0]), lapse([22, 0], [2, 0])] : []
    }))

    withUserTimezone(zone, () => {
      const week = userWeeklySchedule(schedule, toronto, saturdayMorning)
      expect(asText(week).Sat).toEqual(hours)
      expect(asText(week).Sun).toEqual([])
      expect(week[6].lapses[0].open.valueOf()).toBe(nextOpening(schedule, toronto, saturdayMorning).instant.valueOf())
    })
  })

  it('from Madrid: hours later; past midnight they open on the next weekday', () => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] }))
    // Monday 10:00-15:00 and 20:00-23:00 in New York
    schedule[1] = { enabled: true, lapses: [lapse([20, 0], [23, 0]), lapse([10, 0], [15, 0])] }
    withUserTimezone(MADRID, () => {
      const week = asText(userWeeklySchedule(schedule, NY, NOW))
      // the next Monday is 2026-10-26: Madrid has left DST, 5 hours ahead
      expect(week.Mon).toEqual(['15:00-20:00'])
      expect(week.Tue).toEqual(['01:00-04:00'])
      expect(week.Sun).toEqual([])
    })
  })

  it('a range that crosses the user\'s midnight names the day it closes', () => {
    withUserTimezone(MADRID, () => {
      const week = asText(userWeeklySchedule(everyDay([15, 0], [22, 0]), NY, NOW))
      expect(week.Wed).toEqual(['21:00-04:00(Thu)'])
    })
    withUserTimezone('Asia/Kolkata', () => {
      const week = asText(userWeeklySchedule(everyDay([9, 0], [17, 0]), NY, NOW))
      expect(week.Wed).toEqual(['18:30-02:30(Thu)'])
    })
    withUserTimezone('America/Los_Angeles', () => {
      const week = asText(userWeeklySchedule(everyDay([9, 0], [17, 0]), NY, NOW))
      expect(week.Wed).toEqual(['06:00-14:00'])
    })
  })

  it('a user ahead of the business: a lapse late in the business\'s day lands on the user\'s next weekday', () => {
    withUserTimezone('Pacific/Auckland', () => {
      // NY Wednesday 2026-10-21 09:00-17:00 EDT is Thursday 02:00-10:00 NZDT
      const schedule = Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] }))
      schedule[3] = { enabled: true, lapses: [lapse([9, 0], [17, 0])] }
      const week = asText(userWeeklySchedule(schedule, NY, NOW))
      expect(week.Wed).toEqual([])
      expect(week.Thu).toEqual(['02:00-10:00'])
    })
  })

  it('a DST week: each day converted on its own date', () => {
    // Wednesday 2026-10-28: Europe left DST on the 25th, New York leaves it on Sunday 2026-11-01
    const now = '2026-10-28T12:00:00Z'
    withUserTimezone(MADRID, () => {
      const week = asText(userWeeklySchedule(everyDay([9, 0], [17, 0]), NY, now))
      // Wed 28 - Sat 31: 5 hours apart
      expect(week.Wed).toEqual(['14:00-22:00'])
      expect(week.Sat).toEqual(['14:00-22:00'])
      // Sun 1 - Tue 3: 6 hours apart again
      expect(week.Sun).toEqual(['15:00-23:00'])
      expect(week.Mon).toEqual(['15:00-23:00'])
      expect(week.Tue).toEqual(['15:00-23:00'])
    })
    withUserTimezone(NY, () => {
      // the business's own zone: the same hours every day, DST or not
      expect(new Set(Object.values(asText(userWeeklySchedule(everyDay([9, 0], [17, 0]), NY, now))).flat())).toEqual(new Set(['09:00-17:00']))
    })
  })

  it('no schedule: a closed week', () => {
    expect(userWeeklySchedule(undefined, NY, NOW).every(day => !day.enabled && day.lapses.length === 0)).toBe(true)
  })
})

describe('withVisitorZone: the server render assumes a visitor in the store\'s zone', () => {
  const NOW = '2026-10-20T12:00:00Z'
  const hours = (schedule, zone = NY) => userWeeklySchedule(schedule, zone, NOW)[2].lapses.map(l => `${l.open.format('HH:mm')}-${l.close.format('HH:mm')}`)

  it.each(['UTC', 'Asia/Kolkata', 'Pacific/Auckland'])('a server in %s reads the New York hours as New York\'s own, with no zone label', (zone) => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([7, 0], [21, 0])] }))
    withUserTimezone(zone, () => {
      expect(withVisitorZone(NY, () => hours(schedule))).toEqual(['07:00-21:00'])
      expect(withVisitorZone(NY, () => scheduleTimezoneFormatter(NY))).toBeNull()
    })
  })

  it('it restores the visitor\'s own zone afterwards, even when the render throws', () => {
    const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([7, 0], [21, 0])] }))
    withUserTimezone('Asia/Kolkata', () => {
      expect(() => withVisitorZone(NY, () => { throw new Error('boom') })).toThrow('boom')
      expect(hours(schedule)).not.toEqual(['07:00-21:00'])
      expect(scheduleTimezoneFormatter(NY)).not.toBeNull()
    })
  })

  it('without a zone it changes nothing', () => {
    withUserTimezone('Asia/Kolkata', () => {
      expect(withVisitorZone(undefined, () => scheduleTimezoneFormatter(NY))).not.toBeNull()
    })
  })
})
