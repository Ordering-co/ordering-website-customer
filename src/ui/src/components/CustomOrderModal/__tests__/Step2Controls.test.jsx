import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Step2 } from '../Step2'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parsePrice: (value) => `$${value}` }]
}))

const renderStep = (props = {}) => renderWithProviders(
  <Step2 distanceKm={3} pluginConfig={{}} actionState={{ loading: false, error: null }} onPlaceOrder={vi.fn()} onBack={vi.fn()} {...props} />,
  { theme: themeWithValues() }
)

describe('CustomOrderModal Step2 controls', () => {
  it('quantity: named icon buttons that raise, lower and, at 1, remove the line', () => {
    const { getByRole, getByText, queryAllByPlaceholderText } = renderStep({
      initialData: { items: [{ name: 'Milk', quantity: 1 }], paymethod: 'cash', instructions: '', declaredValue: '30' }
    })
    const increase = getByRole('button', { name: 'Increase quantity' })
    const decrease = getByRole('button', { name: 'Decrease quantity' })
    for (const button of [increase, decrease]) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('data-slot', 'button')
    }
    expect(increase).toHaveAttribute('data-doc-control', 'custom-order-quantity-increase')
    expect(decrease).toHaveAttribute('data-doc-control', 'custom-order-quantity-decrease')
    fireEvent.click(increase)
    expect(getByText('2', { selector: '.qty-value' })).toBeInTheDocument()
    fireEvent.click(decrease)
    expect(getByText('1', { selector: '.qty-value' })).toBeInTheDocument()
    fireEvent.click(decrease)
    expect(queryAllByPlaceholderText('Describe the product')).toHaveLength(0)
  })

  it('the name and the quantity share one base Input: the field is named and the stepper is its suffix', () => {
    const { getByRole, container } = renderStep({
      initialData: { items: [{ name: 'Milk', quantity: 1 }], paymethod: 'cash', instructions: '', declaredValue: '30' }
    })
    const name = getByRole('textbox', { name: 'Describe the product' })
    expect(name).toHaveAttribute('data-slot', 'input')
    expect(name).toHaveValue('Milk')
    const group = name.closest('[data-slot="input-group"]')
    const suffix = group.querySelector('[data-slot="input-suffix"]')
    expect(suffix).toContainElement(getByRole('button', { name: 'Increase quantity' }))
    expect(suffix).toContainElement(getByRole('button', { name: 'Decrease quantity' }))
    expect(name.getAttribute('class')).toContain('ui:pe-[calc(var(--ui-input-suffix-width')
    expect(container.querySelector('input.item-name-input')).toBeNull()
    fireEvent.change(name, { target: { value: 'Oat milk' } })
    expect(name).toHaveValue('Oat milk')
  })

  it('submits quantity, instructions and declared value from the order controls', () => {
    const onPlaceOrder = vi.fn()
    const { getByRole, getAllByPlaceholderText } = renderStep({
      initialData: { items: [{ name: 'Milk', quantity: 1 }], paymethod: 'cash', instructions: '', declaredValue: '30' },
      onPlaceOrder
    })
    fireEvent.click(getByRole('button', { name: 'Increase quantity' }))

    const instructions = getByRole('textbox', { name: 'Additional instructions' })
    const declaredValue = getByRole('spinbutton', { name: 'Select declared value' })
    expect(instructions).toHaveAttribute('data-slot', 'textarea')
    expect(declaredValue).toHaveAttribute('data-slot', 'input')
    fireEvent.change(instructions, { target: { value: 'Keep chilled' } })
    fireEvent.change(declaredValue, { target: { value: '42.50' } })

    const addItem = getByRole('button', { name: 'Add another product' })
    expect(addItem).toHaveAttribute('data-slot', 'button')
    fireEvent.click(addItem)
    expect(getAllByPlaceholderText('Describe the product')).toHaveLength(2)

    fireEvent.click(getByRole('button', { name: 'Place order' }))
    expect(onPlaceOrder).toHaveBeenCalledTimes(1)
    expect(onPlaceOrder).toHaveBeenCalledWith({
      items: [{ name: 'Milk', quantity: 2 }],
      paymethod: 'cash',
      instructions: 'Keep chilled',
      declaredValue: '42.50'
    })
  })

  it('payment method: a segmented radio group of the theme that submits the chosen value', () => {
    const onPlaceOrder = vi.fn()
    const { getByRole } = renderStep({
      initialData: { items: [{ name: 'Milk', quantity: 1 }], paymethod: 'cash', instructions: '', declaredValue: '30' },
      onPlaceOrder
    })
    const group = getByRole('radiogroup', { name: 'Payment method' })
    const cash = getByRole('radio', { name: 'Cash' })
    const card = getByRole('radio', { name: 'Card on delivery' })
    expect(group).toHaveAttribute('data-slot', 'radio-group')
    expect(cash).toHaveAttribute('aria-checked', 'true')
    expect(card).toHaveAttribute('data-doc-control', 'custom-order-paymethod-card-delivery')
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(getByRole('button', { name: 'Place order' }))
    expect(onPlaceOrder).toHaveBeenCalledWith(expect.objectContaining({ paymethod: 'card_delivery' }))
  })
})
