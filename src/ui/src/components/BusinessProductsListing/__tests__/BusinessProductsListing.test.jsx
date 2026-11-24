import React from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessProductsListing } from '../index'
import { classicStoreTheme, noCartColumnStoreTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { useSite } from '~components/contexts/SiteContext'
import { useEvent } from '~components/contexts/EventContext'
import { storeCartInPage } from '~/utils/storeCartInPage'

const freeDelivery = vi.hoisted(() => ({
  state: {
    status: 'progress',
    offer: { id: 34 },
    minimum: 25,
    currentAmount: 10,
    remainingAmount: 15,
    progressPercent: 40,
    diagnosticReason: null,
    refresh: vi.fn()
  },
  useFreeDeliveryProgress: vi.fn()
}))

const order = vi.hoisted(() => ({
  address: null,
  changeType: vi.fn(),
  cart: {
    business: { slug: 'demo-store' },
    business_id: 1,
    products: [{ id: 10, name: 'Burger' }],
    subtotal: 10,
    total: 12,
    taxes: []
  }
}))

const viewport = vi.hoisted(() => ({ width: 375, height: 667 }))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => viewport
}))

vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: freeDelivery.useFreeDeliveryProgress
}))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { order_types_allowed: { value: '1|2' } } }]
}))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{
    carts: { 1: order.cart },
    options: { type: 1, address: order.address }
  }, {
    addProduct: vi.fn(),
    updateProduct: vi.fn(),
    changeType: order.changeType
  }]
}))

vi.mock('~ui/src/components/RenderProductsLayout', () => ({
  RenderProductsLayout: ({ freeDeliveryProgress, onBackToList }) => (
    <div data-testid='render-products-layout' data-progress-status={freeDeliveryProgress?.status} data-back={typeof onBackToList} />
  )
}))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ children }) => <div role='dialog'>{children}</div>
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: () => <div data-testid='product-form' />
}))
vi.mock('~ui/src/components/Cart', () => ({
  Cart: ({ freeDeliveryProgress }) => (
    <div data-testid='cart' data-progress-status={freeDeliveryProgress?.status} />
  )
}))

vi.mock('~components/components/BusinessAndProductList', () => ({
  BusinessAndProductList: ({ UIComponent, ...rest }) => (
    <UIComponent
      businessState={{ business: businessFixture, loading: false, error: null }}
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

describe('BusinessProductsListing', () => {
  beforeEach(() => {
    order.address = null
    order.changeType.mockReset()
    freeDelivery.useFreeDeliveryProgress.mockReset()
    freeDelivery.useFreeDeliveryProgress.mockReturnValue(freeDelivery.state)
  })

  describe('a missing store', () => {
    const notFound = { business: null, loading: false, error: null }
    const renderMissingStore = (entry = '/store/missing', theme, slug = 'missing') => (
      renderWithProviders(<BusinessProductsListing slug={slug} businessState={notFound} />, { initialEntries: [entry], theme })
    )

    it('explains that the store is missing and sends an unlocated shopper to choose an address', () => {
      const { getByRole } = renderMissingStore()
      expect(getByRole('heading', { name: 'Store not found' })).toBeInTheDocument()
      expect(getByRole('link', { name: 'Choose an address' })).toHaveAttribute('href', '/')
    })

    it('sends an unlocated shopper to the menu at /order on a full website', () => {
      const theme = themeWithValues((values) => { values.site.experience = 'full_website'; return values })
      const { getByRole } = renderMissingStore('/store/missing', theme)
      expect(getByRole('link', { name: 'Choose an address' })).toHaveAttribute('href', '/order')
    })

    it('returns to the business list with a valid order address', () => {
      order.address = { location: { lat: 43.54, lng: -79.66 } }
      const { getByRole } = renderMissingStore()
      expect(getByRole('link', { name: 'Go to Businesses' })).toHaveAttribute('href', '/search')
    })

    it.each(['/missing', '/store?store=missing'])('recovers missing stores at %s with or without an address', (entry) => {
      const first = renderMissingStore(entry)
      expect(first.getByRole('link', { name: 'Choose an address' })).toHaveAttribute('href', '/')
      first.unmount()
      order.address = { location: { lat: 43.54, lng: -79.66 } }
      const second = renderMissingStore(entry)
      expect(second.getByRole('link', { name: 'Go to Businesses' })).toHaveAttribute('href', '/search')
    })

    it('keeps the general 404 for an entry without a store slug', () => {
      const { getByRole } = renderWithProviders(<BusinessProductsListing businessState={notFound} />, { initialEntries: ['/store/'] })
      expect(getByRole('heading', { name: 'PAGE NOT FOUND' })).toBeInTheDocument()
    })

    it('carries coordinates and order type from a search deep link', () => {
      const { getByRole } = renderMissingStore('/store/missing?lat=43.54&lng=-79.66&order_type=2&product=3')
      const link = getByRole('link', { name: 'Go to Businesses' })
      const url = new URL(link.href)
      expect(url.pathname).toBe('/search')
      expect(Object.fromEntries(url.searchParams)).toEqual({ lat: '43.54', lng: '-79.66', order_type: '2' })
    })

    it.each([[null, 2, true], [null, 9, false], [{ location: { lat: 40, lng: -70 } }, 2, false]])(
      'applies only a valid query type before searching, given address %j and type %s',
      async (address, type, shouldChange) => {
        order.address = address
        let finishChange
        order.changeType.mockImplementation(() => new Promise(resolve => { finishChange = resolve }))
        const LocationProbe = () => <output>{useLocation().pathname}</output>
        const view = renderWithProviders(
          <>
            <BusinessProductsListing slug='missing' businessState={notFound} />
            <LocationProbe />
          </>,
          { initialEntries: [`/store/missing?lat=43.54&lng=-79.66&order_type=${type}`] }
        )
        fireEvent.click(view.getByRole('link', { name: 'Go to Businesses' }))
        if (shouldChange) {
          expect(order.changeType).toHaveBeenCalledWith(2)
          expect(view.getByText('/store/missing')).toBeInTheDocument()
          finishChange()
        } else {
          expect(order.changeType).not.toHaveBeenCalled()
        }
        expect(await view.findByText('/search')).toBeInTheDocument()
      }
    )

    const renderPendingRecovery = (setAlertState = vi.fn()) => {
      const RouteControls = () => {
        const history = useHistory()
        const { pathname } = useLocation()
        return <><output>{pathname}</output><button type='button' onClick={() => history.push('/other')}>Other page</button></>
      }
      return renderWithProviders(
        <>
          <BusinessProductsListing slug='missing' businessState={notFound} setAlertState={setAlertState} />
          <RouteControls />
        </>,
        { initialEntries: ['/store/missing?lat=43.54&lng=-79.66&order_type=2'] }
      )
    }

    it('coalesces recovery clicks and leaves a later route in place', async () => {
      let finish
      order.changeType.mockImplementation(() => new Promise(resolve => { finish = resolve }))
      const view = renderPendingRecovery()
      const link = view.getByRole('link', { name: 'Go to Businesses' })
      fireEvent.click(link)
      fireEvent.click(link)
      expect(order.changeType).toHaveBeenCalledTimes(1)
      fireEvent.click(view.getByRole('button', { name: 'Other page' }))
      await act(async () => finish())
      expect(view.getByText('/other')).toBeInTheDocument()
      expect(view.queryByText('/search')).not.toBeInTheDocument()
    })

    it('offers a localized retry after a failed change of order type', async () => {
      const reportError = vi.fn()
      order.changeType.mockRejectedValueOnce(new Error('Storage quota'))
      const view = renderPendingRecovery(reportError)
      const link = view.getByRole('link', { name: 'Go to Businesses' })
      fireEvent.click(link)
      await waitFor(() => expect(reportError).toHaveBeenCalledWith({
        open: true, content: ['Please try again']
      }))
      expect(view.getByText('/store/missing')).toBeInTheDocument()
      order.changeType.mockResolvedValueOnce()
      fireEvent.click(link)
      expect(await view.findByText('/search')).toBeInTheDocument()
    })

    it('leaves the recovery link usable when a direct product link has no store', () => {
      const { getByRole, queryByRole } = renderWithProviders(
        <BusinessProductsListing slug='missing' categoryId='1' productId='2' businessState={notFound} />,
        { initialEntries: ['/store/missing?category=1&product=2'] }
      )
      expect(queryByRole('dialog')).not.toBeInTheDocument()
      const recovery = getByRole('link', { name: 'Choose an address' })
      recovery.focus()
      expect(recovery).toHaveFocus()
      fireEvent.click(recovery)
      expect(queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens a direct product link after the requested store is available', () => {
      const { getByRole } = renderWithProviders(
        <BusinessProductsListing slug={businessFixture.slug} categoryId='1' productId='2' />
      )
      expect(getByRole('dialog')).toBeInTheDocument()
    })

    it('offers an honest retry and a separate exit when the configured menu is still missing', () => {
      const theme = themeWithValues(values => {
        values.site.mode = 'single_store'
        values.site.business_slug = 'demo-store'
      })
      for (const entry of ['/store/missing', '/store/demo-store']) {
        const view = renderMissingStore(entry, theme, 'demo-store')
        expect(view.getByRole('link', { name: 'Please try again' })).toHaveAttribute('href', '/store/demo-store')
        expect(view.getByRole('link', { name: 'Site Map' })).toHaveAttribute('href', '/pages')
        view.unmount()
      }
    })

    it('a full website\'s store named `order` is offered at /store/order, not at the menu\'s /order', () => {
      const [{ site }] = useSite()
      const template = site.business_url_template
      site.business_url_template = '/:business_slug'
      try {
        const theme = themeWithValues(values => {
          values.site.mode = 'single_store'
          values.site.business_slug = 'order'
          values.site.experience = 'full_website'
        })
        const { getByRole } = renderMissingStore('/store/missing', theme)
        expect(getByRole('link', { name: 'Go to menu' })).toHaveAttribute('href', '/store/order')
      } finally {
        site.business_url_template = template
      }
    })

    it('offers the configured menu for a single-store site', () => {
      const theme = themeWithValues(values => {
        values.site.mode = 'single_store'
        values.site.business_slug = 'demo-store'
      })
      const { getByRole } = renderMissingStore('/store/missing', theme)
      expect(getByRole('link', { name: 'Go to menu' })).toHaveAttribute('href', '/store/demo-store')
    })
  })

  it('renders products layout when business is loaded', () => {
    const { getByTestId } = renderWithProviders(<BusinessProductsListing />)
    expect(getByTestId('render-products-layout')).toBeInTheDocument()
  })

  it('calls the progress hook once with the selected business cart and franchise', () => {
    renderWithProviders(<BusinessProductsListing franchiseId='brand-one' />)

    expect(freeDelivery.useFreeDeliveryProgress).toHaveBeenLastCalledWith({
      business: businessFixture,
      cart: order.cart,
      franchiseId: 'brand-one',
      enabled: true
    })
    expect(screen.getByTestId('render-products-layout')).toHaveAttribute('data-progress-status', 'progress')
  })

  it('uses the site\'s franchise when no controller franchise prop exists', () => {
    const theme = themeWithValues((values) => {
      values.site = { ...values.site, mode: 'franchise', franchise_slug: 'theme-brand' }
      return values
    })

    renderWithProviders(<BusinessProductsListing />, { theme })

    expect(freeDelivery.useFreeDeliveryProgress).toHaveBeenCalledWith(
      expect.objectContaining({ franchiseId: 'theme-brand' })
    )
  })

  it('renders compact progress above the mobile cart CTA and passes it into the modal cart', () => {
    renderWithProviders(<BusinessProductsListing />)

    const message = screen.getByText('Add $15 for free delivery')
    const viewCart = screen.getByRole('button', { name: 'View cart' })
    expect(message.compareDocumentPosition(viewCart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const callsBeforeOpeningCart = freeDelivery.useFreeDeliveryProgress.mock.calls.length
    fireEvent.click(viewCart)
    expect(screen.getByTestId('cart')).toHaveAttribute('data-progress-status', 'progress')
    expect(screen.queryByText('Add $15 for free delivery')).not.toBeInTheDocument()
    expect(freeDelivery.useFreeDeliveryProgress.mock.calls.length).toBeGreaterThan(callsBeforeOpeningCart)
    expect(freeDelivery.useFreeDeliveryProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ cart: order.cart })
    )
  })

  it('reserves the measured cart bar and mobile navigation height below products', () => {
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 116 })

    try {
      renderWithProviders(<BusinessProductsListing />)
      const products = screen.getByTestId('render-products-layout').closest('[data-doc-section="business-menu"]')
      expect(products).toHaveStyle({ paddingBottom: '197px' })
    } finally {
      measure.mockRestore()
    }
  })

  it('visibility cart.free_delivery_progress hides the compact progress of the cart bar (the cart\'s own places)', () => {
    const theme = themeWithValues((values) => { values.visibility['cart.free_delivery_progress'] = false; return values })
    renderWithProviders(<BusinessProductsListing />, { theme })
    expect(screen.getByRole('button', { name: 'View cart' })).toBeInTheDocument()
    expect(screen.queryByText('Add $15 for free delivery')).not.toBeInTheDocument()
  })

  it('visibility business.cart_bar hides the bar with the total and "View cart" (and its room below the products)', () => {
    const theme = themeWithValues((values) => { values.visibility['business.cart_bar'] = false; return values })
    renderWithProviders(<BusinessProductsListing />, { theme })
    expect(screen.queryByRole('button', { name: 'View cart' })).not.toBeInTheDocument()
    expect(screen.queryByText('Add $15 for free delivery')).not.toBeInTheDocument()
    const products = screen.getByTestId('render-products-layout').closest('[data-doc-section="business-menu"]')
    expect(products.style.paddingBottom).toBe('')
  })

  it('keeps the unconfirmed offer visible above the mobile cart CTA', () => {
    freeDelivery.useFreeDeliveryProgress.mockReturnValue({ status: 'unconfirmed', minimum: 25 })
    renderWithProviders(<BusinessProductsListing />)
    const message = screen.getByText('Free delivery has not been applied to this cart yet')
    const viewCart = screen.getByRole('button', { name: 'View cart' })
    expect(message.compareDocumentPosition(viewCart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the existing desktop cart CTA operable and passes progress into its modal', async () => {
    viewport.width = 1280
    viewport.height = 800
    renderWithProviders(<BusinessProductsListing />, { theme: classicStoreTheme() })

    const viewCart = screen.getByRole('button', { name: 'View cart' })
    expect(screen.getByText('Add $15 for free delivery')).toBeInTheDocument()

    fireEvent.click(viewCart)

    expect(screen.getByTestId('cart')).toHaveAttribute('data-progress-status', 'progress')
    // the base dialog, named by the title its content hands it; its close closes it
    const dialog = await screen.findByRole('dialog', { name: 'Your cart' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('disables free-delivery lookup in kiosk mode', () => {
    renderWithProviders(<BusinessProductsListing useKioskApp />)

    expect(freeDelivery.useFreeDeliveryProgress).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    )
  })
})

describe('BusinessProductsListing: the back arrow to the list', () => {
  const backArrow = () => document.getElementById('back-arrow')

  beforeEach(() => {
    window.localStorage.removeItem('single_business')
  })

  // the business's fixed name bar has it too (BusinessStickyHeader onBack)
  const barBack = (getByTestId) => getByTestId('render-products-layout').getAttribute('data-back')

  it('shown by default, a link to the list, in the fixed name bar too', () => {
    const { getByTestId } = renderWithProviders(<BusinessProductsListing />, { theme: themeWithValues() })
    expect(backArrow()).not.toBeNull()
    expect(backArrow().getAttribute('href')).toBe('/search')
    expect(barBack(getByTestId)).toBe('function')
  })

  it('visibility business.back hides it', () => {
    renderWithProviders(<BusinessProductsListing />, {
      theme: themeWithValues((values) => {
        values.visibility['business.back'] = false
        return values
      })
    })
    expect(backArrow()).toBeNull()
  })

  it('no arrow when the list redirected to its only store, nor in the fixed name bar', () => {
    window.localStorage.setItem('single_business', true)
    const { getByTestId } = renderWithProviders(<BusinessProductsListing />, { theme: themeWithValues() })
    expect(backArrow()).toBeNull()
    expect(barBack(getByTestId)).toBe('object')
  })
})

// implementation notesin the direct menu the cart is always on the page, so an add does not open the header's drawer; the
// page tells the header where the cart is, and the bar (no panel) answers an add with a short animation
describe('BusinessProductsListing: where the cart is kept in sight', () => {
  const bar = () => document.querySelector('[data-doc-section="business-cart-bar"]')
  // the global EventContext mock keeps the handlers it was given: this plays an event to them
  const [events] = useEvent()
  const emit = (name, ...args) => act(() => {
    events.on.mock.calls.filter(([event]) => event === name).forEach(([, handler]) => handler(...args))
  })
  const themeNoBar = () => themeWithValues((values) => { values.visibility['business.cart_bar'] = false; return values })

  beforeEach(() => {
    events.on.mockClear()
    freeDelivery.useFreeDeliveryProgress.mockReset()
    freeDelivery.useFreeDeliveryProgress.mockReturnValue(freeDelivery.state)
  })

  it.each([
    ['the direct menu on a phone: the bar', 375, undefined, 'bar'],
    ['the direct menu from the desktop cut: the panel beside the menu', 1280, undefined, 'aside'],
    ['the direct menu at an intermediate width: the bar', 900, undefined, 'bar'],
    ['the direct menu with the bar hidden by the theme and no panel: none (the drawer opens as ever)', 375, themeNoBar, null],
    ['the classic design (A): none', 1280, classicStoreTheme, null],
    // implementation notes
    ['the direct menu without the cart column from the desktop cut: the header\'s drawer', 1280, noCartColumnStoreTheme, 'header'],
    ['the direct menu without the cart column on a phone: the bar', 375, noCartColumnStoreTheme, 'bar'],
    ['the direct menu without the cart column at an intermediate width: the bar', 900, noCartColumnStoreTheme, 'bar'],
    ['the direct menu without the cart column, bar hidden by the theme, on a phone: none', 375, () => themeWithValues((values) => { values.components.store_page.base.template = 'menu_index_no_cart'; values.visibility['business.cart_bar'] = false; return values }), null],
    ['the direct menu without the cart column when the theme hides the header\'s cart: it keeps the panel', 1280, () => themeWithValues((values) => { values.components.store_page.base.template = 'menu_index_no_cart'; values.visibility['header.cart'] = false; return values }), 'aside']
  ])('%s', (_name, width, theme, expected) => {
    viewport.width = width
    renderWithProviders(<BusinessProductsListing />, { theme: theme?.() })
    expect(storeCartInPage()).toBe(expected)
  })

  it('clears it when the store page unmounts', () => {
    viewport.width = 1280
    const { unmount } = renderWithProviders(<BusinessProductsListing />)
    expect(storeCartInPage()).toBe('aside')
    unmount()
    expect(storeCartInPage()).toBeNull()
  })

  it('the bar answers each add or update, restarting its animation without remounting', () => {
    viewport.width = 375
    renderWithProviders(<BusinessProductsListing />)
    const node = bar()
    expect(node).not.toHaveAttribute('data-cart-pulse')
    emit('cart_product_added', { id: 10 }, order.cart)
    expect(bar()).toBe(node)
    expect(node).toHaveAttribute('data-cart-pulse', '1')
    emit('cart_product_updated', { id: 10 }, order.cart)
    expect(node).toHaveAttribute('data-cart-pulse', '0')
    // "View cart" still opens the sheet
    fireEvent.click(screen.getByRole('button', { name: 'View cart' }))
    expect(screen.getByTestId('cart')).toBeInTheDocument()
  })

  // implementation notesthe bar is the phone's; from the desktop cut the direct menu has the panel or the header's drawer
  it.each([
    ['the direct menu', undefined, 1280, false],
    ['the direct menu without the cart column', noCartColumnStoreTheme, 1280, false],
    ['the direct menu without the cart column on a phone', noCartColumnStoreTheme, 375, true],
    ['the classic design on the desktop (it keeps its bar)', classicStoreTheme, 1280, true]
  ])('the "View cart" bar: %s', (_name, theme, width, shown) => {
    viewport.width = width
    renderWithProviders(<BusinessProductsListing />, { theme: theme?.() })
    expect(Boolean(bar())).toBe(shown)
  })

  it('the classic design has no bar animation', () => {
    viewport.width = 375
    renderWithProviders(<BusinessProductsListing />, { theme: classicStoreTheme() })
    emit('cart_product_added', { id: 10 }, order.cart)
    expect(bar()).not.toHaveAttribute('data-cart-pulse')
  })
})
