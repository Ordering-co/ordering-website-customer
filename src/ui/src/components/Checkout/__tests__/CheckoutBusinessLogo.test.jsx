import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Checkout } from '../index'

// The business logo (the summary card's store row) keeps its box when the
// image fails to load: the img swaps to a same-size placeholder that keeps the
// business name as its label.
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
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content }) => {
    mocks.notFoundContent = content
    return null
  }
}))
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

const renderCheckout = (theme, business = cart.business, type = 2, { error = null, useKioskApp = false } = {}) => {
  mocks.orderState = { loading: false, options: { type }, carts: { 'businessId:1': cart } }
  mocks.businessDetails = { business: error ? null : business, loading: false, error }
  return renderWithProviders(
    <Checkout cartUuid={cart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} useKioskApp={useKioskApp} />,
    theme ? { theme } : {}
  )
}

describe('Checkout business logo', () => {
  beforeEach(() => {
    window.scrollTo = noop
    window.localStorage.removeItem('user-customer')
  })

  // implementation notes round 5 (mockup B): the logo shows once, small, in the
  // summary card's store row; the context card says "Pickup at {business} ·
  // {moment}" with the address, phone and notes, no logo
  it('swaps a failed logo for a same-size placeholder labelled with the business name', async () => {
    const { findByAltText, getByRole, container } = renderCheckout()
    const img = await findByAltText('Demo Store')
    expect(img.parentElement).toHaveClass('business-logo')
    expect(container.querySelector('[data-doc-section="checkout-context"] img')).toBeNull()

    fireEvent.error(img)

    expect(container.querySelector('.business-logo img')).toBeNull()
    const placeholder = getByRole('img', { name: 'Demo Store' })
    expect(placeholder).toHaveClass('business-logo-placeholder')
    // no alt text rendered as visible text inside its box
    expect(placeholder.parentElement).toHaveTextContent('')
  })

  it('keeps the compact logo box fixed (business_logo_size capped at 40px, business_logo_radius) and shows the whole logo', async () => {
    const themed = renderCheckout(themeWithValues())
    const img = await themed.findByAltText('Demo Store')
    const rowCss = cssFor(img.closest('.business-logo').parentElement)
    expect(rowCss).toMatch(/\.business-logo,[^{]*\{[^}]*flex-shrink:0;/)
    // business_logo_size (56 by default) capped at 40: one row, not a block (implementation notes, option b)
    expect(rowCss).toMatch(/\.business-logo,[^{]*img,[^{]*\.business-logo-placeholder\{width:40px;height:40px;\}/)
    expect(rowCss).toMatch(/border-radius:10px/)
    // the whole logo, centered: never cropped
    expect(rowCss).toMatch(/object-fit:contain;object-position:center;/)
  })

  it('a business without a logo shows no logo by default (visibility.business.dummy_logo off)', () => {
    const noLogo = { ...cart.business, logo: null }
    const themed = renderCheckout(themeWithValues(), noLogo)
    expect(themed.container.querySelector('.business-logo')).toBeNull()
    expect(themed.getByText('Demo Store')).toHaveClass('store-strip-name')
    expect(themed.getByText('Pickup at Demo Store · ASAP')).toBeInTheDocument()
  })

  it('a business without a logo shows the theme\'s placeholder when visibility.business.dummy_logo is on (decorative, the name beside it)', async () => {
    const noLogo = { ...cart.business, logo: null }
    const completeTheme = themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'business.dummy_logo': true } }))
    const placeholder = completeTheme.values.images['placeholder.business_logo']
    expect(placeholder).toBeTruthy()
    const themed = renderCheckout(completeTheme, noLogo)
    const img = themed.container.querySelector('.business-logo img')
    expect(img).toHaveAttribute('src', placeholder)
    expect(img).toHaveAttribute('alt', '')
    expect(themed.getByText('Demo Store')).toHaveClass('store-strip-name')
    expect(themed.getByText('Pickup at Demo Store · ASAP')).toBeInTheDocument()
  })

  it('visibility.checkout.business.logo / phone / notes: the theme hides each; by default it keeps them', () => {
    const business = { ...cart.business, logo: 'https://example.test/logo.png', cellphone: '555-0100', address_notes: 'Back door' }
    const hidden = themeWithValues((values) => {
      Object.assign(values.visibility, { 'checkout.business.logo': false, 'checkout.business.phone': false, 'checkout.business.notes': false })
      return values
    })
    const themed = renderCheckout(hidden, business)
    // no logo, and nothing in its place (no store icon either)
    expect(themed.container.querySelector('.business-logo')).toBeNull()
    expect(themed.getByText('Demo Store').closest('div').parentElement.querySelector('svg, img')).toBeNull()
    // phone/notes are the context card's (the summary's store row never shows them)
    expect(themed.queryByText('555-0100')).toBeNull()
    expect(themed.queryByText('Back door')).toBeNull()
    themed.unmount()

    const shown = renderCheckout(themeWithValues(), business)
    expect(shown.container.querySelectorAll('.business-logo img')).toHaveLength(1)
    expect(shown.container.querySelector('.business-logo img')).toHaveAttribute('src', business.logo)
    const context = shown.container.querySelector('[data-doc-section="checkout-business-details"]')
    expect(context).toHaveTextContent('555-0100')
    expect(context).toHaveTextContent('Back door')
    shown.unmount()
  })

  // the business hidden by the theme (pages.checkout "business"): neither
  // the context card's block nor the summary's store row
  it('the business hidden by the theme hides the summary\'s store row too', () => {
    const hidden = themeWithValues((values) => {
      values.pages.checkout.sections = values.pages.checkout.sections.map((section) => section.key === 'business' ? { ...section, visible: false } : section)
      return values
    })
    const { container, queryByText } = renderCheckout(hidden)
    expect(queryByText('Demo Store')).toBeNull()
    expect(container.querySelector('.business-logo')).toBeNull()
    expect(container.querySelector('[data-doc-section="checkout-business-details"]')).toBeNull()
  })

  // a delivery (or the kiosk) has no business block in the context card: the
  // summary's store row holds all of it — phone, notes, the error
  it('a delivery keeps the business\' phone and notes, in the summary\'s store row', () => {
    const business = { ...cart.business, address: '42 Higher Ardwick', cellphone: '555-0100', address_notes: 'Back door' }
    const { container } = renderCheckout(themeWithValues(), business, 1)
    const summary = container.querySelector('[data-doc-section="checkout-summary"]')
    const block = summary.querySelector('[data-doc-section="checkout-business-details"]')
    expect(block).not.toBeNull()
    expect(block).toHaveTextContent('Demo Store')
    expect(block).toHaveTextContent('42 Higher Ardwick')
    expect(block).toHaveTextContent('555-0100')
    expect(block).toHaveTextContent('Back door')
    expect(container.querySelector('[data-doc-section="checkout-context"] [data-doc-section="checkout-business-details"]')).toBeNull()
  })

  it('a business that fails to load shows its error (delivery: in the store row; pickup: in the context card)', () => {
    const error = [{ message: 'Business not found' }]
    const delivery = renderCheckout(themeWithValues(), cart.business, 1, { error })
    const deliveryBlock = delivery.container.querySelector('[data-doc-section="checkout-summary"] [data-doc-section="checkout-business-details"]')
    expect(deliveryBlock).toHaveTextContent('Business Details')
    expect(mocks.notFoundContent).toBe('Business not found')
    delivery.unmount()
    mocks.notFoundContent = null
    const pickup = renderCheckout(themeWithValues(), cart.business, 2, { error })
    expect(pickup.container.querySelector('[data-doc-section="checkout-context"] [data-doc-section="checkout-business-details"]')).toHaveTextContent('Business Details')
    expect(mocks.notFoundContent).toBe('Business not found')
  })

  it('the kiosk keeps the business\' phone and notes too (no context card there)', () => {
    const business = { ...cart.business, cellphone: '555-0100', address_notes: 'Back door' }
    const { container } = renderCheckout(themeWithValues(), business, 2, { useKioskApp: true })
    expect(container.querySelector('[data-doc-section="checkout-context"]')).toBeNull()
    const block = container.querySelector('[data-doc-section="checkout-summary"] [data-doc-section="checkout-business-details"]')
    expect(block).toHaveTextContent('555-0100')
    expect(block).toHaveTextContent('Back door')
  })

  it('the context card\'s address follows checkout.business.address, and so does the store row\'s', () => {
    const business = { ...cart.business, address: '42 Higher Ardwick' }
    const shown = renderCheckout(themeWithValues(), business)
    expect(shown.getAllByText('42 Higher Ardwick')).toHaveLength(2)
    shown.unmount()
    const hidden = renderCheckout(themeWithValues((values) => {
      values.visibility['checkout.business.address'] = false
      return values
    }), business)
    expect(hidden.queryByText('42 Higher Ardwick')).toBeNull()
  })
})
