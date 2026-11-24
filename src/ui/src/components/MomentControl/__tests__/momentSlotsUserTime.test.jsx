import React from 'react'
import fs from 'fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import dayjs from 'dayjs'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { MomentControl } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}


// The preorder picker with the real MomentOption (submodule): a slot is the
// business's wall clock (its `value`); what is sent is MomentOption's
// changeMoment(instant). The label is that instant in the user's time.
const changeMoment = vi.fn()
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, moment: null }, carts: {}, loading: false }, { changeMoment }]
}))
// ~ui/utils is the real one (getTimes)
vi.unmock('~ui/utils')
// the steps as plain buttons: one per day, one per slot
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
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse([9, 0], [22, 0])] }))
const business = { id: 1, slug: 'ny', timezone: NY, schedule }

// Tuesday 2026-10-20 08:00 in New York (14:00 Madrid, 17:30 Kolkata, 05:00 Los Angeles)
const NOW = new Date('2026-10-20T12:00:00Z')
// Europe leaves DST on Sunday 2026-10-25: New York is 5h behind Madrid that week, 6h before
const DATES = ['2026-10-20', '2026-10-21', '2026-10-25', '2026-10-26']
const ZONES = ['America/New_York', 'Europe/Madrid', 'Asia/Kolkata', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland']

// every slot of each date: its value, its labels and the instant sent
const collect = (zone, path) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  if (path === '/store/ny') window.localStorage.setItem('business_schedule', JSON.stringify(schedule))
  else window.localStorage.removeItem('business_schedule')
  const view = renderWithProviders(<MomentControl business={business} />, { initialEntries: [path] })
  fireEvent.click(view.getByText('Schedule for later'))
  const out = {}
  for (const date of DATES) {
    act(() => { fireEvent.click(view.getByTestId(`date-${date}`)) })
    out[date] = view.queryAllByTestId('slot').map((button) => {
      changeMoment.mockClear()
      act(() => { fireEvent.click(button) })
      const sent = changeMoment.mock.calls[0]?.[0]
      return {
        value: button.dataset.value,
        text: button.dataset.text,
        end: button.dataset.end,
        day: button.dataset.day,
        sent: sent ? dayjs(sent).toISOString() : null,
        sentLocal: sent ? dayjs(sent).format('YYYY-MM-DD HH:mm') : null,
        // 30 minutes on (preorder_slot_interval), in the user's time
        endLocal: sent ? dayjs(sent).add(30, 'minute').format('HH:mm') : null
      }
    })
  }
  view.unmount()
  return out
})

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.removeItem('business_schedule')
})

describe('preorder slots: computed for the business, shown in the user\'s time', () => {
  const paths = ['/', '/store/ny']

  it.each(paths)('the instant sent is the business wall clock of the slot, for any user zone (%s)', (path) => {
    const proof = {}
    for (const zone of ZONES) {
      const slots = collect(zone, path)
      proof[zone] = slots
      for (const date of DATES) {
        expect(slots[date].length).toBeGreaterThan(0)
        for (const slot of slots[date]) {
          // what is sent: the slot's business wall clock on the business day
          expect(slot.sent).toBe(dayjs.tz(`${date} ${slot.value}`, 'YYYY-MM-DD HH:mm', NY).toISOString())
          // what is shown: that instant in the user's time and the user's date of it
          expect(slot.text).toBe(slot.sentLocal.slice(11))
          expect(slot.day).toBe(slot.sentLocal.slice(0, 10))
          expect(slot.end).toBe(slot.endLocal)
        }
      }
    }
    // the same instants whatever the user's zone
    for (const zone of ZONES) {
      expect(proof[zone]['2026-10-21'].map(s => [s.value, s.sent])).toEqual(proof[NY]['2026-10-21'].map(s => [s.value, s.sent]))
    }
    if (process.env.SLOT_PROOF_OUT) {
      fs.writeFileSync(`${process.env.SLOT_PROOF_OUT}${path === '/' ? 'hours' : 'store'}.json`, JSON.stringify(proof, null, 1))
    }
    // six zones, each one a full render of the slots: slower than the default
    // 5 s on CI with coverage
  }, 30000)
})

describe('preorder slots of a New York business, as users elsewhere see them', () => {
  const slotOf = (slots, value) => slots.find(slot => slot.value === value)

  it('a New York user sees the business hours as they are', () => {
    const slots = collect(NY, '/store/ny')['2026-10-21']
    expect(slotOf(slots, '09:00')).toMatchObject({ text: '09:00', end: '09:30', day: '2026-10-21' })
    expect(slotOf(slots, '20:00')).toMatchObject({ text: '20:00', end: '20:30', day: '2026-10-21' })
  })

  it.each([
    // zone, NY 09:00 on Wed 21, NY 20:00 on Wed 21 (the user's date and time)
    ['Europe/Madrid', ['2026-10-21', '15:00'], ['2026-10-22', '02:00']],
    ['Asia/Kolkata', ['2026-10-21', '18:30'], ['2026-10-22', '05:30']],
    ['America/Los_Angeles', ['2026-10-21', '06:00'], ['2026-10-21', '17:00']]
  ])('a user in %s sees the slots in their own time and day', (zone, morning, evening) => {
    for (const path of ['/', '/store/ny']) {
      const slots = collect(zone, path)['2026-10-21']
      expect(slotOf(slots, '09:00')).toMatchObject({ day: morning[0], text: morning[1] })
      expect(slotOf(slots, '20:00')).toMatchObject({ day: evening[0], text: evening[1] })
    }
  })

  it('the DST week: Madrid is 5 hours ahead of New York from Sunday 2026-10-25 to 2026-10-31', () => {
    const slots = collect('Europe/Madrid', '/store/ny')
    expect(slotOf(slots['2026-10-21'], '09:00').text).toBe('15:00')
    expect(slotOf(slots['2026-10-25'], '09:00').text).toBe('14:00')
    expect(slotOf(slots['2026-10-26'], '09:00').text).toBe('14:00')
    expect(slotOf(slots['2026-10-25'], '20:00')).toMatchObject({ day: '2026-10-26', text: '01:00' })
  })
})


describe('the ASAP choice says the user\'s now', () => {
  it.each([
    // 2026-10-20 23:30 UTC: Tuesday 19:30 in New York, Wednesday 01:30 in Madrid
    [NY, 'Tuesday, October 20, 2026'],
    ['Europe/Madrid', 'Wednesday, October 21, 2026'],
    ['Asia/Kolkata', 'Wednesday, October 21, 2026']
  ])('a user in %s', (zone, day) => {
    withUserTimezone(zone, () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-20T23:30:00Z'))
      const view = renderWithProviders(<MomentControl business={business} />)
      expect(view.getByText(/^ASAP \(/).textContent).toContain(day)
      view.unmount()
    })
  })
})
