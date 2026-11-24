import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { businessFixture } from '../../__tests__/helpers/cartTestMocks'
import { MomentControl } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}


vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: () => <div data-testid='preorder-steps' />
}))
vi.mock('~ui/src/components/MomentControl/layouts/CustomLayout', () => ({
  CustomLayout: () => <div data-testid='custom-layout' />
}))

vi.mock('~components/components/MomentOption', () => ({
  MomentOption: ({ UIComponent, ...rest }) => (
    <UIComponent
      isAsap
      datesList={['2026-07-14', '2026-07-15']}
      hoursList={[{ start: '10:00', end: '11:00' }]}
      dateSelected='2026-07-14'
      timeSelected='10:00'
      handleAsap={vi.fn()}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      onClose={vi.fn()}
      business={businessFixture}
      isUseWeekPicker={false}
      timeList={[{ value: '10:00', text: '10:00 AM' }]}
      isEnabled
      {...rest}
    />
  )
}))

describe('MomentControl', () => {
  it('renders preorder moment controls', () => {
    const { getByText } = renderWithProviders(<MomentControl business={businessFixture} />)
    expect(getByText(/ASAP/)).toBeInTheDocument()
    expect(getByText('Schedule for later')).toBeInTheDocument()
  })

  // implementation notesSave is the base Button of the theme in scope, full width, and closes without sending anything
  it('Save is a piece (lg, full width) that closes the picker', () => {
    const onClose = vi.fn()
    const { getByText } = renderWithProviders(<MomentControl business={businessFixture} onClose={onClose} />, { theme: themeWithValues() })
    const save = getByText('Save').closest('button')
    expect(save).toHaveAttribute('data-slot', 'button')
    expect(save).toHaveAttribute('type', 'button')
    expect(save.className).toContain('ui:w-full')
    expect(save).not.toBeDisabled()
    fireEvent.click(save)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
