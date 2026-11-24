import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// Pickup without an address: once the store starts in pickup
// without an address (orderState.pickupWithoutAddress), ProductForm treats
// pickup (2) as an unaddressed type too (unaddressedTypesFor): the normal
// "Add to cart" shows, not the address requirement, and adding does not
// open the address modal.

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({
  Navigation: class Navigation {},
  Pagination: class Pagination {},
  Thumbs: class Thumbs {}
}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ children }) => <div data-testid='product-option'>{children}</div>
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => <div data-testid='address-list' /> }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

const product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', ingredients: [], extras: [] }

/**
 * Renders a fresh ProductForm with the given order type, address and
 * pickup-without-address state (set by storePickupApplies on the business
 * listing) and the project's unaddressed types config.
 */
const renderProductForm = async ({ pickupWithoutAddress, orderType, hasAddress = false, unaddressedConfig = '' } = {}) => {
  vi.resetModules()
  const handleSave = vi.fn()

  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{
      loading: false,
      options: { type: orderType, address: hasAddress ? { location: { lat: 1, lng: 1 } } : {} },
      pickupWithoutAddress
    }]
  }))
  vi.doMock('~components/contexts/ConfigContext', () => ({
    useConfig: () => [{ configs: { unaddressed_order_types_allowed: { value: unaddressedConfig } } }]
  }))
  vi.doMock('~components/components/ProductForm', () => ({
    ProductForm: ({ UIComponent, ...rest }) => (
      <UIComponent
        productObject={{ product, loading: false, error: null }}
        business={{ id: 1, name: 'Store' }}
        handleSave={handleSave}
        increment={vi.fn()}
        decrement={vi.fn()}
        handleChangeSuboptionState={vi.fn()}
        errors={{}}
        isSoldOut={false}
        editMode={false}
        maxProductQuantity={5}
        showOption={() => true}
        productCart={{ quantity: 1, options: {}, ingredients: {} }}
        {...rest}
      />
    )
  }))

  const { ProductForm } = await import('../index')
  const utils = renderWithProviders(<ProductForm />)
  return { ...utils, handleSave }
}

describe('ProductForm: pickup without an address', () => {
  it('pickup (2) without an address: "Add to cart" shows, not the address requirement', async () => {
    const { getByRole, queryByTestId, handleSave } = await renderProductForm({
      pickupWithoutAddress: true,
      orderType: 2,
      hasAddress: false,
      unaddressedConfig: ''
    })

    const addButton = getByRole('button', { name: 'Add to cart' })
    expect(queryByTestId('address-list')).toBeNull()

    fireEvent.click(addButton)
    expect(handleSave).toHaveBeenCalled()
    expect(queryByTestId('address-form')).toBeNull()
  })

  it('without pickupWithoutAddress, pickup still never asks for an address (implementation notespickup needs no customer address)', async () => {
    const { getByRole, queryByTestId, handleSave } = await renderProductForm({
      pickupWithoutAddress: false,
      orderType: 2,
      hasAddress: false,
      unaddressedConfig: ''
    })

    const addButton = getByRole('button', { name: 'Add to cart' })
    expect(queryByTestId('address-list')).toBeNull()

    fireEvent.click(addButton)
    expect(handleSave).toHaveBeenCalled()
  })
})
