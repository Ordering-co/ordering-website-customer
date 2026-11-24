import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Checkout } from '../index'

// The checkout's sections: its headings in order (h1 → h2) and the accordions
// (Summary, Payment method) opened by a real button inside their heading
// the img swaps to a same-size placeholder that keeps the business name as its label.
const mocks = vi.hoisted(() => {
  const noop = () => {}
  return {
    businessDetails: null,
    orderState: { loading: false, options: { type: 2 }, carts: {} },
    orderActions: { confirmCart: noop },
    sessionState: { user: { id: 1, name: 'Customer' }, loading: false, auth: true, token: 'tok' },
    sessionActions: { login: noop },
    configState: { configs: {} },
    customerState: { user: null },
    events: { on: noop, off: noop, emit: noop },
    validationFields: { fields: {} },
    controllerProps: {
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 },
      handlePaymethodChange: noop,
      handlerClickPlaceOrder: noop,
      handleOrderRedirect: noop,
      placing: false,
      checkoutFieldsState: { loading: false, fields: [] },
      loyaltyPlansState: { result: [] },
      instructionsOptions: { result: [] },
      deliveryOptionSelected: undefined,
      cardList: { cards: [] }
    }
  }
})

const cart = {
  uuid: 'cart-1',
  status: 0,
  valid: true,
  valid_products: true,
  valid_maximum: true,
  valid_minimum: true,
  business_id: 1,
  business: { id: 1, name: 'Demo Store', slug: 'demo-store', logo: 'https://example.test/broken-logo.png' },
  products: [{ id: 10, name: 'Burger', code: 'BRG-1', price: 9.5 }],
  total: 9.5,
  subtotal: 9.5,
  balance: 9.5
}

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => null }))
vi.mock('~ui/src/components/CartContent', () => ({ CartContent: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null, Confirm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressDetails', () => ({ AddressDetails: () => null }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => null }))
vi.mock('~ui/src/components/PaymentOptions', () => ({ PaymentOptions: () => null }))
vi.mock('~ui/src/components/PaymentOptionWallet', () => ({ PaymentOptionWallet: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/PlaceSpot', () => ({ PlaceSpot: () => null }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: () => null }))
vi.mock('../OrderDetail', () => ({ OrderDetail: () => null }))
vi.mock('../../RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../../CheckoutStudentDetails', () => ({ CheckoutStudentDetails: () => null }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [mocks.orderState, mocks.orderActions]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.sessionState, mocks.sessionActions]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [mocks.configState]
}))
vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [mocks.customerState]
}))
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [mocks.events]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [mocks.validationFields]
}))
vi.mock('~components/components/Checkout', () => ({
  Checkout: ({ UIComponent, cartState, uuid, ...rest }) => (
    <UIComponent
      cart={cartState?.cart}
      cartState={cartState}
      businessDetails={mocks.businessDetails}
      {...mocks.controllerProps}
      {...rest}
    />
  )
}))

const noop = () => {}

const renderCheckout = () => {
  mocks.orderState = { loading: false, options: { type: 2 }, carts: { 'businessId:1': cart } }
  mocks.businessDetails = { business: cart.business, loading: false, error: null }
  return renderWithProviders(
    <Checkout cartUuid={cart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />
  )
}

describe('Checkout sections', () => {
  beforeEach(() => {
    window.scrollTo = noop
    window.localStorage.removeItem('user-customer')
  })

  it('titles its sections h2 under the page h1, never skipping a level', async () => {
    const { findByRole, getAllByRole } = renderCheckout()
    await findByRole('heading', { level: 1, name: 'Checkout' })
    expect(getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(
      // round 5: the steps' titles; the business is the context card's
      // line and the summary's store row, no longer a heading of its own
      expect.arrayContaining(['Your details', 'Payment'])
    )
    expect(getAllByRole('heading').filter(h => Number(h.tagName[1]) > 2)).toHaveLength(0)
  })

  // round 5 (mockup B): the product lines sit straight in the summary
  // card, under its store row — no "Summary" accordion to open or close
  it('the summary card is a named region with the product lines in it, no Summary toggle', async () => {
    const { findByRole, queryByRole, container } = renderCheckout()
    const summary = await findByRole('region', { name: 'Summary' })
    expect(summary.querySelector('[data-doc-section="checkout-order-summary"]')).not.toBeNull()
    expect(queryByRole('button', { name: 'Summary' })).toBeNull()
    expect(container.querySelector('#checkout-summary-content')).toBeNull()
  })

  it('payment: "Change" is a button beside the toggle (not inside), and the chosen method does not toggle', async () => {
    const { findByRole, getByRole, container } = renderCheckout()
    const toggle = await findByRole('button', { name: /^Payment$/ })
    const change = getByRole('button', { name: 'Change' })
    expect(toggle.contains(change)).toBe(false)
    expect(change).toHaveAttribute('aria-controls', toggle.getAttribute('aria-controls'))
    const before = toggle.getAttribute('aria-expanded')
    fireEvent.click(container.querySelector('.content'))
    expect(toggle).toHaveAttribute('aria-expanded', before)
    fireEvent.click(change)
    expect(toggle.getAttribute('aria-expanded')).not.toBe(before)
  })
})
