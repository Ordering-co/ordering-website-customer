import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  businessSlotForUser,
  isProfessionalBusy,
  professionalTimezone,
  utcInZone,
  utcWallClock,
  zonedDatesFrom,
  zonedSlotInstant
} from '../businessTime'
import { getTimes } from '~ui/utils'
import { withUserTimezone } from '../../__tests__/helpers/userTimezone'

// setupTests mocks ~ui/utils; getTimes is the real one here
vi.unmock('~ui/utils')

// Whatever zone the host runs in (TZ=…), each case runs as a user of these
const NY = 'America/New_York'
const MADRID = 'Europe/Madrid'
const BOGOTA = 'America/Bogota'
const KOLKATA = 'Asia/Kolkata'
const USER_ZONES = [BOGOTA, KOLKATA, 'UTC', NY, MADRID, 'Pacific/Auckland']

const lapse = (open, close) => ({
  open: { hour: open[0], minute: open[1] },
  close: { hour: close[0], minute: close[1] }
})
const closed = { enabled: false, lapses: [] }
// open only on Tuesdays (2026-10-20 is a Tuesday), 09:00-13:00 of its zone
const tuesdaySchedule = () => Array.from({ length: 7 }, (_, day) => (
  day === 2 ? { enabled: true, lapses: [lapse([9, 0], [13, 0])] } : closed
))

afterEach(() => {
  vi.useRealTimers()
})

describe('professionalTimezone (api-core: professional->timezone ?? business->timezone)', () => {
  it('the professional\'s zone, else the business\'s, else none (the user\'s)', () => {
    expect(professionalTimezone({ timezone: MADRID }, NY)).toBe(MADRID)
    expect(professionalTimezone({}, NY)).toBe(NY)
    expect(professionalTimezone(null, NY)).toBe(NY)
    expect(professionalTimezone({}, undefined)).toBeUndefined()
  })
})

describe('service_start: the instant sent is the professional\'s wall clock in UTC', () => {
  it.each(USER_ZONES)('a Madrid professional (business in New York) at 09:00 of Tue 20 is 07:00 UTC, for a user in %s', (zone) => {
    withUserTimezone(zone, () => {
      const timezone = professionalTimezone({ timezone: MADRID }, NY)
      const start = zonedSlotInstant('2026-10-20', '09:00', timezone)
      // Madrid is UTC+2 until Oct 25
      expect(utcWallClock(start.toDate())).toBe('2026-10-20 07:00:00')
      expect(utcWallClock(start)).toBe('2026-10-20 07:00:00')
    })
  })

  it.each(USER_ZONES)('without the professional\'s zone it is the New York business\'s: 09:00 is 13:00 UTC (user in %s)', (zone) => {
    withUserTimezone(zone, () => {
      const timezone = professionalTimezone({}, NY)
      expect(utcWallClock(zonedSlotInstant('2026-10-20', '09:00', timezone))).toBe('2026-10-20 13:00:00')
    })
  })

  it('on the DST change days it takes that day\'s offset', () => {
    withUserTimezone(BOGOTA, () => {
      // Madrid back to UTC+1 on Oct 25, New York to UTC-5 on Nov 1
      expect(utcWallClock(zonedSlotInstant('2026-10-25', '09:00', MADRID))).toBe('2026-10-25 08:00:00')
      expect(utcWallClock(zonedSlotInstant('2026-11-01', '09:00', NY))).toBe('2026-11-01 14:00:00')
      expect(utcWallClock(zonedSlotInstant('2026-03-29', '09:00', MADRID))).toBe('2026-03-29 07:00:00')
    })
  })

  it('a slot of a Madrid professional shows in Bogota\'s time (02:00 of the same day)', () => {
    withUserTimezone(BOGOTA, () => {
      expect(businessSlotForUser('2026-10-20', '09:00', MADRID)).toEqual({ text: '02:00', date: '2026-10-20' })
      expect(businessSlotForUser('2026-10-20', '09:00', MADRID, { is12Hours: true }).text).toBe('02:00 AM')
    })
  })

  it('a slot of a Madrid professional shows in Kolkata\'s time, the user\'s day when it changes', () => {
    withUserTimezone(KOLKATA, () => {
      // 23:00 Madrid = 21:00 UTC = 02:30 of the 21st in Kolkata
      expect(businessSlotForUser('2026-10-20', '23:00', MADRID)).toEqual({ text: '02:30', date: '2026-10-21' })
    })
  })
})

describe('the professional\'s slots of a day (getTimes in their zone)', () => {
  it.each(USER_ZONES)('Tue 20 of a Madrid professional lists 09:00-13:00 Madrid, shown in the user\'s time (%s)', (zone) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
    withUserTimezone(zone, () => {
      const times = getTimes(new Date(2026, 9, 20), tuesdaySchedule(), false, { timezone: MADRID })
      expect(times[0].value).toBe('09:00')
      expect(times[times.length - 1].value).toBe('13:00')
      expect(times).toHaveLength(17)
      for (const slot of times) {
        const instant = zonedSlotInstant('2026-10-20', slot.value, MADRID)
        expect(slot.text).toBe(businessSlotForUser('2026-10-20', slot.value, MADRID).text)
        expect(slot.userDate).toBe(instant.tz(zone).format('YYYY-MM-DD'))
      }
    })
  })

  it.each(USER_ZONES)('the day is the professional\'s: a Monday of the user that is Tuesday in Madrid has no slots on Monday (%s)', (zone) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
    withUserTimezone(zone, () => {
      expect(getTimes(new Date(2026, 9, 19), tuesdaySchedule(), false, { timezone: MADRID })).toHaveLength(0)
    })
  })
})

describe('isProfessionalBusy (as api-core: checkRange in the professional\'s zone + checkFreeRange)', () => {
  const professional = (busy = []) => ({ schedule: tuesdaySchedule(), busy_times: busy })

  it.each(USER_ZONES)('a 60 min service fits 09:00-12:00 Madrid, not 12:30 or 08:30 (user in %s)', (zone) => {
    withUserTimezone(zone, () => {
      const at = (time) => zonedSlotInstant('2026-10-20', time, MADRID).toDate()
      const options = { timezone: MADRID, duration: 60 }
      expect(isProfessionalBusy(professional(), at('09:00'), options)).toBe(false)
      expect(isProfessionalBusy(professional(), at('12:00'), options)).toBe(false)
      expect(isProfessionalBusy(professional(), at('12:30'), options)).toBe(true)
      expect(isProfessionalBusy(professional(), at('08:30'), options)).toBe(true)
    })
  })

  it.each(USER_ZONES)('the weekday is Madrid\'s: Mon 23:30 UTC is Tue 01:30 in Madrid, closed; Tue 07:00 UTC is 09:00, open (%s)', (zone) => {
    withUserTimezone(zone, () => {
      expect(isProfessionalBusy(professional(), new Date('2026-10-19T23:30:00Z'), { timezone: MADRID })).toBe(true)
      expect(isProfessionalBusy(professional(), new Date('2026-10-20T07:00:00Z'), { timezone: MADRID })).toBe(false)
      // the same instant for a New York professional: 03:00 Tuesday, closed
      expect(isProfessionalBusy(professional(), new Date('2026-10-20T07:00:00Z'), { timezone: NY })).toBe(true)
    })
  })

  it.each(USER_ZONES)('busy times are UTC; touching one by its edge is free (%s)', (zone) => {
    withUserTimezone(zone, () => {
      // busy 10:00-11:00 Madrid = 08:00-09:00 UTC
      const pro = professional([{ start: '2026-10-20 08:00:00', end: '2026-10-20 09:00:00', duration: 60 }])
      const at = (time) => zonedSlotInstant('2026-10-20', time, MADRID).toDate()
      const options = { timezone: MADRID, duration: 60 }
      expect(isProfessionalBusy(pro, at('10:30'), options)).toBe(true)
      expect(isProfessionalBusy(pro, at('09:30'), options)).toBe(true)
      expect(isProfessionalBusy(pro, at('09:00'), options)).toBe(false)
      expect(isProfessionalBusy(pro, at('11:00'), options)).toBe(false)
      // the service's own busy time, when it is edited, is left out
      expect(isProfessionalBusy(pro, at('10:00'), { ...options, ignoreBusy: (item) => item.start === '2026-10-20 08:00:00' })).toBe(false)
    })
  })

  it('a service that ends on the next day does not fit; no schedule is busy; no time is free', () => {
    const lateSchedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([20, 0], [23, 59])] }))
    const at = zonedSlotInstant('2026-10-20', '23:30', MADRID).toDate()
    expect(isProfessionalBusy({ schedule: lateSchedule }, at, { timezone: MADRID, duration: 60 })).toBe(true)
    expect(isProfessionalBusy({ schedule: lateSchedule }, at, { timezone: MADRID, duration: 15 })).toBe(false)
    expect(isProfessionalBusy({}, at, { timezone: MADRID })).toBe(true)
    expect(isProfessionalBusy({ schedule: lateSchedule }, null, { timezone: MADRID })).toBe(false)
  })
})

describe('reserve_date: sent in UTC, shown in the user\'s time', () => {
  it.each(USER_ZONES)('19:00 of a New York business on Tue 20 is sent as 23:00 UTC and read back as that slot (user in %s)', (zone) => {
    withUserTimezone(zone, () => {
      const sent = utcWallClock(zonedSlotInstant('2026-10-20', '19:00', NY))
      expect(sent).toBe('2026-10-20 23:00:00')
      expect(utcInZone(sent, NY)).toEqual({ date: '2026-10-20', time: '19:00' })
    })
  })

  it('a Kolkata user sees that reservation at 04:30 of the 21st; a Bogota user at 18:00 of the 20th', () => {
    withUserTimezone(KOLKATA, () => {
      expect(businessSlotForUser('2026-10-20', '19:00', NY)).toEqual({ text: '04:30', date: '2026-10-21' })
      expect(utcInZone('2026-10-20 23:00:00')).toEqual({ date: '2026-10-21', time: '04:30' })
    })
    withUserTimezone(BOGOTA, () => {
      expect(businessSlotForUser('2026-10-20', '19:00', NY)).toEqual({ text: '18:00', date: '2026-10-20' })
      expect(utcInZone('2026-10-20 23:00:00')).toEqual({ date: '2026-10-20', time: '18:00' })
    })
  })

  it('without a value there is no date', () => {
    expect(utcInZone(null, NY)).toBeNull()
    expect(utcInZone('', NY)).toBeNull()
  })
})

describe('zonedDatesFrom (the reservation\'s and the professional\'s days)', () => {
  it.each(USER_ZONES)('the days are the zone\'s: at 02:00 UTC of the 21st a New York business is still on the 20th (user in %s)', (zone) => {
    withUserTimezone(zone, () => {
      const now = new Date('2026-10-21T02:00:00Z').getTime()
      expect(zonedDatesFrom(NY, { count: 3, now })).toEqual(['2026-10-20', '2026-10-21', '2026-10-22'])
      expect(zonedDatesFrom(KOLKATA, { count: 1, now })).toEqual(['2026-10-21'])
      // a lead time of 5 h moves the first day to the 21st in New York
      expect(zonedDatesFrom(NY, { fromMinutes: 300, count: 2, now })).toEqual(['2026-10-21', '2026-10-22'])
    })
  })

  it('across the DST change the dates stay consecutive', () => {
    const now = new Date('2026-10-24T12:00:00Z').getTime()
    withUserTimezone(KOLKATA, () => {
      expect(zonedDatesFrom(MADRID, { count: 3, now })).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
    })
  })
})
