import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { checkoutCartFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { sampleBusiness } from '../../__tests__/helpers/ordersTestMocks'
import { MultiCheckout } from '../index'

// /multi-checkout with the sections of pages.multi_checkout: the details
// column is ordered and hidden by the theme.
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1 }, carts: {} }, { refreshOrderOptions: () => {} }]
}))
vi.mock('~ui/hooks/useBusinessVerticals', () => ({ useBusinessVerticals: () => ({}) }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useHistory: () => ({ push: vi.fn(), replace: vi.fn(), goBack: vi.fn() }) }
})
vi.mock('~components/components/MultiCheckout', () => ({
  MultiCheckout: ({ UIComponent, ...rest }) => (
    <UIComponent
      openCarts={[{ ...checkoutCartFixture, business: sampleBusiness }]}
      cartGroup={{ loading: false, result: { status: 'pending', balance: 15.5 } }}
      walletState={{ error: null }}
      checkoutFieldsState={{ loading: false, fields: [] }}
      loyaltyPlansState={{ result: [] }}
      paymethodSelected={{ id: 1, gateway: 'cash', paymethod_id: 1 }}
      handleGroupPlaceOrder={vi.fn()}
      onRedirectPage={vi.fn()}
      placing={false}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/AddressDetails', () => ({ AddressDetails: () => <div data-section='address' /> }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => <div data-section='customer' /> }))
vi.mock('~ui/src/components/MultiCartsPaymethodsAndWallets', () => ({ MultiCartsPaymethodsAndWallets: () => null }))

const order = (container) => {
  const left = container.querySelector('[data-doc-section="multi-checkout-details"]')
  return Array.from(left.querySelectorAll('h1, [data-section], [data-doc-section="multi-checkout-payment"], [data-testid="icon-arrowLeft"]:not(button *), button[aria-label="Back"]'))
    .map((node) => node.tagName === 'H1'
      ? 'title'
      : node.getAttribute('data-section') || (node.getAttribute('data-doc-section') ? 'payment_methods' : 'back'))
}

const render = (theme) => renderWithProviders(<MultiCheckout cartUuid={checkoutCartFixture.uuid} />, { theme })

describe('MultiCheckout sections (pages.multi_checkout)', () => {
  it('the schema defaults: the default order', () => {
    const { container } = render(defaultTheme)
    expect(order(container)).toEqual(['back', 'title', 'address', 'customer', 'payment_methods'])
  })

  it('the theme orders the details and hides back and address', () => {
    const theme = themeWithValues((values) => ({
      ...values,
      pages: {
        ...values.pages,
        multi_checkout: {
          ...values.pages.multi_checkout,
          sections: [
            { key: 'title', visible: true },
            { key: 'payment_methods', visible: true },
            { key: 'customer', visible: true },
            { key: 'back', visible: false },
            { key: 'address', visible: false }
          ]
        }
      }
    }))
    const { container } = render(theme)
    expect(order(container)).toEqual(['title', 'payment_methods', 'customer'])
    expect(container.querySelectorAll('h1')).toHaveLength(1)
  })
})

describe('MultiCheckout headings', () => {
  it('one h1 and the sections\' titles as h2 (no skipped level)', () => {
    const { getAllByRole, queryAllByRole } = render(defaultTheme)
    expect(getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const titles = getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(expect.arrayContaining(['Payment Methods', 'Your order']))
    expect(queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)).not.toEqual(expect.arrayContaining(['Payment Methods', 'Your order']))
  })
})

describe('MultiCheckout dividers between sections', () => {
  // the direct children of the details column: a divider is an empty div
  const column = (container) => Array.from(container.querySelector('[data-doc-section="multi-checkout-details"]').children)
    .map((node) => {
      if (node.tagName === 'H1') return 'title'
      if (node.tagName === 'BUTTON' || node.querySelector?.('button[aria-label="Back"]')) return 'back'
      if (node.getAttribute('data-section')) return node.getAttribute('data-section')
      if (node.querySelector('[data-section="customer"]')) return 'customer'
      if (node.getAttribute('data-doc-section') === 'multi-checkout-payment') return 'payment_methods'
      return node.childElementCount === 0 ? 'divider' : 'other'
    })

  it('one between every two content sections, in the theme\'s order (none by the back action and the title)', () => {
    const theme = themeWithValues((values) => ({
      ...values,
      pages: {
        ...values.pages,
        multi_checkout: {
          ...values.pages.multi_checkout,
          sections: [
            { key: 'back', visible: true },
            { key: 'title', visible: true },
            { key: 'address', visible: true },
            { key: 'payment_methods', visible: true },
            { key: 'customer', visible: true }
          ]
        }
      }
    }))
    const { container } = render(theme)
    expect(column(container)).toEqual(['back', 'title', 'address', 'divider', 'payment_methods', 'divider', 'customer'])
  })
})
