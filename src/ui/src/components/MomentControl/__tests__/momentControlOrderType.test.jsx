import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/cartTestMocks'
import { MomentControl } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const order = vi.hoisted(() => ({ type: 1 }))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: order.type, moment: null }, carts: {}, loading: false }, { changeMoment: vi.fn() }]
}))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: () => <div data-testid='preorder-steps' />
}))
vi.mock('~components/components/MomentOption', () => ({
  MomentOption: ({ UIComponent, ...rest }) => (
    <UIComponent
      isAsap
      datesList={['2026-07-14']}
      hoursList={[]}
      dateSelected='2026-07-14'
      timeSelected='10:00'
      handleAsap={vi.fn()}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      onClose={vi.fn()}
      business={businessFixture}
      isUseWeekPicker={false}
      {...rest}
    />
  )
}))

// implementation notesthe time label follows the order type
describe('MomentControl labels by order type', () => {
  it.each([
    [1, 'Delivery time', 'Pickup time'],
    [2, 'Pickup time', 'Delivery time'],
    [8, 'Pickup time', 'Delivery time']
  ])('type %i: title, group name and ASAP option say "%s"', (type, expected, other) => {
    order.type = type
    const { getByRole, getByText, queryByText } = renderWithProviders(<MomentControl business={businessFixture} />)
    expect(getByText(expected, { selector: 'h1,h2,h3,h4,h5,h6,div,p,span' })).toBeInTheDocument()
    expect(getByRole('radiogroup', { name: expected })).toBeInTheDocument()
    expect(getByText(new RegExp(`^ASAP \\(.* \\+ ${expected}\\)$`))).toBeInTheDocument()
    expect(queryByText(other)).not.toBeInTheDocument()
    expect(queryByText(new RegExp(other))).not.toBeInTheDocument()
  })
})
