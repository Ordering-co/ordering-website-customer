import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { BusinessInformationUI } from '../index'

// The store's weekly schedule (real ScheduleAccordion): the user's weekdays
// and time, each business day converted on its own date
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => null }))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

const NY = 'America/New_York'
const lapse = (open, close) => ({ open: { hour: open[0], minute: open[1] }, close: { hour: close[0], minute: close[1] } })
const closed = { enabled: false, lapses: [lapse([9, 0], [17, 0])] }
// Monday 09:00-17:00, Wednesday 15:00-22:00, Friday 20:00-23:00 in New York
const schedule = [closed, { enabled: true, lapses: [lapse([9, 0], [17, 0])] }, closed,
  { enabled: true, lapses: [lapse([15, 0], [22, 0])] }, closed,
  { enabled: true, lapses: [lapse([20, 0], [23, 0])] }, closed]

// each row: "Day: hours" (the default time format has seconds: left out here)
const rows = (zone, now, weeklySchedule = schedule) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  const view = renderWithProviders(
    <BusinessInformationUI
      business={{ id: 1, name: 'NY', timezone: NY }}
      businessLocation={{}}
      businessSchedule={weeklySchedule}
      businessPhotos={[]}
      businessVideos={[]}
    />
  )
  const out = Array.from(view.container.querySelectorAll('.info-wrapper')).map(row =>
    `${row.querySelector('.day').textContent}: ${Array.from(row.querySelectorAll('p, span:not(.day)')).map(n => n.textContent).join(', ')}`.replace(/(\d{2}:\d{2}):00/g, '$1')
  )
  view.unmount()
  return out
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BusinessInformation weekly schedule in the user\'s time', () => {
  // Tuesday 2026-10-20 in New York; the next Monday is 2026-10-26
  const NOW = '2026-10-20T12:00:00Z'

  it('a user in New York sees it as it is', () => {
    expect(rows(NY, NOW)).toEqual([
      'Sunday: Closed', 'Monday: 09:00 - 17:00', 'Tuesday: Closed', 'Wednesday: 15:00 - 22:00',
      'Thursday: Closed', 'Friday: 20:00 - 23:00', 'Saturday: Closed'
    ])
  })

  it('a user in Madrid: their time, the next day past midnight, the day a range closes', () => {
    expect(rows('Europe/Madrid', NOW)).toEqual([
      'Sunday: Closed',
      // Monday 2026-10-26: Madrid has left DST (5 hours ahead)
      'Monday: 14:00 GMT+1 - 22:00 GMT+1',
      'Tuesday: Closed',
      // Wednesday 2026-10-21: 6 hours ahead, closes Thursday 04:00
      'Wednesday: 21:00 GMT+2 - 04:00 GMT+2 (Thu)',
      'Thursday: Closed',
      'Friday: Closed',
      // Friday 20:00-23:00 in New York is Saturday 02:00-05:00 in Madrid
      'Saturday: 02:00 GMT+2 - 05:00 GMT+2'
    ])
  })

  it('a user in Kolkata and one in Los Angeles', () => {
    expect(rows('Asia/Kolkata', NOW)).toEqual([
      'Sunday: Closed', 'Monday: 18:30 GMT+5:30 - 02:30 GMT+5:30 (Tue)', 'Tuesday: Closed', 'Wednesday: Closed',
      'Thursday: 00:30 GMT+5:30 - 07:30 GMT+5:30', 'Friday: Closed', 'Saturday: 05:30 GMT+5:30 - 08:30 GMT+5:30'
    ])
    expect(rows('America/Los_Angeles', NOW)).toEqual([
      'Sunday: Closed', 'Monday: 06:00 PDT - 14:00 PDT', 'Tuesday: Closed', 'Wednesday: 12:00 PDT - 19:00 PDT',
      'Thursday: Closed', 'Friday: 17:00 PDT - 20:00 PDT', 'Saturday: Closed'
    ])
  })

  it.each([
    ['America/Chicago', 'Saturday: 09:00 CDT - 17:00 CDT, 21:00 CDT - 02:00 CST (Sun)'],
    ['America/Toronto', 'Saturday: 10:00 - 18:00, 22:00 - 03:00 (Sun)']
  ])('labels the Eastern schedule in %s across midnight and DST', (zone, saturday) => {
    const weeklySchedule = Array.from({ length: 7 }, (_, day) => day === 6
      ? { enabled: true, lapses: [lapse([10, 0], [18, 0]), lapse([22, 0], [3, 0])] }
      : closed)
    const week = rows(zone, '2026-10-31T13:00:00Z', weeklySchedule)
    expect(week[6]).toBe(saturday)
    expect(week[0]).toBe('Sunday: Closed')
  })
})
