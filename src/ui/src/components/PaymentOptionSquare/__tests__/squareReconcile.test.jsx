import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react'
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

describe('Square card: an attempt that follows another is reconciled first (N2)', () => {
  const card = () => ({ card: async () => ({ attach: async () => {}, tokenize: vi.fn().mockResolvedValue({ status: 'OK', token: 'fake-card' }) }) })

  it('a cart that is not safe stops the attempt before the token and says why; a safe one goes on', async () => {
    placeCart.mockResolvedValue({ error: true, result: ['Internal error'] })
    const answers = ['safe', 'pending', 'unconfirmed', 'safe']
    const reconcileOrder = vi.fn(async () => answers.shift())
    const view = await openSquare(card(), 'Card payments', { reconcileOrder })
    const button = document.getElementById('card-button')
    await waitFor(() => expect(button).not.toBeDisabled())

    await act(async () => activate(button))
    expect(placeCart).toHaveBeenCalledTimes(1)

    await act(async () => activate(button))
    expect(view.getByRole('status')).toHaveTextContent(/still confirming your payment/)
    await act(async () => activate(button))
    expect(view.getByRole('status')).toHaveTextContent(/couldn.t confirm your order/)
    expect(placeCart).toHaveBeenCalledTimes(1)
    expect(button).not.toBeDisabled()

    await act(async () => activate(button))
    expect(placeCart).toHaveBeenCalledTimes(2)
    expect(view.queryByRole('status')).toBeNull()
  })

  it('onPlaceSent hears each cart the controller sends, with the controller\'s own placeCart, and not a token that failed', async () => {
    placeCart.mockResolvedValue({ error: true, result: ['Internal error'] })
    const onPlaceSent = vi.fn()
    const tokenize = vi.fn().mockRejectedValueOnce(new Error('Card input invalid')).mockResolvedValue({ status: 'OK', token: 'fake-card' })
    await openSquare({ card: async () => ({ attach: async () => {}, tokenize }) }, 'Card payments', { onPlaceSent })
    const button = document.getElementById('card-button')
    await waitFor(() => expect(button).not.toBeDisabled())

    await act(async () => activate(button))
    expect(onPlaceSent).not.toHaveBeenCalled()
    expect(placeCart).not.toHaveBeenCalled()

    await act(async () => activate(button))
    expect(onPlaceSent).toHaveBeenCalledTimes(1)
    expect(placeCart).toHaveBeenCalledTimes(1)
    expect(placeCart).toHaveBeenCalledWith('cart', expect.objectContaining({ paymethod_data: { token: 'fake-card' } }))
    // the order is told before the request goes out
    expect(onPlaceSent.mock.invocationCallOrder[0]).toBeLessThan(placeCart.mock.invocationCallOrder[0])
  })

  it('without a reconcile function every attempt goes out as before', async () => {
    placeCart.mockResolvedValue({ error: true, result: ['Internal error'] })
    await openSquare(card(), 'Card payments')
    const button = document.getElementById('card-button')
    await waitFor(() => expect(button).not.toBeDisabled())
    await act(async () => activate(button))
    await act(async () => activate(button))
    expect(placeCart).toHaveBeenCalledTimes(2)
  })
})
