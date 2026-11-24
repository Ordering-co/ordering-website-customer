import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { parseDateLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { Cart } from '../index'

vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))

vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children, moment }) => (
    <div data-testid='business-accordion'>
      <span data-testid='cart-moment'>{moment}</span>
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

// B7: the cart showed "Right Now" always (it read options.moment as
// option.moment); the moment is UTC and shows in the user's local time.
describe('Cart: the order moment', () => {
  let orderState
  let utils
  let previous

  beforeEach(() => {
    orderState = useOrder()[0]
    utils = useUtils()[0]
    previous = { options: orderState.options, parseDate: utils.parseDate }
    utils.parseDate = parseDateLikeApp
  })

  afterEach(() => {
    orderState.options = previous.options
    utils.parseDate = previous.parseDate
  })

  it.each([
    ['Asia/Kolkata', '10/20 23:30'],
    ['America/Los_Angeles', '10/20 11:00'],
    ['America/New_York', '10/20 14:00'],
    ['Pacific/Auckland', '10/21 07:00']
  ])('a scheduled moment (UTC 2026-10-20 18:00) shows for a user in %s as %s', (zone, expected) => {
    orderState.options = { type: 1, moment: '2026-10-20 18:00:00' }
    withUserTimezone(zone, () => {
      const { unmount } = renderWithProviders(<Cart cart={cart} />)
      // the header's format: preorderDateFormat (MM/DD in the tests) + timeFormat
      expect(screen.getByTestId('cart-moment')).toHaveTextContent(expected)
      unmount()
    })
  })

  it('without a moment it is "Right Now"', () => {
    orderState.options = { type: 1, moment: null }
    renderWithProviders(<Cart cart={cart} />)
    expect(screen.getByTestId('cart-moment')).toHaveTextContent('Right Now')
  })
})
