import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { Cart } from '../index'

vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))
vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children }) => <div>{children}</div>
}))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({ ProductItemAccordion: () => null }))
vi.mock('~ui/src/components/CouponControl', () => ({ CouponControl: () => <div data-testid='coupon' /> }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/CartStoresListing', () => ({ CartStoresListing: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/MomentContent', () => ({ MomentContent: () => null }))
vi.mock('~ui/src/components/ServiceForm', () => ({ ServiceForm: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/TaxBillRows', () => ({ TaxBillRows: ({ target }) => <tr data-testid={`tax-rows-${target}`}><td /></tr> }))
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
  balance: 4.25,
  status: 0,
  products: [{ ...productFixture, code: 'BRG-1' }],
  // one product tax apart from the price: the "Taxes and fees" line
  taxes: [{ id: 7, name: 'VAT', type: 2, target: 'product', rate: 10, summary: { tax: 0.95 } }],
  // a payment with a wallet: "Total to pay" goes under it
  payment_events: [{ id: 1, event: 'payment', wallet_id: 3, amount: 5.25 }],
  wallets: [{ id: 3, type: 'cash' }]
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
      removeProduct={vi.fn()}
      isCartPending={false}
      {...rest}
    />
  )
}))

const withVisibility = (visibility) => themeWithValues((values) => {
  Object.assign(values.visibility, visibility)
  return values
})

describe('cart: visibility cart.taxes_detail', () => {
  it('the schema: shown by default', () => {
    expect(schemaDefault('visibility.cart.taxes_detail')).toBe(true)
  })

  it('by default the "Taxes and fees" line opens to its breakdown', () => {
    const { container, getByText, queryByTestId } = renderWithProviders(<Cart cart={cart} isCheckout />, { theme: themeWithValues() })
    const toggle = container.querySelector('[data-doc-control="cart-taxes-fees-toggle"]')
    expect(toggle).not.toBeNull()
    expect(queryByTestId('tax-rows-product')).toBeNull()
    fireEvent.click(getByText('Taxes and fees'))
    expect(queryByTestId('tax-rows-product')).not.toBeNull()
  })

  it('the line\'s label is a real button that says whether the breakdown is open', () => {
    const { container, getByRole, queryByTestId } = renderWithProviders(<Cart cart={cart} isCheckout />, { theme: themeWithValues() })
    const button = getByRole('button', { name: 'Taxes and fees' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.querySelector('svg.lucide-chevron-down')).not.toBeNull()
    // the row is no button of its own (the table keeps its rows)
    expect(container.querySelector('[data-doc-control="cart-taxes-fees-toggle"]')).not.toHaveAttribute('role')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(queryByTestId('tax-rows-product')).not.toBeNull()
  })

  it('off: the line keeps its total, does not open, and no breakdown (cart and checkout)', () => {
    const theme = withVisibility({ 'cart.taxes_detail': false })
    ;[false, true].forEach((isCheckout) => {
      const { container, getByText, queryByTestId, unmount } = renderWithProviders(<Cart cart={cart} isCheckout={isCheckout} isCartPopover={!isCheckout} />, { theme })
      expect(container.querySelector('[data-doc-control="cart-taxes-fees-toggle"]')).toBeNull()
      const row = container.querySelector('[data-doc-control="cart-taxes-fees-total"]')
      expect(row).not.toBeNull()
      expect(row.textContent).toContain('0.95')
      fireEvent.click(getByText('Taxes and fees'))
      expect(queryByTestId('tax-rows-product')).toBeNull()
      unmount()
    })
  })
})

describe('cart: visibility cart.balance_total ("Total to pay")', () => {
  it('the schema: hidden by default', () => {
    expect(schemaDefault('visibility.cart.balance_total')).toBe(false)
    const { queryByText } = renderWithProviders(<Cart cart={cart} isCheckout />, { theme: themeWithValues() })
    expect(queryByText('Total to pay')).toBeNull()
  })

  it('on: "Total to pay" with the cart\'s balance under its wallet payments', () => {
    const { getByText } = renderWithProviders(<Cart cart={cart} isCheckout />, { theme: withVisibility({ 'cart.balance_total': true }) })
    const label = getByText('Total to pay')
    expect(label.parentElement.textContent).toContain('4.25')
  })
})

describe('cart: cart.comments and cart.discount_coupon in the checkout too', () => {
  const shown = (theme) => {
    const utils = renderWithProviders(
      <Cart cart={cart} isCheckout hideCommentsByValidationCheckout={false} hideCouponByValidationCheckout={false} />,
      { theme }
    )
    const result = { comments: !!utils.container.querySelector('table.comments'), coupon: !!utils.queryByTestId('coupon') }
    utils.unmount()
    return result
  }

  it('by default the checkout shows both', () => {
    expect(shown(themeWithValues())).toEqual({ comments: true, coupon: true })
  })

  it('the theme hides each one apart in the checkout', () => {
    expect(shown(withVisibility({ 'cart.comments': false }))).toEqual({ comments: false, coupon: true })
    expect(shown(withVisibility({ 'cart.discount_coupon': false }))).toEqual({ comments: true, coupon: false })
  })

  it('the checkout\'s own fields still hide them', () => {
    const utils = renderWithProviders(
      <Cart cart={cart} isCheckout hideCommentsByValidationCheckout hideCouponByValidationCheckout />,
      { theme: themeWithValues() }
    )
    expect(utils.container.querySelector('table.comments')).toBeNull()
    expect(utils.queryByTestId('coupon')).toBeNull()
  })
})
