import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptionSquare } from '../index'

// implementation notesthe real controller (the submodule) with a fake Square SDK. The click Square
// binds is native, so only the button's own state and the controller's lock can stop a second activation.
const placeCart = vi.fn()
const confirmCart = vi.fn()
vi.mock('~components/contexts/LanguageContext', () => ({ useLanguage: () => [{}, (_key, fallback) => fallback] }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ user: { name: 'Ada' } }] }))
vi.mock('~components/contexts/OrderContext', async () => {
  // as the real module: the context's value when there is one (PaymentOptionSquare gives the controller its own), else the fixture
  const { createContext, useContext } = await import('react')
  const OrderContext = createContext()
  return { OrderContext, useOrder: () => useContext(OrderContext) || [{}, { confirmCart, placeCart }] }
})
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, onClose }) => open ? <button type='button' onClick={onClose}>Close simulated alert</button> : null
}))

afterEach(() => {
  delete window.Square
  document.querySelectorAll('script[src*=squarecdn]').forEach((script) => script.remove())
  placeCart.mockReset()
  confirmCart.mockReset()
})

// A browser sends no click to a disabled button, with the pointer or with Enter or Space; jsdom's
// dispatchEvent does, so the activation is made the way the browser makes it. `detail: 0` is the
// click a keyboard activation produces.
const activate = (button, { keyboard = false } = {}) => { if (!button.disabled) fireEvent.click(button, keyboard ? { detail: 0 } : {}) }

const openSquare = async (payments, tab, props = {}) => {
  window.Square = { payments: () => payments }
  const view = renderWithProviders(
    <PaymentOptionSquare body={{ paymethod_id: 1, amount: 10, cartUuid: 'cart' }} data={{}} onPlaceOrderClick={vi.fn()} {...props} />
  )
  act(() => document.querySelector('script[src*=squarecdn]').onload())
  fireEvent.click(await view.findByRole('tab', { name: tab }))
  return view
}

describe('Square ACH: the second activation while the token is pending (N1)', () => {
  it('tokenizes once and places once, with the pointer or the keyboard, and the loading starts at the first activation', async () => {
    const resolvers = []
    const tokenize = vi.fn(() => new Promise(resolve => resolvers.push(resolve)))
    placeCart.mockResolvedValue({ error: true, result: ['simulated rejection'] })
    const setCreateOrder = vi.fn()
    await openSquare({ ach: async () => ({ tokenize }) }, 'ACH Back transfer', { setCreateOrder })
    const button = document.getElementById('ach-button')
    await waitFor(() => expect(button).not.toBeDisabled())

    activate(button)
    await waitFor(() => expect(button).toBeDisabled())
    expect(setCreateOrder.mock.calls).toEqual([[true]])
    // before the button re-renders, a native activation can still reach the handler: the lock answers it
    button.disabled = false
    activate(button, { keyboard: true })
    activate(button)
    expect(tokenize).toHaveBeenCalledTimes(1)

    await act(async () => resolvers[0]({ status: 'OK', token: 'fake-ach' }))
    expect(placeCart).toHaveBeenCalledTimes(1)
    expect(placeCart.mock.calls[0][1].paymethod_data).toEqual({ token: 'fake-ach' })
  })
})

describe('Square ACH: confirmCart fails after placeCart (N5)', () => {
  const failConfirm = async (props = {}) => {
    const tokenize = vi.fn().mockResolvedValue({ status: 'OK', token: 'fake-ach' })
    placeCart.mockResolvedValue({ error: false, result: { status: 2 } })
    confirmCart.mockResolvedValueOnce({ error: true, result: ['simulated confirm rejection'] })
    const setCreateOrder = vi.fn()
    const onPlaceOrderClick = vi.fn()
    const view = await openSquare({ ach: async () => ({ tokenize }) }, 'ACH Back transfer', { setCreateOrder, onPlaceOrderClick, ...props })
    const button = document.getElementById('ach-button')
    await waitFor(() => expect(button).not.toBeDisabled())
    await act(async () => activate(button))
    fireEvent.click(await screen.findByRole('button', { name: 'Close simulated alert' }))
    return { view, button, tokenize, setCreateOrder, onPlaceOrderClick }
  }

  it('the indicator goes away, the status can be asked for, and another click does not place the cart', async () => {
    const { view, button, tokenize, setCreateOrder, onPlaceOrderClick } = await failConfirm()
    expect(setCreateOrder.mock.calls).toEqual([[true], [false]])
    expect(view.container.querySelector('[class*="Spinner"]')).toBeNull()
    expect(view.getByRole('status')).toHaveTextContent(/still confirming your payment/)
    expect(button).toBeDisabled()

    activate(button)
    expect(tokenize).toHaveBeenCalledTimes(1)
    expect(placeCart).toHaveBeenCalledTimes(1)

    confirmCart.mockResolvedValueOnce({ error: false, result: { uuid: 'order-1' } })
    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Try again' })))
    expect(confirmCart).toHaveBeenCalledTimes(2)
    expect(placeCart).toHaveBeenCalledTimes(1)
    expect(onPlaceOrderClick).toHaveBeenCalledWith(null, null, { uuid: 'order-1' })
  })
})
