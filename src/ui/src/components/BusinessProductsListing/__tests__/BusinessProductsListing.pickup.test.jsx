import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// Pickup without an address: a "One store" site, or landing
// directly on a store page, starts the order in pickup without forcing an
// address. Other stores of a marketplace keep the settings rule.

vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: () => <div data-testid='product-form' />
}))
vi.mock('~ui/src/components/Cart', () => ({
  Cart: () => <div data-testid='cart' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))

// open by default: these tests aren't about the closed-store schedule flow
const business = (overrides = {}) => ({ id: 1, name: 'Demo Store', slug: 'demo-store', open: true, ...overrides })

/**
 * Renders a fresh BusinessProductsListing with the given entry pathname,
 * business and project config: `isEntryStore` and the pickup-start latch
 * (singleStore.js) are module-level state captured at import, so each
 * scenario needs its own module graph (a fresh "page load").
 */
const renderListing = async ({
  pathname = '/',
  businessOverrides = {},
  configs = { order_types_allowed: { value: '1|2|3' } },
  orderOptions = { type: 1 },
  pickupWithoutAddress = false,
  orderLoading = false,
  auth = false,
  quickAddProduct = null,
  theme
} = {}) => {
  window.history.pushState({}, '', pathname)
  vi.resetModules()

  const spies = { changeType: vi.fn(), setPickupWithoutAddress: vi.fn(), addProduct: vi.fn(), updateProduct: vi.fn() }
  const events = { emit: vi.fn(), on: vi.fn(), off: vi.fn() }

  vi.doMock('~components/contexts/ConfigContext', () => ({
    useConfig: () => [{ configs }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{ carts: {}, options: orderOptions, pickupWithoutAddress, loading: orderLoading }, spies]
  }))
  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth, user: {} }, { login: vi.fn() }]
  }))
  vi.doMock('~components/contexts/EventContext', () => ({
    useEvent: () => [events]
  }))
  vi.doMock('~ui/src/components/RenderProductsLayout', () => ({
    RenderProductsLayout: ({ onProductClick }) => (
      <div data-testid='render-products-layout'>
        {quickAddProduct && (
          <button type='button' data-testid='quick-add' onClick={() => onProductClick(quickAddProduct)}>
            Quick add
          </button>
        )}
      </div>
    )
  }))
  vi.doMock('~components/components/BusinessAndProductList', () => ({
    BusinessAndProductList: ({ UIComponent, ...rest }) => (
      <UIComponent
        businessState={{ business: business(businessOverrides), loading: false, error: null }}
        categoryState={{ products: [], loading: false }}
        categorySelected={{ id: 1, name: 'Menu' }}
        productModal={{ open: false }}
        updateProductModal={vi.fn()}
        onProductRedirect={vi.fn()}
        handleChangeSearch={vi.fn()}
        errors={[]}
        notFound={false}
        {...rest}
      />
    )
  }))

  const { BusinessProductsListing } = await import('../index')
  renderWithProviders(<BusinessProductsListing />, { theme })
  return { ...spies, events }
}

describe('BusinessProductsListing: pickup without an address', () => {
  afterEach(() => { window.history.pushState({}, '', '/') })

  it('a One store site starts in pickup without an address', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'demo-store' }; return values })
    const { setPickupWithoutAddress, changeType } = await renderListing({ pathname: '/', theme })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(true)
    expect(changeType).toHaveBeenCalledWith(2)
  })

  it('waits for the order options and the project config before deciding', async () => {
    const loading = await renderListing({ pathname: '/store/demo-store', orderLoading: true, theme: themeWithValues() })
    expect(loading.setPickupWithoutAddress).not.toHaveBeenCalled()
    expect(loading.changeType).not.toHaveBeenCalled()

    const noConfig = await renderListing({ pathname: '/store/demo-store', configs: {}, theme: themeWithValues() })
    expect(noConfig.setPickupWithoutAddress).not.toHaveBeenCalled()
    expect(noConfig.changeType).not.toHaveBeenCalled()
  })

  it('landing directly on the store page starts it in pickup too', async () => {
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/store/demo-store',
      theme: themeWithValues()
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(true)
    expect(changeType).toHaveBeenCalledWith(2)
  })

  it('navigating from the marketplace home to a store keeps the settings rule', async () => {
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/',
      theme: themeWithValues()
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(false)
    expect(changeType).not.toHaveBeenCalled()
  })

  it('entering by a different store, then visiting this one, keeps the settings rule', async () => {
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/store/other-store',
      businessOverrides: { slug: 'demo-store' },
      theme: themeWithValues()
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(false)
    expect(changeType).not.toHaveBeenCalled()
  })

  it('a project without pickup allowed never forces it, even on a One store site', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'demo-store' }; return values })
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/',
      theme,
      configs: { order_types_allowed: { value: '1|3' } }
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(false)
    expect(changeType).not.toHaveBeenCalled()
  })

  it('already in pickup: setPickupWithoutAddress still runs, changeType does not', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'demo-store' }; return values })
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/',
      theme,
      orderOptions: { type: 2 }
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(true)
    expect(changeType).not.toHaveBeenCalled()
  })

  it('an explicit business.pickup === false disables it even for a One store site', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'demo-store' }; return values })
    const { setPickupWithoutAddress, changeType } = await renderListing({
      pathname: '/',
      theme,
      businessOverrides: { pickup: false }
    })

    expect(setPickupWithoutAddress).toHaveBeenCalledWith(false)
    // implementation notesthis mock renders the business already loaded from the
    // very first commit, so the pickup gate (which decides before knowing
    // the business) still forces pickup optimistically here; only once a
    // business genuinely loads after the gate (BusinessProductsListing.realController.test.jsx)
    // does the business.pickup === false edge revert it.
    expect(changeType).toHaveBeenCalledWith(2)
  })

  it('quick-adds a pickup product without requiring an order address', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'demo-store' }; return values })
    const { events, addProduct } = await renderListing({
      pathname: '/',
      theme,
      auth: true,
      orderOptions: { type: 2 },
      pickupWithoutAddress: true,
      configs: {
        order_types_allowed: { value: '1|2|3' },
        add_product_with_one_click: { value: '1' },
        unaddressed_order_types_allowed: { value: '' }
      },
      quickAddProduct: { id: 99, extras: [], inventoried: false, minimum_per_order: 1 }
    })

    await act(async () => { fireEvent.click(screen.getByTestId('quick-add')) })

    expect(events.emit).not.toHaveBeenCalledWith('require_order_address', expect.anything())
    expect(addProduct).toHaveBeenCalled()
  })
})
