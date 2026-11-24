import React from 'react'
import { describe, expect, it, vi } from 'vitest'
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
vi.mock('~ui/src/components/CouponControl', () => ({ CouponControl: () => null }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => <div data-testid='upselling' /> }))
vi.mock('~ui/src/components/CartStoresListing', () => ({ CartStoresListing: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/MomentContent', () => ({ MomentContent: () => null }))
vi.mock('~ui/src/components/ServiceForm', () => ({ ServiceForm: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/TaxBillRows', () => ({ TaxBillRows: () => null }))
vi.mock('~ui/src/components/FeeBillRows', () => ({ FeeBillRows: () => null }))
vi.mock('~ui/src/components/RewardsBanner', () => ({ RewardsBanner: () => <div data-testid='rewards' /> }))
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
      removeProduct={vi.fn()}
      isCheckout={false}
      isCartPending={false}
      {...rest}
    />
  )
}))

const withVisibility = (visibility) => themeWithValues((values) => {
  Object.assign(values.visibility, visibility)
  return values
})

// What the cart shows: the rewards row and the upselling ("Complement your order")
const shown = (theme) => {
  const utils = renderWithProviders(<Cart cart={cart} isCustomMode loyaltyRewardRate={0.1} />, { theme })
  const result = { rewards: !!utils.queryByTestId('rewards'), upselling: !!utils.queryByTestId('upselling') }
  utils.unmount()
  return result
}

describe('cart: visibility cart.upselling and cart.rewards', () => {
  it('the schema: both visible by default', () => {
    expect(schemaDefault('visibility.cart.upselling')).toBe(true)
    expect(schemaDefault('visibility.cart.rewards')).toBe(true)
  })

  it('by default show both', () => {
    expect(shown(themeWithValues())).toEqual({ rewards: true, upselling: true })
  })

  it('a complete theme hides each one apart', () => {
    expect(shown(withVisibility({ 'cart.upselling': false }))).toEqual({ rewards: true, upselling: false })
    expect(shown(withVisibility({ 'cart.rewards': false }))).toEqual({ rewards: false, upselling: true })
  })
})
