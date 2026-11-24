import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/cartTestMocks'
import { MomentControl } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const handleAsap = vi.hoisted(() => vi.fn())

// an order already scheduled and being updated
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, moment: '2026-07-14 10:00:00' }, carts: {}, loading: true }, { changeMoment: vi.fn() }]
}))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: () => <div data-testid='preorder-steps' />
}))
vi.mock('~components/components/MomentOption', () => ({
  MomentOption: ({ UIComponent, ...rest }) => (
    <UIComponent
      datesList={['2026-07-14']}
      hoursList={[]}
      dateSelected='2026-07-14'
      timeSelected='10:00'
      handleAsap={handleAsap}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      onClose={vi.fn()}
      business={businessFixture}
      isUseWeekPicker={false}
      {...rest}
    />
  )
}))

describe('MomentControl while the order loads (implementation notes M1)', () => {
  it('ASAP cannot be chosen: it keeps the scheduled time and the date picker, and writes nothing', () => {
    const { getAllByRole, getByTestId } = renderWithProviders(<MomentControl business={businessFixture} />)
    const [asap, later] = getAllByRole('radio')
    expect(later).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(asap)
    expect(asap).toHaveAttribute('aria-checked', 'false')
    expect(later).toHaveAttribute('aria-checked', 'true')
    expect(getByTestId('preorder-steps')).toBeInTheDocument()
    expect(handleAsap).not.toHaveBeenCalled()
    // disabled, so the arrows skip it and Space cannot reach it
    expect(asap).toHaveAttribute('aria-disabled', 'true')
  })
})
