import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptionSquare } from '../index'

// The real controller (the submodule) with a fake Square SDK: the click Square binds is native, so
// only the button's own state can stop a second Enter or Space while the first one is paying.
const placeCart = vi.fn()
vi.mock('~components/contexts/LanguageContext', () => ({ useLanguage: () => [{}, (_key, fallback) => fallback] }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ user: { name: 'Ada' } }] }))
vi.mock('~components/contexts/OrderContext', async () => {
  // as the real module: the context's value when there is one (PaymentOptionSquare gives the controller its own), else the fixture
  const { createContext, useContext } = await import('react')
  const OrderContext = createContext()
  return { OrderContext, useOrder: () => useContext(OrderContext) || [{}, { confirmCart: vi.fn(), placeCart }] }
})
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null }))

afterEach(() => {
  delete window.Square
  document.querySelectorAll('script[src*=squarecdn]').forEach((script) => script.remove())
  vi.clearAllMocks()
})

// A browser sends no click to a disabled button, with the pointer or with Enter or Space; jsdom's
// dispatchEvent does, so the activation is made the way the browser makes it.
const activate = (button) => { if (!button.disabled) fireEvent.click(button) }

const METHODS = {
  card_payments: ['Card payments', 'card-button', 'card'],
  gift_cards: ['Gift Cards', 'gift-card-button', 'giftCard']
}

describe.each(Object.values(METHODS))('PaymentOptionSquare (%s): a second activation while paying', (tab, buttonId, sdkMethod) => {
  it('tokenizes and places the cart once, and the button answers no click while it pays', async () => {
    let finish
    const tokenize = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    window.Square = { payments: () => ({ [sdkMethod]: async () => ({ attach: async () => {}, tokenize }) }) }
    placeCart.mockResolvedValue({ error: false, result: { id: 7 } })
    const onPlaceOrderClick = vi.fn()
    const view = renderWithProviders(
      <PaymentOptionSquare body={{ paymethod_id: 1, amount: 10, cartUuid: 'cart' }} data={{}} onPlaceOrderClick={onPlaceOrderClick} />
    )
    act(() => document.querySelector('script[src*=squarecdn]').onload())
    fireEvent.click(await view.findByRole('tab', { name: tab }))
    await waitFor(() => expect(document.getElementById(buttonId)).not.toBeDisabled())
    const button = document.getElementById(buttonId)

    activate(button)
    await waitFor(() => expect(button).toBeDisabled())
    activate(button)
    activate(button)

    expect(tokenize).toHaveBeenCalledTimes(1)
    await act(async () => finish({ status: 'OK', token: 'tok' }))
    expect(placeCart).toHaveBeenCalledTimes(1)
    expect(onPlaceOrderClick).toHaveBeenCalledTimes(1)
  })
})
