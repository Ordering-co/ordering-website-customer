import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { parseDateLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessItemAccordion } from '../index'

// reserve_date is UTC (api-core stores and reads it so): the cart shows it
// in the user's time, and it is still valid while that instant is ahead.
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 9 }, carts: {}, loading: false }, {}]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: parseDateLikeApp, parsePrice: (value) => `$${value}`, timeFormat: 'HH:mm', optimizeImage: (url) => url }]
}))

const reservation = { reserve_date: '2026-10-20 23:00:00', guests_reservation: 2 }

const line = (zone, now) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  const view = renderWithProviders(
    <BusinessItemAccordion business={businessFixture} cartReservation={reservation} uuid='cart-1' isForceOpenAccordion showBusinessName />
  )
  const span = view.getByText(/Reservation •/)
  const result = { text: span.textContent, danger: span.classList.contains('danger') }
  view.unmount()
  return result
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BusinessItemAccordion: the reservation in the user\'s time', () => {
  it.each([
    ['America/Bogota', '2026-10-20 18:00'],
    ['America/New_York', '2026-10-20 19:00'],
    ['Europe/Madrid', '2026-10-21 01:00'],
    ['Asia/Kolkata', '2026-10-21 04:30'],
    ['UTC', '2026-10-20 23:00']
  ])('a user in %s reads 23:00 UTC as %s', (zone, shown) => {
    expect(line(zone, '2026-10-20T12:00:00Z').text).toContain(`Reservation • ${shown} • 2`)
  })

  it.each(['America/Bogota', 'Asia/Kolkata', 'UTC'])('valid until that instant, whatever the user\'s zone (%s)', (zone) => {
    expect(line(zone, '2026-10-20T22:59:00Z').danger).toBe(false)
    expect(line(zone, '2026-10-20T23:01:00Z').danger).toBe(true)
  })
})
