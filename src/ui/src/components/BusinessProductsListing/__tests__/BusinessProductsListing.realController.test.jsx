import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notes (regression): the pickup gate added to BusinessProductsListing
// must actually gate the REAL controller's business request (not just hide
// it behind a mocked controller). These tests keep the real OrderProvider
// (submodule) and the real BusinessAndProductList controller, and mock only
// the network (the ordering SDK) and the surrounding leaf UI.

vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~ui/src/components/RenderProductsLayout', () => ({
  RenderProductsLayout: () => <div data-testid='render-products-layout' />
}))

// the real OrderContext (submodule), never mocked in this file
vi.unmock('~components/contexts/OrderContext')

const mocks = vi.hoisted(() => ({ businessGet: vi.fn(), productGet: vi.fn() }))

const business = (overrides = {}) => ({ id: 1, slug: 'example_restaurant', categories: [], ...overrides })

const buildOrdering = ({ orderOptionsSave } = {}) => ({
  project: 'demo',
  businesses: (slug) => ({
    categories: () => ({
      products: () => ({
        parameters: () => ({ get: mocks.productGet })
      })
    }),
    select: () => ({
      parameters: (parameters) => ({
        get: () => mocks.businessGet(slug, parameters)
      })
    })
  }),
  setAccessToken: () => ({
    orderOptions: () => ({
      get: vi.fn().mockResolvedValue({ content: { error: false, result: { carts: [] } } }),
      save: orderOptionsSave || vi.fn().mockResolvedValue({ content: { error: false, result: {} }, status: 200 })
    })
  })
})

/**
 * Renders a fresh BusinessProductsListing with the REAL OrderProvider and
 * controller: `isEntryStore` and the pickup-start latch (singleStore.js) are
 * module-level state captured at import, so each scenario needs its own
 * module graph (a fresh "page load").
 */
const renderListing = async ({
  pathname = '/',
  theme,
  slug = 'example_restaurant',
  configs = { order_types_allowed: { value: '1|2|3' }, default_order_type: { value: 'delivery' } },
  businessResult = business(),
  strategyOverrides = {},
  session,
  orderOptionsSave,
  beforeRender,
  listingProps
} = {}) => {
  window.history.pushState({}, '', pathname)
  vi.resetModules()
  mocks.businessGet.mockReset().mockResolvedValue({ content: { error: false, result: businessResult } })
  mocks.productGet.mockReset().mockResolvedValue({ content: { error: false, result: { id: 2, name: 'Test item' } } })

  // a STABLE tuple: the real OrderProvider's boot effect depends on the whole
  // configState object, so a fresh array/object on every call (as a naive
  // inline mock would return) never lets its dependency array settle and
  // loops setOptionFromLocalStorage forever, clobbering changeType's update
  const configTuple = [{ configs, loading: false }]
  vi.doMock('~components/contexts/ConfigContext', () => ({
    useConfig: () => configTuple
  }))
  const toastTuple = [[], { showToast: vi.fn() }]
  const toastActions = { showToast: vi.fn() }
  vi.doMock('~components/contexts/ToastContext', () => ({
    ToastType: { Error: 'error', Success: 'success', Info: 'info' },
    useToast: () => toastTuple,
    useToastActions: () => toastActions
  }))
  if (session) {
    const sessionTuple = [session, { login: vi.fn(), logout: vi.fn() }]
    vi.doMock('~components/contexts/SessionContext', () => ({ useSession: () => sessionTuple }))
  }

  const ordering = buildOrdering({ orderOptionsSave })
  const apiTuple = [ordering, { setOrdering: vi.fn(), setLanguage: vi.fn() }]
  vi.doMock('~components/contexts/ApiContext', () => ({
    useApi: () => apiTuple
  }))

  const { OrderProvider, useOrder } = await import('~components/contexts/OrderContext')
  const { BusinessProductsListing } = await import('../index')
  const singleStoreModule = await import('../../../../../utils/singleStore')

  await beforeRender?.(singleStoreModule)

  let orderActions
  let orderState
  const OrderProbe = () => {
    ;[orderState, orderActions] = useOrder()
    return null
  }

  const strategy = {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn(),
    ...strategyOverrides
  }

  const view = renderWithProviders(
    <OrderProvider strategy={strategy}>
      <OrderProbe />
      <BusinessProductsListing
        slug={slug}
        ordering={ordering}
        businessProps={['id', 'slug', 'categories', 'pickup']}
        notLoadProducts
        {...listingProps}
      />
    </OrderProvider>,
    { theme, initialEntries: [pathname] }
  )

  return {
    ...view,
    getOrderState: () => orderState,
    getOrderActions: () => orderActions,
    singleStoreModule
  }
}

it('makes recovery available when a deep-linked shop is removed during a menu reload', async () => {
  const view = await renderListing({
    pathname: '/store/example_restaurant?category=1&product=2',
    listingProps: { categoryId: 1, productId: 2 }
  })
  await waitFor(() => expect(mocks.productGet).toHaveBeenCalled())
  await view.findByRole('dialog')
  const productRequests = mocks.productGet.mock.calls.length

  mocks.businessGet.mockResolvedValue({ content: { error: false, result: null } })
  await act(async () => view.getOrderActions().changeMoment(new Date('2026-11-20T14:30:00Z')))
  const exit = await view.findByRole('link', { name: 'Choose an address' })
  expect(view.queryByRole('dialog')).not.toBeInTheDocument()
  expect(mocks.productGet).toHaveBeenCalledTimes(productRequests)
  fireEvent.click(exit)
  expect(view.queryByRole('dialog')).not.toBeInTheDocument()
})

describe('BusinessProductsListing with the real controller', () => {
  it('a single-store site: exactly one business request, with type 2 — not called at all while the gate is pending', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    const { getOrderState, getOrderActions } = await renderListing({ pathname: '/store/example_restaurant', theme })

    // isExternalLoading actually prevents the request: nothing fired yet
    expect(mocks.businessGet).not.toHaveBeenCalled()

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 2 }))
    await waitFor(() => expect(getOrderState()?.options?.type).toBe(2))

    // the real provider exposes the functions the gate and the UI need
    expect(typeof getOrderActions()?.changeType).toBe('function')
    expect(typeof getOrderActions()?.setPickupWithoutAddress).toBe('function')
  })

  it('a non-entry marketplace store: one request with the initial type, no forced pickup', async () => {
    const { getOrderState } = await renderListing({
      pathname: '/',
      slug: 'example_restaurant',
      theme: themeWithValues()
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
    expect(getOrderState()?.options?.type).toBe(1)
  })

  it('latch already taken this page load: no gate, no extra request, type untouched', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    const { getOrderState } = await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      beforeRender: async ({ takeStorePickupStart }) => { takeStorePickupStart() }
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
    // never forced: stays at the initial (delivery) type
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getOrderState()?.options?.type).toBe(1)
  })

  it('another decider (e.g. App.js\'s boot gate) already took the latch and recorded a forced-from type: waits for it to land, no extra fetch meanwhile, exactly one request once it does', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    const { getOrderActions } = await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      beforeRender: async ({ takeStorePickupStart, setStorePickupForcedFrom }) => {
        takeStorePickupStart()
        setStorePickupForcedFrom(1)
      }
    })

    // the other decider's own changeType(2) hasn't landed yet: held, same as pending
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mocks.businessGet).not.toHaveBeenCalled()

    await act(async () => { await getOrderActions().changeType(2) })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 2 }))
  })

  it('business.pickup === false: forces pickup optimistically, then restores the previous type once known (one extra request)', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    const { getOrderState } = await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      businessResult: business({ pickup: false })
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(2))
    expect(mocks.businessGet.mock.calls[0][1]).toEqual(expect.objectContaining({ type: 2 }))
    expect(mocks.businessGet.mock.calls[1][1]).toEqual(expect.objectContaining({ type: 1 }))
    await waitFor(() => expect(getOrderState()?.options?.type).toBe(1))
  })

  it('a forced-from record left by a different store (a fast client nav before it loaded) never restores this store\'s type', async () => {
    // not single-store/entry for 'other-business': only the plain UI revert
    // effect is exercised, with a record some earlier, different store left
    const { getOrderState, singleStoreModule } = await renderListing({
      pathname: '/',
      slug: 'other-business',
      theme: themeWithValues(),
      businessResult: business({ slug: 'other-business', pickup: false }),
      beforeRender: async ({ setStorePickupForcedFrom }) => { setStorePickupForcedFrom(1, 'example_restaurant') }
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    // never touched: the record wasn't for this store, so no revert ran
    expect(getOrderState()?.options?.type).toBe(1)
    // left in place for whoever it actually belongs to
    expect(singleStoreModule.storePickupForcedFromRecorded()).toBe(true)
    expect(singleStoreModule.takeStorePickupForcedFrom()).toEqual({ type: 1, slug: 'example_restaurant' })
  })

  it('project config resolves without order_types_allowed: opens immediately, one request, never hangs', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      configs: { default_order_type: { value: 'delivery' } }
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
  })

  it('changeType rejecting never hangs the gate: one request still fires', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      strategyOverrides: { setItem: vi.fn().mockRejectedValue(new Error('storage full')) }
    })

    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    // changeType rejected before the type changed: the held request still
    // releases, with whatever type the order already had
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
  })

  it('changeType(2) resolves but the type never actually lands (e.g. the API silently reverts it for a logged-in guest): settles, gives up, exactly one request fires (not stuck)', async () => {
    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
    // the server answers OK but keeps the order at type 1: changeType(2)
    // still resolves, yet orderState.options.type never reaches 2
    const orderOptionsSave = vi.fn().mockResolvedValue({ content: { error: false, result: { type: 1 } }, status: 200 })
    const { getOrderState } = await renderListing({
      pathname: '/store/example_restaurant',
      theme,
      session: { auth: true, loading: false, user: { id: 1 }, token: 'test-token' },
      orderOptionsSave
    })

    await waitFor(() => expect(orderOptionsSave).toHaveBeenCalled())
    await waitFor(() => expect(mocks.businessGet).toHaveBeenCalledTimes(1))
    expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
    expect(getOrderState()?.options?.type).toBe(1)
  })

  it('a changeType(2) that never settles at all is released by the 4s fallback timeout: exactly one request still fires', async () => {
    vi.useFakeTimers()
    try {
      const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'example_restaurant' }; return values })
      await renderListing({
        pathname: '/store/example_restaurant',
        theme,
        strategyOverrides: { setItem: () => new Promise(() => {}) } // never resolves nor rejects
      })

      // flushes the boot chain (real promise microtasks) up to the point
      // where the gate calls changeType(2) and registers its own fallback
      // timer, before fake-advancing virtual time past it
      await act(async () => {})
      await act(async () => { await vi.advanceTimersByTimeAsync(4000) })

      expect(mocks.businessGet).toHaveBeenCalledTimes(1)
      expect(mocks.businessGet).toHaveBeenCalledWith('example_restaurant', expect.objectContaining({ type: 1 }))
    } finally {
      vi.useRealTimers()
    }
  })
})
