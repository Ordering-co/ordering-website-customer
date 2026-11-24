import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PreorderDateTimeSteps } from '../index'
import { dayIsClosed } from '../DayStrip'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const formatTimeDisplay = (text) => {
  const [hours, minutes] = String(text).split(':')
  return { hours, minutes, period: 'AM' }
}

// Wednesday 2026-11-18 through Friday 2026-11-27 (10 days), the same
// calendar as the approved design: the store closes Mondays and
// is in New York.
const DATES = Array.from({ length: 10 }, (_, i) => `2026-11-${18 + i}`)
const NY = 'America/New_York'
const scheduleFixture = (closedWeekdays = []) => Array.from({ length: 7 }, (_, day) => ({
  enabled: !closedWeekdays.includes(day),
  lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 22, minute: 0 } }]
}))
// 2026-11-18 is a Wednesday (weekday 3); open() has no closed weekday.
const businessWithClosed = (closedWeekdays = []) => ({ id: 1, timezone: NY, schedule: scheduleFixture(closedWeekdays) })
const openBusiness = businessWithClosed([])

afterEach(() => {
  vi.useRealTimers()
})

describe('PreorderDateTimeSteps', () => {
  it('renders date and time step headers', () => {
    const { getByText } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={['2026-07-15']}
        dateSelected='2026-07-15'
        timeSelected='12:00'
        timeList={[{ value: '12:00', text: '12:00' }]}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={vi.fn()}
        business={{ id: 1 }}
        hasExistingMoment
      />
    )
    expect(getByText('Choose Date')).toBeInTheDocument()
    expect(getByText('Choose Time')).toBeInTheDocument()
  })

  it('calls handleChangeTime when a time slot is clicked', () => {
    const handleChangeTime = vi.fn()
    const { getByText } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={['2026-07-15']}
        dateSelected='2026-07-15'
        timeSelected=''
        timeList={[{ value: '12:00', text: '12:00' }]}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={handleChangeTime}
        business={{ id: 1 }}
        hasExistingMoment
      />
    )
    fireEvent.click(getByText('Choose Time').closest('button'))
    fireEvent.click(getByText('12:00 AM'))
    expect(handleChangeTime).toHaveBeenCalledWith('12:00')
  })

  it('the time slots are options of components.choice in a single choice group', () => {
    const handleChangeTime = vi.fn()
    const { getByText, getByRole } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={['2026-07-15']}
        dateSelected='2026-07-15'
        timeSelected='12:00'
        timeList={[{ value: '12:00', text: '12:00' }, { value: '12:30', text: '12:30' }]}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={handleChangeTime}
        business={{ id: 1 }}
        hasExistingMoment
      />,
      { theme: themeWithValues() }
    )
    fireEvent.click(getByText('Choose Time').closest('button'))
    expect(getByRole('radiogroup', { name: 'Order time' })).toBeInTheDocument()
    expect(getByRole('radio', { name: '12:00 AM' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(getByRole('radio', { name: '12:30 AM' }))
    expect(handleChangeTime).toHaveBeenCalledWith('12:30')
  })

  it('a slot on another day of the user\'s than the business day names the user\'s day', () => {
    const fmt24 = (text) => {
      const [hours, minutes] = String(text).split(':')
      return { hours, minutes, period: null }
    }
    // a New York business's Wednesday 21 seen from Madrid: 20:00 is Thursday 02:00
    const timeList = [
      { value: '19:00', text: '01:00', endText: '01:30', userDate: '2026-10-22' },
      { value: '09:00', text: '15:00', endText: '15:30', userDate: '2026-10-21' }
    ]
    const { getByText, getByRole } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={['2026-10-21']}
        dateSelected='2026-10-21'
        timeSelected='19:00'
        timeList={timeList}
        isEnabled
        showTimeRange
        formatTimeDisplay={fmt24}
        handleChangeDate={vi.fn()}
        handleChangeTime={vi.fn()}
        business={{ id: 1 }}
        hasExistingMoment
      />,
      { theme: themeWithValues() }
    )
    // the chosen time in the step's header says the user's day too
    expect(getByText('01:00 · Thu 22')).toBeInTheDocument()
    fireEvent.click(getByText('Choose Time').closest('button'))
    expect(getByRole('radio', { name: '01:00 – 01:30 · Thu 22' })).toBeInTheDocument()
    expect(getByRole('radio', { name: '15:00 – 15:30' })).toBeInTheDocument()
  })
})

// 2026-11-18T15:00:00Z is 2026-11-18 10:00 in New York (EST, UTC-5): the
// store's clock, mid-lapse, on the same Wednesday the approved design uses.
const NOW = '2026-11-18T15:00:00Z'
const dayButton = (container, date) => container.querySelector(`[data-doc-date="${date}"]`)

// A day is a controlled prop (dateSelected): simulate the parent updating
// it from handleChangeDate, as BusinessPreorder/MomentControl/
// BusinessReservation do.
const ControlledDateStrip = ({ handleChangeDate, ...props }) => {
  const [dateSelected, setDateSelected] = useState(null)
  return (
    <PreorderDateTimeSteps
      {...props}
      dateSelected={dateSelected}
      handleChangeDate={(date) => { handleChangeDate(date); setDateSelected(date) }}
    />
  )
}

describe('PreorderDateTimeSteps — the day strip', () => {
  it('opens without a scheduled moment: no day selected, today tagged "Today"', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const { getAllByRole, getByText } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={DATES}
        dateSelected={null}
        timeSelected=''
        timeList={[]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={vi.fn()}
        business={openBusiness}
      />,
      { theme: themeWithValues() }
    )
    const days = getAllByRole('radio')
    expect(days).toHaveLength(DATES.length)
    expect(days.every((day) => day.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(getByText('Today')).toBeInTheDocument()
  })

  it('with a scheduled moment, only that day is checked', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const { container } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={DATES}
        dateSelected={DATES[2]}
        timeSelected=''
        timeList={[{ value: '12:00', text: '12:00' }]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={vi.fn()}
        business={openBusiness}
        hasExistingMoment
      />,
      { theme: themeWithValues() }
    )
    expect(dayButton(container, DATES[2])).toHaveAttribute('aria-checked', 'true')
    expect(dayButton(container, DATES[0])).toHaveAttribute('aria-checked', 'false')
    expect(dayButton(container, DATES[5])).toHaveAttribute('aria-checked', 'false')
  })

  it('today closed by schedule: disabled, "Closed", unclickable, and the first available day is hinted', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const handleChangeDate = vi.fn()
    const { container, getByText } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={DATES}
        dateSelected={null}
        timeSelected=''
        timeList={[]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={handleChangeDate}
        handleChangeTime={vi.fn()}
        business={businessWithClosed([3])}
      />,
      { theme: themeWithValues() }
    )
    const today = dayButton(container, DATES[0])
    expect(today).toHaveAttribute('aria-disabled', 'true')
    expect(today).toHaveTextContent('Closed')
    fireEvent.click(today)
    expect(handleChangeDate).not.toHaveBeenCalled()
    expect(getByText(/First available day/)).toHaveTextContent('Thursday, November 19th, 2026')
  })

  it('the first 3 days closed: the 4th is the first available, nothing selected', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const { container, getAllByRole, getByText } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={DATES}
        dateSelected={null}
        timeSelected=''
        timeList={[]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={vi.fn()}
        handleChangeTime={vi.fn()}
        business={businessWithClosed([3, 4, 5])}
      />,
      { theme: themeWithValues() }
    )
    expect(dayButton(container, DATES[0])).toHaveAttribute('aria-disabled', 'true')
    expect(dayButton(container, DATES[1])).toHaveAttribute('aria-disabled', 'true')
    expect(dayButton(container, DATES[2])).toHaveAttribute('aria-disabled', 'true')
    expect(dayButton(container, DATES[3])).not.toHaveAttribute('aria-disabled')
    expect(getAllByRole('radio').every((day) => day.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(getByText(/First available day/)).toHaveTextContent('Saturday, November 21st, 2026')
  })

  it('arrow keys move focus (skipping closed days) without selecting; Enter selects the focused day', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const handleChangeDate = vi.fn()
    const { container } = renderWithProviders(
      <PreorderDateTimeSteps
        datesList={DATES}
        dateSelected={null}
        timeSelected=''
        timeList={[{ value: '12:00', text: '12:00' }]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={handleChangeDate}
        handleChangeTime={vi.fn()}
        business={openBusiness}
      />,
      { theme: themeWithValues() }
    )
    fireEvent.keyDown(dayButton(container, DATES[0]), { key: 'ArrowRight' })
    expect(handleChangeDate).not.toHaveBeenCalled()
    expect(dayButton(container, DATES[1])).toHaveAttribute('tabindex', '0')
    expect(dayButton(container, DATES[0])).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(dayButton(container, DATES[1]), { key: 'Enter' })
    expect(handleChangeDate).toHaveBeenCalledWith(DATES[1])
  })

  it('touching a day checks it and unlocks the time step', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const handleChangeDate = vi.fn()
    const { container, getByRole, queryByText } = renderWithProviders(
      <ControlledDateStrip
        datesList={DATES}
        timeSelected=''
        timeList={[{ value: '12:00', text: '12:00' }]}
        maxDays={DATES.length}
        isEnabled
        formatTimeDisplay={formatTimeDisplay}
        handleChangeDate={handleChangeDate}
        handleChangeTime={vi.fn()}
        business={openBusiness}
      />,
      { theme: themeWithValues() }
    )
    fireEvent.click(dayButton(container, DATES[0]))
    expect(handleChangeDate).toHaveBeenCalledWith(DATES[0])
    expect(dayButton(container, DATES[0])).toHaveAttribute('aria-checked', 'true')
    expect(queryByText('Select a day first to see available times')).not.toBeInTheDocument()
    expect(getByRole('radio', { name: '12:00 AM' })).toBeInTheDocument()
  })
})

describe('dayIsClosed', () => {
  const week = (lapses) => Array.from({ length: 7 }, () => ({ enabled: true, lapses }))
  const business = (lapses) => ({ timezone: 'UTC', schedule: week(lapses) })
  const evening = '2026-11-18T22:00:00Z'

  it('is closed today once every lapse is over', () => {
    expect(dayIsClosed('2026-11-18', business([{ open: { hour: 9, minute: 0 }, close: { hour: 15, minute: 0 } }]), evening)).toBe(true)
  })

  it('stays open today with a lapse running past midnight', () => {
    expect(dayIsClosed('2026-11-18', business([{ open: { hour: 18, minute: 0 }, close: { hour: 2, minute: 0 } }]), evening)).toBe(false)
  })

  it('is closed on a disabled weekday and open without a schedule', () => {
    const b = business([])
    b.schedule[4] = { enabled: false }
    expect(dayIsClosed('2026-11-19', b, evening)).toBe(true)
    expect(dayIsClosed('2026-11-19', {}, evening)).toBe(false)
  })
})

describe('DayStrip regressions (implementation notes review)', () => {
  const stepsProps = {
    timeSelected: '',
    timeList: [],
    isEnabled: true,
    formatTimeDisplay,
    handleChangeDate: vi.fn(),
    handleChangeTime: vi.fn(),
    ClosedBusinessMsg: 'p'
  }

  it('keeps one tab stop when the dates arrive after mount', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const { container, rerender } = renderWithProviders(
      <PreorderDateTimeSteps {...stepsProps} datesList={[]} dateSelected={null} maxDays={DATES.length} business={openBusiness} />,
      { theme: themeWithValues() }
    )
    rerender(<PreorderDateTimeSteps {...stepsProps} datesList={DATES} dateSelected={null} maxDays={DATES.length} business={openBusiness} />)
    const stops = container.querySelectorAll('[role="radio"][tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toHaveAttribute('data-doc-date', DATES[0])
  })

  it('a confirmed day that has closed since still looks selected', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW))
    const { container } = renderWithProviders(
      <PreorderDateTimeSteps {...stepsProps} datesList={DATES} dateSelected={DATES[0]} maxDays={DATES.length} business={businessWithClosed([0, 1, 2, 3, 4, 5, 6])} hasExistingMoment />,
      { theme: themeWithValues() }
    )
    const day = dayButton(container, DATES[0])
    expect(day).toHaveAttribute('aria-checked', 'true')
    expect(day).toHaveClass('ui:bg-primary') // the theme's primary
  })
})

it('keeps folded panels inert and moves focus when completing each step', () => {
  const { container, getByRole } = renderWithProviders(
    <PreorderDateTimeSteps
      datesList={DATES}
      dateSelected={DATES[0]}
      maxDays={7}
      timeList={[{ value: '12:00', text: '12:00' }]}
      isEnabled
      formatTimeDisplay={formatTimeDisplay}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      business={openBusiness}
      hasExistingMoment
    />
  )
  const date = getByRole('button', { name: /Choose Date/ })
  const time = getByRole('button', { name: /Choose Time/ })
  const panel = (trigger) => document.getElementById(trigger.getAttribute('aria-controls'))
  expect(panel(date)).toHaveAttribute('inert')
  expect(panel(time)).toHaveAttribute('inert')
  fireEvent.click(date)
  expect(panel(date)).not.toHaveAttribute('inert')
  const day = container.querySelector('[data-doc-control=business-preorder-date-day]')
  day.focus()
  fireEvent.click(day)
  expect(panel(date)).toHaveAttribute('inert')
  expect(time).toHaveFocus()
  const slot = getByRole('radio', { name: '12:00 AM' })
  slot.focus()
  fireEvent.click(slot)
  expect(panel(time)).toHaveAttribute('inert')
  expect(time).toHaveFocus()
})
