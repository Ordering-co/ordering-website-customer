import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { INDICATOR_DELAY_MS } from '~ui/hooks/useDelayedFlag'
import { themeOpacity } from '~/utils/themeTokens'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { Cart } from '../index'

// implementation notes, phase 2 (option A, "in the line"): while a product of the cart changes, its line softens and shows
// a sm ring beside its price, the total shows a sm ring, and the Checkout button is inert and then busy. These tests
// mount the real cart UI with the real line (ProductItemAccordion), stepper, Button and Spinner; only the
// controllers (which hold the order's requests) and the contexts (setupTests) are replaced.

// the order's own `loading` (an address, a coupon, a tip...) is the contexts' business: the cart's state is not it
const order = vi.hoisted(() => ({ state: { options: { type: 1 }, carts: {}, loading: false } }))
vi.mock('~components/contexts/OrderContext', () => ({
  OrderContext: { Provider: ({ children }) => children },
  useOrder: () => [order.state, { refreshOrderOptions: () => {} }]
}))

vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: { id: 42 } }]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))

vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children, uuid, handleClickCheckout, checkoutButtonDisabled, checkoutInert, checkoutBusy, totalStatus }) => (
    <div data-testid='business-accordion'>
      <p data-testid='business-total'>{totalStatus}</p>
      <button data-testid='business-checkout' disabled={checkoutButtonDisabled} aria-disabled={checkoutInert ? true : undefined} aria-busy={checkoutBusy ? true : undefined} onClick={() => handleClickCheckout?.(uuid)} />
      {children}
    </div>
  )
}))
vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent productInfo={{ ingredients: [], options: [] }} isCheckout={false} isCartProduct {...rest} />
  )
}))
// The product window. The real form tells its parent the save started, closes its window (`onSave`) and, when the
// request ends, tells it again through the setter it was given, window gone or not: `form.setProductLoading` is it.
const form = vi.hoisted(() => ({ setProductLoading: null }))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children }) => (open ? <div data-testid='product-window'>{children}</div> : null)
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: ({ setProductLoading, onSave }) => {
    form.setProductLoading = setProductLoading
    return <button data-testid='save-start' onClick={() => { setProductLoading(true); onSave({ id: 1 }) }} />
  }
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: ({ open, onAccept }) => (open ? <button data-testid='confirm-accept' onClick={onAccept} /> : null)
}))
vi.mock('~ui/src/components/CouponControl', () => ({ CouponControl: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/CartStoresListing', () => ({ CartStoresListing: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/MomentContent', () => ({ MomentContent: () => null }))
vi.mock('~ui/src/components/ServiceForm', () => ({ ServiceForm: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/TaxBillRows', () => ({ TaxBillRows: () => null }))
vi.mock('~ui/src/components/FeeBillRows', () => ({ FeeBillRows: () => null }))
vi.mock('~ui/src/components/RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../CartStudentAlert', () => ({ CartStudentAlert: () => null }))

const line = (code, quantity, id) => ({
  ...productFixture,
  id,
  code,
  name: `Product ${code}`,
  quantity,
  price: 9.5,
  total: 9.5 * quantity,
  valid: true,
  valid_menu: true,
  valid_quantity: true
})
const cart = {
  ...cartFixture,
  business: businessFixture,
  valid: true,
  valid_products: true,
  valid_schedule: true,
  valid_minimum: true,
  total: 28.5,
  products: [line('LINE-A', 1, 1), line('LINE-B', 2, 2)],
  taxes: []
}

vi.mock('~components/components/Cart', () => ({
  Cart: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={cart}
      currentCartUuid='cart-1'
      isProducts
      clearCart={vi.fn()}
      changeQuantity={vi.fn()}
      getProductMax={() => 10}
      offsetDisabled={() => 10}
      removeProduct={vi.fn()}
      isCheckout={false}
      isCartPending={false}
      {...rest}
    />
  )
}))

// a request the test finishes when it wants
const deferred = () => {
  const settle = {}
  const promise = new Promise((resolve) => { settle.resolve = resolve })
  return { promise, ...settle }
}

describe('Cart: a product is updating', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    order.state.loading = false
  })
  afterEach(() => vi.useRealTimers())

  // a theme with a diameter of its own for the sm ring, so the ring is the theme's sm one
  const theme = themeWithValues((values) => { values.components.spinner.sizes.sm.diameter = 19; return values })

  const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })
  const settle = (request) => act(async () => { request.resolve() })

  const setup = (props = {}) => {
    const onClickCheckout = vi.fn()
    const view = renderWithProviders(<Cart onClickCheckout={onClickCheckout} {...props} />, { theme })
    const row = (code) => view.container.querySelector(`[data-doc-product-id="${code === 'LINE-A' ? 1 : 2}"][data-doc-section="cart-product-row"]`)
    return {
      ...view,
      onClickCheckout,
      row,
      lineRings: (code) => row(code).querySelectorAll('[data-doc-control="cart-line-spinner"]'),
      totalRings: () => view.container.querySelectorAll('[data-doc-control="cart-total-spinner"]'),
      status: () => view.container.querySelector('[data-doc-control="cart-updating-status"]'),
      checkout: () => screen.getByRole('button', { name: 'Checkout' }),
      increment: (code) => row(code).querySelector('[data-doc-control="cart-product-increment"]'),
      remove: (code) => row(code).querySelector('[data-doc-control="cart-product-delete"]'),
      edit: (code) => row(code).querySelector('[data-doc-control="cart-product-edit"]')
    }
  }

  it('at rest: no ring, no softened line, the status mounted and empty, Checkout ready', () => {
    const { lineRings, totalRings, status, checkout, row } = setup()
    expect(lineRings('LINE-A')).toHaveLength(0)
    expect(lineRings('LINE-B')).toHaveLength(0)
    expect(totalRings()).toHaveLength(0)
    expect(status()).toBeEmptyDOMElement()
    expect(status()).toHaveAttribute('role', 'status')
    expect(status()).toHaveAttribute('aria-live', 'polite')
    expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
    expect(checkout()).not.toHaveAttribute('aria-disabled')
    expect(checkout()).not.toHaveAttribute('aria-busy')
    // the old whole-cart loader is gone
    expect(screen.queryByTestId('spinner')).toBeNull()
  })

  describe('changing a quantity', () => {
    it('softens only that line and rings its price and the total, after the delay', async () => {
      const request = deferred()
      const changeQuantity = vi.fn(() => request.promise)
      const { increment, row, lineRings, totalRings, status, checkout, container } = setup({ changeQuantity })

      fireEvent.click(increment('LINE-B'))
      expect(changeQuantity).toHaveBeenCalledWith(expect.objectContaining({ code: 'LINE-B' }), 3)

      // at once: the line says it is busy to assistive technology, nothing is seen yet, the button is already inert
      expect(row('LINE-B')).toHaveAttribute('aria-busy', 'true')
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(lineRings('LINE-B')).toHaveLength(0)
      expect(totalRings()).toHaveLength(0)
      expect(row('LINE-B')).not.toHaveAttribute('data-doc-state-updating')
      expect(status()).toBeEmptyDOMElement()
      expect(checkout()).toHaveAttribute('aria-disabled', 'true')
      expect(checkout()).not.toHaveAttribute('aria-busy')

      advance(INDICATOR_DELAY_MS - 1)
      expect(lineRings('LINE-B')).toHaveLength(0)
      advance(1)

      // after the delay: that line (and only it) softened with a sm ring in its price row
      expect(row('LINE-B')).toHaveAttribute('data-doc-state-updating', 'true')
      expect(row('LINE-A')).not.toHaveAttribute('data-doc-state-updating')
      expect(lineRings('LINE-B')).toHaveLength(1)
      expect(lineRings('LINE-A')).toHaveLength(0)
      const ring = lineRings('LINE-B')[0]
      expect(ring.closest('.prod-price')).not.toBeNull()
      expect(ring).toHaveAttribute('aria-hidden', 'true')
      expect(cssFor(ring).replace(/\s+/g, '')).toMatch(/width:19px;height:19px;/)
      const softened = cssFor(row('LINE-B')).replace(/\s+/g, '')
      expect(softened).toContain(`opacity:${themeOpacity(theme, 'disabled')};`)
      // the ring is outside what softens (an opacity would multiply down to it)
      expect(softened).toContain(':not([data-line-spinner])')
      expect(cssFor(row('LINE-A'))).not.toMatch(/opacity/)

      // the total: a sm ring in the bill's total and beside the Checkout's amount
      expect(totalRings().length).toBeGreaterThanOrEqual(2)
      totalRings().forEach((totalRing) => {
        expect(totalRing).toHaveAttribute('aria-hidden', 'true')
        expect(cssFor(totalRing).replace(/\s+/g, '')).toMatch(/width:19px;height:19px;/)
      })
      expect(container.querySelector('table.total td:last-child [data-doc-control="cart-total-spinner"]')).not.toBeNull()
      // never the big one over the cart
      expect(screen.queryByTestId('spinner')).toBeNull()
      expect(status()).toHaveTextContent('Updating your cart…')

      // Checkout: busy, the label stays
      expect(checkout()).toHaveAttribute('aria-busy', 'true')
      expect(checkout()).toHaveTextContent('Checkout')
      // the header's Checkout (BusinessItemAccordion): inert and busy, with the ring by its total
      expect(screen.getByTestId('business-checkout')).not.toBeDisabled()
      expect(screen.getByTestId('business-checkout')).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByTestId('business-checkout')).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByTestId('business-total').querySelector('[data-doc-control="cart-total-spinner"]')).not.toBeNull()

      await settle(request)

      expect(row('LINE-B')).not.toHaveAttribute('aria-busy')
      expect(row('LINE-B')).not.toHaveAttribute('data-doc-state-updating')
      expect(lineRings('LINE-B')).toHaveLength(0)
      expect(totalRings()).toHaveLength(0)
      expect(status()).toBeEmptyDOMElement()
      expect(checkout()).not.toHaveAttribute('aria-disabled')
      expect(checkout()).not.toHaveAttribute('aria-busy')
      expect(screen.getByTestId('business-checkout')).not.toBeDisabled()
      expect(screen.getByTestId('business-checkout')).not.toHaveAttribute('aria-busy')
      expect(screen.getByTestId('business-total')).toBeEmptyDOMElement()
      expect(cssFor(row('LINE-B'))).not.toMatch(/opacity/)
    })

    it('an update that answers before the delay flashes nothing, but still holds Checkout meanwhile', async () => {
      const request = deferred()
      const { increment, row, lineRings, totalRings, checkout, status, onClickCheckout } = setup({ changeQuantity: () => request.promise })
      fireEvent.click(increment('LINE-A'))
      advance(INDICATOR_DELAY_MS - 50)
      expect(checkout()).toHaveAttribute('aria-disabled', 'true')
      // a click on it goes nowhere
      fireEvent.click(checkout())
      expect(onClickCheckout).not.toHaveBeenCalled()
      await settle(request)
      advance(INDICATOR_DELAY_MS * 3)
      expect(lineRings('LINE-A')).toHaveLength(0)
      expect(totalRings()).toHaveLength(0)
      expect(row('LINE-A')).not.toHaveAttribute('data-doc-state-updating')
      expect(status()).toBeEmptyDOMElement()
      expect(checkout()).not.toHaveAttribute('aria-busy')
      expect(checkout()).not.toHaveAttribute('aria-disabled')
      fireEvent.click(checkout())
      expect(onClickCheckout).toHaveBeenCalledTimes(1)
    })

    it('Checkout does nothing while it updates, from either button, and works again after', async () => {
      const request = deferred()
      const { increment, checkout, onClickCheckout } = setup({ changeQuantity: () => request.promise })
      fireEvent.click(increment('LINE-A'))
      advance(INDICATOR_DELAY_MS)
      fireEvent.click(checkout())
      fireEvent.click(screen.getByTestId('business-checkout'))
      expect(onClickCheckout).not.toHaveBeenCalled()
      await settle(request)
      fireEvent.click(screen.getByTestId('business-checkout'))
      expect(onClickCheckout).toHaveBeenCalledTimes(1)
    })

    it('two quick taps on one line keep it marked until the last one ends', async () => {
      const first = deferred()
      const second = deferred()
      const changeQuantity = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const { increment, row, lineRings } = setup({ changeQuantity })
      fireEvent.click(increment('LINE-A'))
      fireEvent.click(increment('LINE-A'))
      advance(INDICATOR_DELAY_MS)
      await settle(first)
      expect(row('LINE-A')).toHaveAttribute('aria-busy', 'true')
      expect(lineRings('LINE-A')).toHaveLength(1)
      await settle(second)
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(lineRings('LINE-A')).toHaveLength(0)
    })
  })

  describe('removing a product', () => {
    it('softens the line being removed from the click on Accept until the removal ends', async () => {
      const request = deferred()
      const removeProduct = vi.fn(() => request.promise)
      const { remove, row, lineRings, totalRings, checkout } = setup({ removeProduct })

      // the quantity is 1: its − is the trash; it asks first and the line is not touched yet
      fireEvent.click(remove('LINE-A'))
      expect(removeProduct).not.toHaveBeenCalled()
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(checkout()).not.toHaveAttribute('aria-disabled')

      fireEvent.click(screen.getByTestId('confirm-accept'))
      expect(removeProduct).toHaveBeenCalledWith(expect.objectContaining({ code: 'LINE-A' }), cart)
      expect(row('LINE-A')).toHaveAttribute('aria-busy', 'true')
      expect(row('LINE-B')).not.toHaveAttribute('aria-busy')
      advance(INDICATOR_DELAY_MS)
      expect(row('LINE-A')).toHaveAttribute('data-doc-state-updating', 'true')
      expect(lineRings('LINE-A')).toHaveLength(1)
      expect(lineRings('LINE-B')).toHaveLength(0)
      expect(totalRings().length).toBeGreaterThanOrEqual(2)
      expect(checkout()).toHaveAttribute('aria-busy', 'true')

      await settle(request)
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(lineRings('LINE-A')).toHaveLength(0)
      expect(totalRings()).toHaveLength(0)
    })
  })

  describe('editing a product in its window', () => {
    it('softens the line that was opened while the window saves it, and Checkout waits', () => {
      const setProductLoading = vi.fn()
      const { edit, row, lineRings, totalRings, checkout } = setup({ setProductLoading })

      fireEvent.click(edit('LINE-B'))
      expect(screen.getByTestId('product-window')).toBeInTheDocument()
      expect(row('LINE-B')).not.toHaveAttribute('aria-busy')

      // the form tells its parent the save started (and closes its window)
      fireEvent.click(screen.getByTestId('save-start'))
      expect(setProductLoading).toHaveBeenLastCalledWith(true)
      expect(row('LINE-B')).toHaveAttribute('aria-busy', 'true')
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(checkout()).toHaveAttribute('aria-disabled', 'true')
      advance(INDICATOR_DELAY_MS)
      expect(row('LINE-B')).toHaveAttribute('data-doc-state-updating', 'true')
      expect(lineRings('LINE-B')).toHaveLength(1)
      expect(lineRings('LINE-A')).toHaveLength(0)
      expect(totalRings().length).toBeGreaterThanOrEqual(2)
      expect(checkout()).toHaveAttribute('aria-busy', 'true')

      // the window closed itself on save; the end of the request comes through the setter the form still holds
      expect(screen.queryByTestId('product-window')).toBeNull()
      act(() => form.setProductLoading(false))
      expect(setProductLoading).toHaveBeenLastCalledWith(false)
      expect(row('LINE-B')).not.toHaveAttribute('aria-busy')
      expect(row('LINE-B')).not.toHaveAttribute('data-doc-state-updating')
      expect(lineRings('LINE-B')).toHaveLength(0)
      expect(totalRings()).toHaveLength(0)
      expect(checkout()).not.toHaveAttribute('aria-disabled')
      expect(checkout()).not.toHaveAttribute('aria-busy')
    })
  })

  describe('adding a product with no line before (the menu\'s window or quick add)', () => {
    it('rings only the total, and holds Checkout', () => {
      const { rerender, lineRings, row, totalRings, checkout, status, onClickCheckout } = setup()
      rerender(<Cart onClickCheckout={onClickCheckout} productLoading />)
      expect(checkout()).toHaveAttribute('aria-disabled', 'true')
      expect(totalRings()).toHaveLength(0)
      advance(INDICATOR_DELAY_MS)
      expect(totalRings().length).toBeGreaterThanOrEqual(2)
      expect(lineRings('LINE-A')).toHaveLength(0)
      expect(lineRings('LINE-B')).toHaveLength(0)
      expect(row('LINE-A')).not.toHaveAttribute('aria-busy')
      expect(row('LINE-B')).not.toHaveAttribute('data-doc-state-updating')
      expect(status()).toHaveTextContent('Updating your cart…')
      expect(checkout()).toHaveAttribute('aria-busy', 'true')
      rerender(<Cart onClickCheckout={onClickCheckout} productLoading={false} />)
      expect(totalRings()).toHaveLength(0)
      expect(checkout()).not.toHaveAttribute('aria-busy')
      expect(checkout()).not.toHaveAttribute('aria-disabled')
    })
  })

  it('the order\'s own loading (an address, a coupon) is not the cart updating a product', () => {
    order.state.loading = true
    const { lineRings, totalRings, checkout, status } = setup()
    advance(INDICATOR_DELAY_MS * 3)
    expect(lineRings('LINE-A')).toHaveLength(0)
    expect(totalRings()).toHaveLength(0)
    expect(status()).toBeEmptyDOMElement()
    expect(checkout()).not.toHaveAttribute('aria-busy')
    expect(checkout()).not.toHaveAttribute('aria-disabled')
  })
})
