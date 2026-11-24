import { describe, expect, it } from 'vitest'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { statusLine, storeStatus } from '../status'

const lapse = (open, close) => ({ open: { hour: open, minute: 0 }, close: { hour: close, minute: 0 } })
const days = (...lapses) => Array.from({ length: 7 }, () => ({ enabled: lapses.length > 0, lapses }))
const t = (_key, fallback) => fallback

// one instant, two stores: 18:00 UTC is 12:00 in Chicago (CST) and 03:00 the next day in Tokyo
const NOW = '2026-11-18T18:00:00Z' // a Wednesday in Chicago, a Thursday in Tokyo
const chicago = { timezone: 'America/Chicago', schedule: days(lapse(7, 21)) }
const tokyo = { timezone: 'Asia/Tokyo', schedule: days(lapse(7, 21)) }

describe('storeStatus', () => {
  it('reads the same instant in each store\'s own zone', () => {
    expect(storeStatus(chicago, NOW).open).toBe(true)
    expect(storeStatus(chicago, NOW).closes.format('HH:mm')).toBe('21:00')
    const closed = storeStatus(tokyo, NOW)
    expect(closed.open).toBe(false)
    expect(closed.opens.dayOffset).toBe(0) // 07:00 of Tokyo's today
    expect(closed.opens.instant.format('YYYY-MM-DD HH:mm')).toBe('2026-11-19 07:00')
  })

  it('the day is the store\'s, not the visitor\'s', () => {
    // 04:00 UTC of a Thursday: still Wednesday evening in Chicago (22:00, closed), Thursday midday in Tokyo (13:00, open)
    const late = '2026-11-19T04:00:00Z'
    const thursdayOnly = (zone) => ({ timezone: zone, schedule: Array.from({ length: 7 }, (_, day) => (day === 4 ? { enabled: true, lapses: [lapse(7, 21)] } : { enabled: false, lapses: [] })) })
    withUserTimezone('Pacific/Auckland', () => {
      expect(storeStatus(thursdayOnly('Asia/Tokyo'), late).open).toBe(true)
      expect(storeStatus(thursdayOnly('America/Chicago'), late).open).toBe(false)
    })
  })

  it('has no status without a schedule, and is closed with no opening when no day is enabled', () => {
    expect(storeStatus({ timezone: 'America/Chicago' }, NOW)).toBeNull()
    expect(storeStatus({ timezone: 'America/Chicago', schedule: [] }, NOW)).toBeNull()
    expect(storeStatus({ timezone: 'America/Chicago', schedule: days() }, NOW)).toEqual({ open: false, opens: null })
  })

  it('a paused store (open === false) is closed even when its schedule says open; open true or missing changes nothing', () => {
    expect(storeStatus({ ...chicago, open: false }, NOW)).toEqual({ open: false, opens: null })
    expect(storeStatus({ ...chicago, open: true }, NOW).open).toBe(true)
    expect(storeStatus({ ...tokyo, open: true }, NOW).open).toBe(false) // never opens a closed schedule
  })

  it('a paused store with no schedule is closed with no opening, not "nothing to say"', () => {
    expect(storeStatus({ timezone: 'America/Chicago', open: false }, NOW)).toEqual({ open: false, opens: null })
    expect(storeStatus({ timezone: 'America/Chicago', open: false, schedule: [] }, NOW)).toEqual({ open: false, opens: null })
    expect(storeStatus({ timezone: 'America/Chicago', open: true }, NOW)).toBeNull()
  })

  describe('a lapse that closes at or past midnight', () => {
    // 18:00 to 02:00 of the next day, read in Chicago: 2026-11-18 is a Wednesday (CST, UTC-6)
    const night = { timezone: 'America/Chicago', schedule: days(lapse(18, 2)) }
    const at = (hhmm, date = '2026-11-18') => `${date}T${hhmm}:00-06:00`

    it('is open from the opening until the close of the next day', () => {
      expect(storeStatus(night, at('20:00'))).toMatchObject({ open: true })
      expect(storeStatus(night, at('20:00')).closes.format('YYYY-MM-DD HH:mm')).toBe('2026-11-19 02:00')
    })

    it('is open after midnight because of yesterday\'s lapse', () => {
      const status = storeStatus(night, at('01:00', '2026-11-19'))
      expect(status.open).toBe(true)
      expect(status.closes.format('YYYY-MM-DD HH:mm')).toBe('2026-11-19 02:00')
    })

    it('is closed between its close and the next opening', () => {
      const status = storeStatus(night, at('03:00', '2026-11-19'))
      expect(status.open).toBe(false)
      expect(status.opens.instant.format('YYYY-MM-DD HH:mm')).toBe('2026-11-19 18:00')
    })

    it('a close at 00:00 is the end of that day, not before the opening', () => {
      const midnight = { timezone: 'America/Chicago', schedule: days(lapse(10, 0)) }
      expect(storeStatus(midnight, at('22:00')).open).toBe(true)
      expect(storeStatus(midnight, at('22:00')).closes.format('YYYY-MM-DD HH:mm')).toBe('2026-11-19 00:00')
    })

    it('reads "until 2:00" and "opens 6:00 pm" in the status line', () => {
      withUserTimezone('America/Chicago', () => {
        const line = (hhmm, date) => statusLine(night, { now: at(hhmm, date), timeFormat: 'h:mm a', t })
        expect(line('20:00')).toEqual({ open: true, text: 'Open · until 2:00 am' })
        expect(line('01:00', '2026-11-19').text).toBe('Open · until 2:00 am')
        expect(line('03:00', '2026-11-19').text).toBe('Closed · opens 6:00 pm')
      })
    })
  })

  it('lapses that touch are one open stretch; a gap is not', () => {
    const split = { timezone: 'America/Chicago', schedule: days(lapse(7, 12), lapse(12, 21)) }
    expect(storeStatus(split, NOW).closes.format('HH:mm')).toBe('21:00')
    const lunchBreak = { timezone: 'America/Chicago', schedule: days(lapse(7, 12), lapse(14, 21)) }
    const afterLunch = '2026-11-18T19:00:00Z' // 13:00 in Chicago
    expect(storeStatus(lunchBreak, afterLunch)).toMatchObject({ open: false })
    expect(storeStatus(lunchBreak, afterLunch).opens.instant.format('HH:mm')).toBe('14:00')
  })
})

describe('statusLine', () => {
  const line = (store, now = NOW) => statusLine(store, { now, timeFormat: 'hh:mm a', t })

  it('Open · until the close, Closed · opens the next opening, each in its store\'s clock', () => {
    withUserTimezone('America/Chicago', () => {
      expect(line(chicago)).toEqual({ open: true, text: 'Open · until 09:00 pm' })
    })
    // a visitor in Chicago reading Tokyo's store: its zone is named
    withUserTimezone('America/Chicago', () => {
      expect(line(tokyo)).toEqual({ open: false, text: 'Closed · opens 07:00 am GMT+9' })
    })
    // a visitor in Tokyo reads it without a zone
    withUserTimezone('Asia/Tokyo', () => {
      expect(line(tokyo).text).toBe('Closed · opens 07:00 am')
    })
  })

  it('a paused store reads only Closed', () => {
    withUserTimezone('America/Chicago', () => {
      expect(line({ ...chicago, open: false })).toEqual({ open: false, text: 'Closed' })
    })
  })

  it('names the day when the store does not open today', () => {
    withUserTimezone('America/Chicago', () => {
      const sundayOnly = { timezone: 'America/Chicago', schedule: Array.from({ length: 7 }, (_, day) => (day === 0 ? { enabled: true, lapses: [lapse(9, 15)] } : { enabled: false, lapses: [] })) }
      expect(line(sundayOnly).text).toBe('Closed · opens Sun 09:00 am')
    })
  })

  it('without an opening in the week it is only Closed; without a schedule there is no line; 24 hour format works', () => {
    withUserTimezone('America/Chicago', () => {
      expect(line({ timezone: 'America/Chicago', schedule: days() }).text).toBe('Closed')
      expect(line({ timezone: 'America/Chicago' })).toBeNull()
      expect(statusLine(chicago, { now: NOW, timeFormat: 'HH:mm', t }).text).toBe('Open · until 21:00')
    })
  })
})
