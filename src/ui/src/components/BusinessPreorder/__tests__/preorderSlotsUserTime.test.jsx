import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import dayjs from 'dayjs'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { BusinessPreorder } from '../index'

// The store's preorder with the real MomentOption (submodule) and getTimes:
// a slot's value is the business's wall clock and is what is sent; its text
// is that instant in the user's time.
const changeMoment = vi.fn()
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, moment: null }, carts: {}, loading: false }, { changeMoment }]
}))
vi.unmock('~ui/utils')
vi.mock('~ui/src/components/BusinessMenuList', () => ({ BusinessMenuList: () => null }))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: ({ datesList, timeList, handleChangeDate, handleChangeTime }) => (
    <div>
      {datesList.map(date => (
        <button key={date} data-testid={`date-${date}`} onClick={() => handleChangeDate(date)}>{date}</button>
      ))}
      {timeList.map(slot => (
        <button
          key={slot.value}
          data-testid='slot'
          data-value={slot.value}
          data-text={slot.text}
          data-end={slot.endText || ''}
          data-day={slot.userDate || ''}
          onClick={() => handleChangeTime(slot.value)}
        >
          {slot.text}
        </button>
      ))}
    </div>
  )
}))

const NY = 'America/New_York'
const lapse = (open, close) => ({ open: { hour: open[0], minute: open[1] }, close: { hour: close[0], minute: close[1] } })
const business = {
  id: 1,
  slug: 'ny',
  name: 'NY',
  timezone: NY,
  schedule: Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([9, 0], [22, 0])] }))
}
const DATE = '2026-10-21'

const collect = (zone, props = {}) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Tuesday 2026-10-20 08:00 in New York
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  const view = renderWithProviders(<BusinessPreorder business={business} {...props} />, { initialEntries: ['/store/ny'] })
  act(() => { fireEvent.click(view.getByTestId(`date-${DATE}`)) })
  const slots = view.queryAllByTestId('slot').map((button) => {
    changeMoment.mockClear()
    act(() => { fireEvent.click(button) })
    const sent = dayjs(changeMoment.mock.calls[0][0])
    return { ...button.dataset, sent: sent.toISOString(), sentLocal: sent.format('YYYY-MM-DD HH:mm') }
  })
  view.unmount()
  return slots
})

afterEach(() => {
  vi.useRealTimers()
})

describe.each([
  ['business hours (getTimes)', {}],
  ['catering (the hours list)', { cateringPreorder: true }]
])('BusinessPreorder slots, %s', (_, props) => {
  it.each(['America/New_York', 'Europe/Madrid', 'Asia/Kolkata', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland'])(
    'a user in %s: the instant sent is the business wall clock, the text is it in their time',
    (zone) => {
      const slots = collect(zone, props)
      expect(slots.length).toBeGreaterThan(0)
      for (const slot of slots) {
        expect(slot.sent).toBe(dayjs.tz(`${DATE} ${slot.value}`, 'YYYY-MM-DD HH:mm', NY).toISOString())
        expect(slot.text).toBe(slot.sentLocal.slice(11))
        expect(slot.day).toBe(slot.sentLocal.slice(0, 10))
        if (zone === NY) expect(slot.text).toBe(slot.value)
      }
    }
  )
})

describe('BusinessPreorder: a New York evening slot from Madrid', () => {
  it('is the next day, 02:00, for a user in Madrid', () => {
    const slot = collect('Europe/Madrid').find(s => s.value === '20:00')
    expect(slot).toMatchObject({ text: '02:00', day: '2026-10-22', sent: '2026-10-22T00:00:00.000Z' })
  })
})
