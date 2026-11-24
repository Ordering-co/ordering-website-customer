import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { businessSlotForUser } from '~/utils/businessTime'
import { BusinessReservation } from '../index'

// A reservation's days and times are the business's (its schedule is wall
// clock of its zone), each time shows in the user's time, and reserve_date
// is sent as the UTC instant, as api-core reads it.
const NY = 'America/New_York'
const lapse = (open, close) => ({ open: { hour: open[0], minute: open[1] }, close: { hour: close[0], minute: close[1] } })
const business = {
  id: 1,
  timezone: NY,
  schedule: Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([9, 0], [22, 0])] }))
}
const setReservationState = vi.fn()
const controller = { cart: { products: [] } }

vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => null }))
vi.unmock('~ui/utils')
vi.mock('~components/components/BusinessReservation', () => ({
  BusinessReservation: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={controller.cart}
      reservationState={{ changes: { guests_reservation: 2, reserve_date: controller.cart?.reservation?.reserve_date ?? null } }}
      setReservationState={setReservationState}
      reservationSetting={{ min_guests_reservation: 2, max_guests_reservation: 4, min_time_reserve_minutes: 0, max_time_reserve_days: 3 }}
      handleAddReservation={vi.fn()}
      checkoutFieldsState={{ fields: [] }}
      orderingMethod={1}
      setOrderingMethod={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: ({ datesList, dateSelected, timeSelected, selectedSlot, timeList, isEnabled, handleChangeDate, handleChangeTime }) => (
    <div
      data-testid='steps'
      data-dates={datesList.join(',')}
      data-date={dateSelected || ''}
      data-time={timeSelected || ''}
      data-selected-text={selectedSlot?.text || ''}
      data-selected-day={selectedSlot?.userDate || ''}
      data-enabled={String(!!isEnabled)}
    >
      {datesList.map(date => (
        <button key={date} data-testid={`date-${date}`} onClick={() => handleChangeDate(date)}>{date}</button>
      ))}
      {timeList.map(slot => (
        <button key={slot.value} data-testid={`slot-${slot.value}`} data-text={slot.text} data-day={slot.userDate || ''} onClick={() => handleChangeTime(slot.value)}>
          {slot.text}
        </button>
      ))}
    </div>
  )
}))

const ZONES = ['America/Bogota', 'America/New_York', 'Europe/Madrid', 'Asia/Kolkata', 'UTC']

const render = (zone, cart, fn) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // 22:00 of Tue 20 in New York (02:00 of Wed 21 UTC)
  vi.setSystemTime(new Date('2026-10-21T02:00:00Z'))
  controller.cart = cart
  setReservationState.mockClear()
  const view = renderWithProviders(<BusinessReservation business={business} />)
  try {
    return fn(view)
  } finally {
    view.unmount()
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BusinessReservation: the business\'s days and times, sent in UTC', () => {
  it.each(ZONES)('a user in %s: the days are New York\'s and 19:00 of Wed 21 is sent as 23:00 UTC', (zone) => {
    render(zone, { products: [] }, (view) => {
      const steps = view.getByTestId('steps')
      expect(steps.dataset.dates).toBe('2026-10-20,2026-10-21,2026-10-22')
      act(() => { fireEvent.click(view.getByTestId('date-2026-10-21')) })
      const slot = view.getByTestId('slot-19:00')
      const expected = businessSlotForUser('2026-10-21', '19:00', NY)
      expect(slot.dataset.text).toBe(expected.text)
      expect(slot.dataset.day).toBe(expected.date)
      act(() => { fireEvent.click(slot) })
      const changes = setReservationState.mock.calls.at(-1)[0].changes
      expect(changes.reserve_date).toBe('2026-10-21 23:00:00')
    })
  })

  it('a Kolkata user reads 19:00 New York of the 21st as 04:30 of the 22nd; a Bogota user as 18:00', () => {
    render('Asia/Kolkata', { products: [] }, (view) => {
      act(() => { fireEvent.click(view.getByTestId('date-2026-10-21')) })
      expect(view.getByTestId('slot-19:00').dataset.text).toBe('04:30')
      expect(view.getByTestId('slot-19:00').dataset.day).toBe('2026-10-22')
    })
    render('America/Bogota', { products: [] }, (view) => {
      act(() => { fireEvent.click(view.getByTestId('date-2026-10-21')) })
      expect(view.getByTestId('slot-19:00').dataset.text).toBe('18:00')
    })
  })

  it.each(ZONES)('a stored reservation (UTC) opens on its New York day and slot, in the user\'s time (%s)', (zone) => {
    render(zone, { products: [], reservation: { reserve_date: '2026-10-21 23:00:00', guests_reservation: 2 } }, (view) => {
      const steps = view.getByTestId('steps')
      expect(steps.dataset.date).toBe('2026-10-21')
      expect(steps.dataset.time).toBe('19:00')
      const expected = businessSlotForUser('2026-10-21', '19:00', NY)
      expect(steps.dataset.selectedText).toBe(expected.text)
      expect(steps.dataset.selectedDay).toBe(expected.date)
    })
  })

  it.each(ZONES)('the first day is New York\'s today, its past slots left out (%s)', (zone) => {
    render(zone, { products: [] }, (view) => {
      // 22:00 in New York: only the 22:00 slot of the 20th is left
      expect(view.getByTestId('steps').dataset.date).toBe('2026-10-20')
      const slots = view.queryAllByTestId(/^slot-/).map((el) => el.dataset.testid)
      expect(slots).toEqual(['slot-22:00'])
    })
  })
})
