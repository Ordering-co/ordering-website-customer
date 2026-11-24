import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { CustomLayout } from '../index'

vi.unmock('~ui-icon')
vi.mock('react-calendar/dist/Calendar.css', () => ({}))
vi.mock('react-calendar', () => ({
  // (react-calendar's month arrows: its own buttons around the labels it is given)
  default: ({ onChange, prevLabel, nextLabel, prevAriaLabel, nextAriaLabel }) => (
    <div>
      <button type='button' aria-label={prevAriaLabel}>{prevLabel}</button>
      <button type='button' aria-label={nextAriaLabel}>{nextLabel}</button>
      <button type='button' data-testid='calendar' onClick={() => onChange(new Date(2026, 6, 15))}>
        Calendar
      </button>
    </div>
  )
}))

describe('CustomLayout', () => {
  it('renders calendar and time slots', () => {
    const handleChangeDate = vi.fn()
    const handleChangeTime = vi.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <CustomLayout
        datesList={['2026-07-14', '2026-07-15']}
        handleChangeDate={handleChangeDate}
        isEnabled
        timeList={[{ value: '10:00', text: '10:00 AM' }]}
        timeSelected='10:00'
        handleChangeTime={handleChangeTime}
      />
    )
    expect(getByTestId('calendar')).toBeInTheDocument()
    fireEvent.click(getByText('10:00 AM'))
    expect(handleChangeTime).toHaveBeenCalledWith('10:00')
  })

  it('the month arrows are named buttons around their icon', () => {
    const { getByRole } = renderWithProviders(
      <CustomLayout datesList={['2026-07-14']} isEnabled timeList={[]} />
    )
    expect(getByRole('button', { name: 'Previous' }).querySelector('svg')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Next' }).querySelector('svg')).toBeInTheDocument()
    // the base Icon's Lucide chevrons, decorative inside the named buttons
    const prev = getByRole('button', { name: 'Previous' }).querySelector('svg')
    expect(prev.getAttribute('class')).toContain('lucide-chevron-left')
    expect(prev).toHaveAttribute('aria-hidden', 'true')
    expect(getByRole('button', { name: 'Next' }).querySelector('svg').getAttribute('class')).toContain('lucide-chevron-right')
  })
})
