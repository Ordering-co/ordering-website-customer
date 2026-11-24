import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { parseDateLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { businessSlotForUser } from '~/utils/businessTime'
import { ServiceForm } from '../index'

// A professional's schedule is wall clock of their zone (else the
// business's); the slots show in the user's time and service_start is sent
// as the UTC instant (api-core: CartController service_timezone).
const handleSave = vi.fn()
const controller = { professionals: [], productCart: null, isCartProduct: false }
vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: { id: 50, name: 'Haircut', price: 45, duration: 30, gallery: [] }, loading: false, error: null }}
      professionalListState={{ loading: false, professionals: controller.professionals }}
      handleSave={handleSave}
      isSoldOut={false}
      maxProductQuantity={99}
      handleCreateGuestUser={vi.fn()}
      productCart={controller.productCart}
      isCartProduct={controller.isCartProduct}
      actionStatus={{ loading: false }}
      {...rest}
    />
  )
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 }, token: 't' }, { login: vi.fn() }]
}))
// the day chips read t('DAY<n>') without a fallback: the key stands in
const days = { DAY1: 'Monday', DAY2: 'Tuesday', DAY3: 'Wednesday', DAY4: 'Thursday', DAY5: 'Friday', DAY6: 'Saturday', DAY7: 'Sunday' }
const t = (key, fallback) => fallback ?? days[key] ?? key
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ loading: false }, t]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: parseDateLikeApp, parsePrice: (value) => `$${value}`, optimizeImage: (url) => url, is12Hours: false }]
}))
vi.unmock('~ui/utils')
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const NY = 'America/New_York'
const MADRID = 'Europe/Madrid'
const lapse = (open, close) => ({ open: { hour: open[0], minute: open[1] }, close: { hour: close[0], minute: close[1] } })
// only Tuesdays (2026-10-20), 09:00-13:00 of the professional's zone
const tuesdays = Array.from({ length: 7 }, (_, day) => (
  day === 2 ? { enabled: true, lapses: [lapse([9, 0], [13, 0])] } : { enabled: false, lapses: [] }
))
const madridPro = { id: 7, name: 'Ana', lastname: 'M', timezone: MADRID, schedule: tuesdays, busy_times: [] }
const zonelessPro = { id: 8, name: 'Bo', lastname: 'N', schedule: tuesdays, busy_times: [] }

const chips = (view) => [...view.container.querySelectorAll('[data-doc-control="appointment-time"]')]

const book = (zone, professional, wallClock) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Monday 2026-10-19 12:00 UTC
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
  controller.professionals = [professional]
  handleSave.mockClear()
  const view = renderWithProviders(
    <ServiceForm businessTimezone={NY} professionalSelected={professional} />,
    { theme: themeWithValues() }
  )
  // the days are the professional's: Tuesday 20 (in their zone)
  act(() => { fireEvent.click(view.getAllByText('20')[0]) })
  const timezone = professional.timezone || NY
  const expected = businessSlotForUser('2026-10-20', wallClock, timezone)
  const chip = chips(view).find((el) => el.textContent.startsWith(expected.text))
  const labels = chips(view).map((el) => el.textContent)
  const unavailable = chips(view).filter((el) => el.hasAttribute('aria-describedby'))
  for (const slot of unavailable) {
    expect(slot).toHaveAccessibleDescription('Not available')
    expect(slot).not.toHaveAttribute('aria-disabled')
  }
  act(() => { fireEvent.click(chip) })
  expect(chip).toHaveAttribute('aria-pressed', 'true')
  act(() => { fireEvent.click(view.getByText('Book')) })
  const sent = handleSave.mock.calls[0]?.[0]?.serviceTime
  view.unmount()
  return { sent, labels, unavailableCount: unavailable.length, expected }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ServiceForm: a professional\'s slots in their zone, sent in UTC', () => {
  it.each(['America/Bogota', 'America/New_York', 'Europe/Madrid', 'Asia/Kolkata', 'UTC'])(
    'Madrid professional, New York business, user in %s: 09:00 Madrid is sent as 07:00 UTC',
    (zone) => {
      const { sent, labels, unavailableCount, expected } = book(zone, madridPro, '09:00')
      expect(sent).toBe('2026-10-20 07:00:00')
      // 17 slots 09:00-13:00 Madrid, the first one in the user's time
      expect(labels).toHaveLength(17)
      expect(labels[0].startsWith(expected.text)).toBe(true)
      // a 30 min service does not fit from 12:45 on
      expect(unavailableCount).toBe(2)
    }
  )

  it.each(['America/Bogota', 'Europe/Madrid', 'Asia/Kolkata'])(
    'a professional without a zone takes the New York business\'s: 09:00 New York is 13:00 UTC (user in %s)',
    (zone) => {
      expect(book(zone, zonelessPro, '09:00').sent).toBe('2026-10-20 13:00:00')
    }
  )

  it('a Bogota user reads 09:00 Madrid as 02:00; a Honolulu user as 21:00 of Monday 19, tagged', () => {
    expect(book('America/Bogota', madridPro, '09:00').labels[0]).toBe('02:00')
    const honolulu = book('Pacific/Honolulu', madridPro, '09:00')
    expect(honolulu.labels[0]).toMatch(/^21:00 · Mon 19$/)
    expect(honolulu.sent).toBe('2026-10-20 07:00:00')
  })

  it.each(['America/Bogota', 'Asia/Kolkata', 'UTC'])('a booked service (UTC) opens on its slot of the professional (user in %s)', (zone) => {
    withUserTimezone(zone, () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
      const booked = { ...madridPro, busy_times: [{ start: '2026-10-20 08:00:00', end: '2026-10-20 08:30:00', duration: 30 }] }
      controller.professionals = [booked]
      controller.isCartProduct = true
      controller.productCart = { calendar_event: { start: '2026-10-20 08:00:00', end: '2026-10-20 08:30:00', professional: booked } }
      handleSave.mockClear()
      const view = renderWithProviders(
        <ServiceForm businessTimezone={NY} professionalSelected={booked} />,
        { theme: themeWithValues() }
      )
      // 10:00 Madrid is selected, and is not busy (its own time)
      const selected = chips(view).find((el) => el.textContent.startsWith(businessSlotForUser('2026-10-20', '10:00', MADRID).text))
      expect(selected).toHaveAttribute('aria-pressed', 'true')
      expect(selected).not.toHaveAttribute('aria-describedby')
      expect(chips(view).filter((el) => el.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
      act(() => { fireEvent.click(view.getByText('Book')) })
      expect(handleSave.mock.calls[0][0].serviceTime).toBe('2026-10-20 08:00:00')
      view.unmount()
      controller.isCartProduct = false
      controller.productCart = null
    })
  })
})
