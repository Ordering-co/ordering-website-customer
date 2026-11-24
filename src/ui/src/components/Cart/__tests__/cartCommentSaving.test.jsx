import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { INDICATOR_DELAY_MS } from '~ui/hooks/useDelayedFlag'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { Cart } from '../index'

vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: { id: 42 } }]
}))

vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))

vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children, uuid, handleClickCheckout, checkoutButtonDisabled }) => (
    <div data-testid='business-accordion'>
      <button data-testid='business-checkout' disabled={checkoutButtonDisabled} onClick={() => handleClickCheckout?.(uuid)} />
      {children}
    </div>
  )
}))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ product }) => <div>{product?.name}</div>
}))
vi.mock('~ui/src/components/CouponControl', () => ({ CouponControl: () => null }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))
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

const cart = {
  ...cartFixture,
  business: businessFixture,
  valid_products: true,
  valid_schedule: true,
  valid_maximum: true,
  valid_minimum: true,
  valid_address: true,
  total: 9.5,
  products: [{ ...productFixture, code: 'BRG-1' }],
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
      getProductMax={vi.fn()}
      offsetDisabled={false}
      removeProduct={vi.fn()}
      onClickCheckout={vi.fn()}
      isCheckout={false}
      isCartPending={false}
      showDiscountInCart
      {...rest}
    />
  )
}))

describe('Cart comment, saving indicator', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })
  const notSaving = { loading: false, result: null, error: null }
  const saving = { loading: true, result: null, error: null }
  // a diameter of its own, so the ring is the theme's sm one
  const theme = themeWithValues((values) => { values.components.spinner.sizes.sm.diameter = 19; return values })

  const setup = (commentState = notSaving) => {
    const view = renderWithProviders(<Cart cart={cart} commentState={commentState} />, { theme })
    const comments = () => view.container.querySelector('table.comments')
    return {
      ...view,
      comments,
      rerenderWith: (next) => view.rerender(<Cart cart={cart} commentState={next} />),
      status: () => within(comments()).getByRole('status'),
      ring: () => comments().querySelector('span[aria-hidden="true"]')
    }
  }

  it('shows nothing while it is not saving, with the status region already mounted and empty', () => {
    const { status, ring } = setup()
    expect(ring()).toBeNull()
    expect(status()).toBeEmptyDOMElement()
    advance(INDICATOR_DELAY_MS * 3)
    expect(ring()).toBeNull()
  })

  it('a save that takes less than the delay shows nothing', () => {
    const { rerenderWith, status, ring } = setup()
    rerenderWith(saving)
    advance(INDICATOR_DELAY_MS - 1)
    expect(ring()).toBeNull()
    expect(status()).toBeEmptyDOMElement()
    rerenderWith(notSaving)
    advance(INDICATOR_DELAY_MS * 3)
    expect(ring()).toBeNull()
    expect(status()).toBeEmptyDOMElement()
  })

  it('after the delay it shows the sm ring of the theme and the status says Saving…', () => {
    const { rerenderWith, status, ring } = setup()
    rerenderWith(saving)
    advance(INDICATOR_DELAY_MS)
    expect(ring()).toBeInTheDocument()
    expect(cssFor(ring()).replace(/\s+/g, '')).toMatch(/width:19px;height:19px;/)
    expect(status()).toHaveTextContent('Saving…')
    expect(status()).toHaveAttribute('aria-live', 'polite')
    // the old whole-screen loader is gone
    expect(screen.queryByTestId('spinner')).toBeNull()
  })

  it('it goes away when the save ends, and the status empties', () => {
    const { rerenderWith, status, ring } = setup()
    rerenderWith(saving)
    advance(INDICATOR_DELAY_MS)
    rerenderWith(notSaving)
    expect(ring()).toBeNull()
    expect(status()).toBeEmptyDOMElement()
  })

  it('a save chained by the next key does not restart the wait nor blink', () => {
    const { rerenderWith, ring } = setup()
    rerenderWith(saving)
    advance(INDICATOR_DELAY_MS - 100)
    // the controller sets loading again with a new object: still one run
    rerenderWith({ ...saving })
    advance(100)
    expect(ring()).toBeInTheDocument()
    rerenderWith({ ...saving })
    expect(ring()).toBeInTheDocument()
  })

  it('stays out of the text: it sits on the label row, not in the field, which stays editable', () => {
    const { rerenderWith, ring, comments } = setup()
    rerenderWith(saving)
    advance(INDICATOR_DELAY_MS)
    const field = screen.getByRole('textbox', { name: 'Comments' })
    expect(field.parentElement.contains(ring())).toBe(false)
    expect(comments().querySelector('td').contains(ring())).toBe(true)
    expect(field).not.toBeDisabled()
    expect(field).not.toHaveAttribute('readonly')
  })
})
