import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { businessSlotForUser } from '~/utils/businessTime'
import { ProfessionalProfile } from '../index'

// The professional's schedule in the profile: the real BusinessPreorder and
// MomentOption (submodule) with the professional as the "business", whose
// zone is the professional's, else the business's.
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, moment: null }, carts: {}, loading: false }, { changeMoment: vi.fn() }]
}))
vi.unmock('~ui/utils')
vi.mock('~ui/src/components/BusinessMenuList', () => ({ BusinessMenuList: () => null }))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: ({ datesList, timeList, handleChangeDate, business, getMomentTime, isBusyTime }) => (
    <div>
      {datesList.map(date => (
        <button key={date} data-testid={`date-${date}`} onClick={() => handleChangeDate(date)}>{date}</button>
      ))}
      {timeList.map(slot => (
        <span
          key={slot.value}
          data-testid='slot'
          data-value={slot.value}
          data-text={slot.text}
          data-busy={String(!!isBusyTime(business, getMomentTime(slot.value)))}
        />
      ))}
    </div>
  )
}))

const NY = 'America/New_York'
const MADRID = 'Europe/Madrid'
const lapse = (open, close) => ({ open: { hour: open[0], minute: open[1] }, close: { hour: close[0], minute: close[1] } })
const tuesdays = Array.from({ length: 7 }, (_, day) => (
  day === 2 ? { enabled: true, lapses: [lapse([9, 0], [13, 0])] } : { enabled: false, lapses: [] }
))
// busy 08:00-09:00 UTC = 10:00-11:00 Madrid
const busy = [{ start: '2026-10-20 08:00:00', end: '2026-10-20 09:00:00', duration: 60 }]

const slotsOf = (zone, professional) => withUserTimezone(zone, () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
  const view = renderWithProviders(
    <ProfessionalProfile currentProfessional={professional} businessTimezone={NY} handleChangeProfessionalSelected={vi.fn()} />
  )
  act(() => { fireEvent.click(view.getByTestId('date-2026-10-20')) })
  const slots = view.queryAllByTestId('slot').map((el) => ({ ...el.dataset }))
  view.unmount()
  return slots
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ProfessionalProfile: the schedule in the professional\'s zone, shown in the user\'s time', () => {
  it.each(['America/Bogota', 'America/New_York', 'Europe/Madrid', 'Asia/Kolkata', 'UTC'])(
    'a Madrid professional (New York business), user in %s: Tuesday 09:00-13:00 Madrid, busy 10:00-11:00 Madrid',
    (zone) => {
      const slots = slotsOf(zone, { id: 1, name: 'Ana', timezone: MADRID, schedule: tuesdays, busy_times: busy })
      expect(slots.map((slot) => slot.value)).toHaveLength(17)
      expect(slots[0].value).toBe('09:00')
      withUserTimezone(zone, () => {
        expect(slots[0].text).toBe(businessSlotForUser('2026-10-20', '09:00', MADRID).text)
      })
      expect(slots.filter((slot) => slot.busy === 'true').map((slot) => slot.value)).toEqual(['10:15', '10:30', '10:45'])
    }
  )

  it.each(['America/Bogota', 'Asia/Kolkata', 'UTC'])(
    'a professional without a zone is read in the New York business\'s (user in %s): that busy time is 04:00-05:00 there',
    (zone) => {
      const slots = slotsOf(zone, { id: 2, name: 'Bo', schedule: tuesdays, busy_times: busy })
      expect(slots[0].value).toBe('09:00')
      withUserTimezone(zone, () => {
        expect(slots[0].text).toBe(businessSlotForUser('2026-10-20', '09:00', NY).text)
      })
      expect(slots.filter((slot) => slot.busy === 'true')).toHaveLength(0)
    }
  )
})
