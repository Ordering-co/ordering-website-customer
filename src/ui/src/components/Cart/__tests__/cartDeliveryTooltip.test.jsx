import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Cart } from '../index'

vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))
vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children }) => <div>{children}</div>
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

// A delivery that is free by the extra value of a partner (its fee, 5, is
// the extra value's opposite): the fee row carries the info tooltip
const cart = {
  ...cartFixture,
  business: businessFixture,
  valid_products: true,
  valid_schedule: true,
  valid_maximum: true,
  valid_minimum: true,
  valid_address: true,
  total: 9.5,
  delivery_price_with_discount: 5,
  metafields: [{ key: 'extra_value_free_delivery', value: '-5' }],
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

describe('Cart: the free delivery tooltip of the delivery fee', () => {
  it('complete theme: the base tooltip (components.tooltip) on a button, by keyboard', async () => {
    renderWithProviders(<Cart cart={cart} />, { theme: themeWithValues() })
    const trigger = screen.getByRole('button', { name: 'More information' })
    expect(trigger.style.getPropertyValue('--ui-button-height')).not.toBe('')
    expect(screen.queryByRole('tooltip')).toBeNull()
    await act(async () => { trigger.focus() })
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveAttribute('data-slot', 'tooltip-content')
    expect(tip).toHaveTextContent('Free delivery applied')
    expect(trigger.getAttribute('aria-describedby')).toContain(tip.id)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
  })
})
