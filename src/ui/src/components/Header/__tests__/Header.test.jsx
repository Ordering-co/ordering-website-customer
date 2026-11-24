import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { defaultTheme, renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { getThemeCss } from '~/utils/themeCss'
import { orderWithAddressFixture, sessionUserFixture } from '../../__tests__/helpers/shellTestMocks'
import { Header } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { themedScroll } from './scrollTheme'
import { scopedTheme } from '~/utils/themeGroups'
import { clippedBy } from './touchArea'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { setStoreCartInPage } from '~/utils/storeCartInPage'

const windowSize = vi.hoisted(() => ({ width: 1024, height: 768 }))
const mockGetDistance = vi.hoisted(() => vi.fn(() => 0))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => windowSize
}))
vi.mock('~ui/utils', () => ({
  getTraduction: (_key, fallback) => fallback,
  formatSeconds: (seconds) => `${seconds}s`,
  sortInputFields: ({ values } = {}) => Array.isArray(values) ? values : [],
  checkSiteUrl: (url, fallback) => url || fallback,
  capitalize: (str) => str,
  verifyDecimals: (rate) => `${rate}`,
  getIconCard: () => null,
  getHourMin: () => '0h 0m',
  getOrderStatusPrefix: () => '',
  getDistance: (...args) => mockGetDistance(...args),
  getCateringValues: () => ({}),
  shape: {},
  generalUtilities: () => ({}),
  orderTypeList: [],
  scrollTo: vi.fn(),
  getTimes: () => [],
  reviewCommentList: () => ({ like: [], dislike: [] })
}))
vi.mock('../../../../config', () => ({
  default: { franchiseSlug: null, businessSlug: null }
}))
vi.mock('~/utils/publicAssetUrl', () => ({
  // '' stays '': a white-label site without a logo must get no <img>, not a placeholder
  publicAssetUrl: (value) => value || ''
}))
vi.mock('~ui/src/components/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid='language-selector' />
}))
vi.mock('~ui/src/components/HeaderOption', () => ({
  HeaderOption: ({ variant, onClick }) => (
    <button type='button' data-testid={`header-option-${variant}`} onClick={() => onClick?.(variant)}>
      {variant}
    </button>
  )
}))
vi.mock('~ui/src/components/AddressOrderType', () => ({
  AddressOrderType: () => <div data-testid='address-order-type' />
}))
// The lazy children: the side menu (it takes isHideSignup) and the cart
// popover (its hideButton) say which they are
vi.mock('@loadable/component', () => ({
  default: () => {
    const Lazy = (props) => (
      <div
        data-testid='lazy-header-child'
        {...('isHideSignup' in props && { 'data-sidebar': '' })}
        {...('hideButton' in props && { 'data-cart-popover': String(!!props.hideButton), 'data-cart-open': String(!!props.open) })}
      >
        {'hideButton' in props && <button type='button' aria-hidden data-testid='cart-popover-click' onClick={props.onClick} />}
        {/* the header's moment picker: it says when its Save is in flight */}
        {props.isHeader && (
          <>
            <button type='button' onClick={() => props.onBusyChange?.(true)}>start saving</button>
            <button type='button' onClick={() => props.onBusyChange?.(false)}>end saving</button>
          </>
        )}
      </div>
    )
    // the real one preloads its chunk (the header's cart does it on hover, focus and touch)
    Lazy.preload = () => Promise.resolve()
    return Lazy
  }
}))

// the dialogs load on their first opening (lazyOverlay, loadable is mocked above): the real overlays here
vi.mock('~ui/src/components/Overlay/lazyOverlay', async () => {
  const { DialogOverlay, SheetOverlay } = await import('~ui/src/components/Overlay/overlays')
  return { LazyDialog: DialogOverlay, LazySheet: SheetOverlay }
})
// the base dialog (Base UI opens it a tick later, in a portal), not the legacy modal
const findDialog = async () => {
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
  expect(document.querySelector('#app-modals .popup-component')).toBeNull()
  return dialog
}

const emit = vi.hoisted(() => vi.fn())
const eventHandlers = vi.hoisted(() => ({}))

vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{
    emit,
    on: vi.fn((event, handler) => { eventHandlers[event] = handler }),
    off: vi.fn()
  }]
}))

const sessionState = vi.hoisted(() => ({
  auth: false,
  user: null,
  token: null
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [sessionState, { login: vi.fn() }]
}))

const orderActions = vi.hoisted(() => ({
  refreshOrderOptions: vi.fn(),
  changeAddress: vi.fn(),
  clear: vi.fn()
}))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderWithAddressFixture, orderActions]
}))

vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: null, loading: false }, { deleteUserCustomer: vi.fn() }]
}))

describe('Header', () => {
  beforeEach(() => {
    emit.mockClear()
    mockGetDistance.mockReturnValue(0)
    windowSize.width = 1024
    windowSize.height = 768
    sessionState.auth = false
    sessionState.user = null
    sessionState.token = null
    window.localStorage.clear()
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          success?.({ coords: { latitude: 40.71, longitude: -74.0 } })
        })
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders login action for guests on home', () => {
    const { getByText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home' }
    )
    expect(getByText('Login')).toBeInTheDocument()
  })

  it('renders address header option on search for guests', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(getByText('Login')).toBeInTheDocument()
    expect(getByText('123 Main St').closest('button')).toBeInTheDocument()
    expect(getByTestId('language-selector')).toBeInTheDocument()
  })

  it('opens login modal from Login link', async () => {
    const { getByText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home' }
    )
    fireEvent.click(getByText('Login'))
    await findDialog()
  })

  it('opens address modal from header option', async () => {
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByText('123 Main St').closest('button'))
    await findDialog()
  })

  it('opens signup modal from Sign up button', async () => {
    const { getByText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home' }
    )
    fireEvent.click(getByText('Sign up'))
    await findDialog()
  })

  it('the login dialog keeps its doc section, and its close closes it', async () => {
    const { getByText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home' }
    )
    fireEvent.click(getByText('Login'))
    const dialog = await findDialog()
    expect(dialog).toHaveAttribute('data-doc-section', 'header-authentication-dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renders lazy shell children and address selector for authed search', () => {
    sessionState.auth = true
    sessionState.user = sessionUserFixture
    sessionState.token = 'token'
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(getAllByTestId('lazy-header-child').length).toBeGreaterThan(0)
    expect(getByTestId('address-order-type')).toBeInTheDocument()
  })

  it('emits navigation when logo is clicked', () => {
    const theme = themeWithValues((values) => {
      values.images.logotype = 'https://cdn.test/logo.png'
      return values
    })
    const { getAllByAltText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home', theme }
    )
    fireEvent.click(getAllByAltText('Logo')[0].parentElement)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('opens address modal when require_order_address event fires', async () => {
    renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    eventHandlers.require_order_address?.()
    await findDialog()
  })

  it('require_order_address with orderType 1 opens the modal; with orderType 2 it does not', async () => {
    renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    eventHandlers.require_order_address?.({ orderType: 2 })
    expect(screen.queryByRole('dialog')).toBeNull()
    eventHandlers.require_order_address?.({ orderType: 1 })
    await findDialog()
  })

  it('shows customer name in customer mode', () => {
    window.localStorage.setItem('user-customer', JSON.stringify({ id: 2, name: 'Alex', lastname: 'Customer' }))
    const { getByText } = renderWithProviders(
      <Header isCustomerMode location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(getByText('Alex Customer')).toBeInTheDocument()
  })

  it('shows saved address on search submenu', () => {
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(getByText('123 Main St')).toBeInTheDocument()
  })

  describe('the customer\'s address field by order type', () => {
    afterEach(() => {
      orderWithAddressFixture.options.type = 1
    })

    it('order type 1 (delivery) shows it; order type 2 (pickup) hides it', () => {
      orderWithAddressFixture.options.type = 1
      const { queryByText, rerender } = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/search' }} />,
        { initialEntries: ['/search'], routePath: '/search' }
      )
      expect(queryByText('123 Main St')).toBeInTheDocument()

      orderWithAddressFixture.options.type = 2
      rerender(<Header isHome={false} location={{ pathname: '/search' }} />)
      expect(queryByText('123 Main St')).toBeNull()
    })

    it('re-render 2 → 1 → 2: the field appears then disappears, without clearing the saved address', () => {
      orderWithAddressFixture.options.type = 2
      const { queryByText, rerender } = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/search' }} />,
        { initialEntries: ['/search'], routePath: '/search' }
      )
      expect(queryByText('123 Main St')).toBeNull()

      orderWithAddressFixture.options.type = 1
      rerender(<Header isHome={false} location={{ pathname: '/search' }} />)
      expect(queryByText('123 Main St')).toBeInTheDocument()

      orderWithAddressFixture.options.type = 2
      rerender(<Header isHome={false} location={{ pathname: '/search' }} />)
      expect(queryByText('123 Main St')).toBeNull()

      expect(orderActions.changeAddress).not.toHaveBeenCalled()
      expect(orderActions.clear).not.toHaveBeenCalled()
    })
  })

  it('opens cart modal for authenticated users on mobile', async () => {
    windowSize.width = 500
    sessionState.auth = true
    sessionState.user = sessionUserFixture
    const { getByTestId } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByTestId('header-option-cart'))
    await findDialog()
  })

  it('opens moment modal from the header once it has the moment (1024px)', async () => {
    windowSize.width = 1024
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByText('ASAP').closest('button'))
    await findDialog()
  })

  // implementation notesclosing and reopening while the Save is in flight let the old Save close the new picker
  it('the moment modal cannot be closed while its Save is in flight: no X, Escape does nothing; after it, it closes', async () => {
    windowSize.width = 1024
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByText('ASAP').closest('button'))
    const dialog = await findDialog()
    fireEvent.click(getByText('start saving'))
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 })
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(getByText('end saving'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  // coordinator verify: the header's ASAP had no clock icon,
  // unlike the mobile capsule's — same look at every width
  it('the header\'s ASAP carries the clock icon, like the mobile capsule\'s', () => {
    windowSize.width = 1024
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    const moment = getByText('ASAP').closest('button')
    expect(moment.querySelector('svg.lucide-clock')).toHaveAttribute('aria-hidden', 'true')
  })

  // implementation notesthe header's ASAP was the input's text (16px) and a clock of
  // that size, beside tabs of 14px and a 20px icon: the capsule's items read
  // the tabs' label text and icon size (the header's group)
  it('the header\'s ASAP has the tabs\' label text and icon size, in the inactive tabs\' color', () => {
    windowSize.width = 1024
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    const moment = getByText('ASAP').closest('button')
    const tabs = getThemeCss(defaultTheme, 'tabs')
    expect(moment.style.getPropertyValue('--ui-tabs-text-size')).toBe(tabs.base.text.size)
    expect(moment.style.getPropertyValue('--ui-tabs-text-weight')).toBe(String(tabs.base.text.weight))
    expect(moment.style.getPropertyValue('--ui-capsule-inactive-color')).toBe(tabs.variants[tabs.base.variant].inactive)
    expect(moment.style.getPropertyValue('--ui-tabs-icon-size')).toBe(tabs.sizes.md.icon_size)
  })

  it('the address pin is the design system\'s Lucide icon', () => {
    windowSize.width = 1100
    const { container } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(container.querySelector('svg.lucide-map-pin')).not.toBeNull()
    // and the size of the clock and the tabs' icons, not a 16px of its own
    const tabs = getThemeCss(defaultTheme, 'tabs')
    expect(container.querySelector('svg.lucide-map-pin').closest('button').style.getPropertyValue('--ui-tabs-icon-size')).toBe(tabs.sizes.md.icon_size)
  })

  it('opens address map modal from pin map control', async () => {
    const { getByRole } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(document.querySelector('.address-map-icon')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Businesses Map' }))
    const dialog = await findDialog()
    expect(dialog.querySelector('.address-map-icon img')).toHaveAttribute('width', '264')
  })

  it('navigates to the map and closes the address dialog from its Explore Button', async () => {
    const { getByRole } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByRole('button', { name: 'Businesses Map' }))
    const dialog = await findDialog()
    const explore = within(dialog).getByRole('button', { name: 'Explore' })
    expect(explore).toHaveAttribute('data-slot', 'button')
    fireEvent.click(explore)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business_search', search: '?view=map' })
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
  })

  it('keeps the header and Explore available when the map artwork fails and retries the request', async () => {
    renderWithProviders(<Header isHome={false} location={{ pathname: '/search' }} />, {
      initialEntries: ['/search'], routePath: '/search'
    })
    fireEvent.click(screen.getByRole('button', { name: 'Businesses Map' }))
    const dialog = await findDialog()
    const first = dialog.querySelector('.address-map-icon img')
    expect(first).toBeInTheDocument()
    const url = first.getAttribute('src')
    fireEvent.error(first)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Error')
    expect(within(dialog).getByRole('button', { name: 'Explore' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Please try again' }))
    const retry = dialog.querySelector('.address-map-icon img')
    expect(retry.getAttribute('src')).not.toBe(url)
    fireEvent.load(retry)
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(retry).toBeVisible()
    expect(screen.getByRole('button', { name: 'Businesses Map', hidden: true })).toBeInTheDocument()
  })

  it('cancels the map while the illustration is pending and returns focus to its opener', async () => {
    renderWithProviders(<Header isHome={false} location={{ pathname: '/search' }} />, {
      initialEntries: ['/search'], routePath: '/search'
    })
    const opener = screen.getByRole('button', { name: 'Businesses Map' })
    const nextControl = screen.getByRole('button', { name: 'Login' })
    opener.focus()
    act(() => {
      fireEvent.click(opener)
      nextControl.focus()
    })
    const dialog = await findDialog()
    const artwork = dialog.querySelector('.address-map-icon img')
    const close = within(dialog).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Escape' })
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
    fireEvent.load(artwork)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([true, false])('returns focus after the map opener is removed on resize (signed in: %s)', async auth => {
    windowSize.width = 900
    sessionState.auth = auth
    sessionState.user = auth ? sessionUserFixture : null
    const header = () => <Header isHome={false} location={{ pathname: '/search' }} />
    const view = renderWithProviders(header(), { initialEntries: ['/search'], routePath: '/search' })
    const opener = screen.getByRole('button', { name: 'Businesses Map' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = await findDialog()

    windowSize.width = 760
    view.rerender(header())
    expect(opener).not.toBeInTheDocument()
    const target = auth
      ? screen.getByRole('button', { name: 'Businesses Map', hidden: true })
      // no map pin without a session: focus lands on the header's own control, its cart
      : screen.getByTestId('header-option-cart')
    const close = within(dialog).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Escape' })
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    await waitFor(() => expect(target).toHaveFocus())
  })

  it('redirects to home when login is clicked in customer mode', () => {
    const { getByText } = renderWithProviders(
      <Header isCustomerMode location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    fireEvent.click(getByText('Login'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('shows far away warning on search when geolocation is distant', async () => {
    mockGetDistance.mockReturnValue(25)
    const { findAllByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect((await findAllByText(/Is this the right address/)).length).toBeGreaterThan(0)
  })

  it('asks for no position on checkout for a pickup order, and does for delivery', () => {
    const at = (type) => {
      orderWithAddressFixture.options.type = type
      navigator.geolocation.getCurrentPosition.mockClear()
      const view = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/checkout/abc' }} />,
        { initialEntries: ['/checkout/abc'], routePath: '/checkout/:cartUuid' }
      )
      const asked = navigator.geolocation.getCurrentPosition.mock.calls.length > 0
      view.unmount()
      return asked
    }
    try {
      expect(at(2)).toBe(false)
      expect(at(1)).toBe(true)
    } finally {
      orderWithAddressFixture.options.type = 1
    }
  })

  it('renders only the logo in tracking-only mode and sends the logo home', () => {
    const theme = themeWithValues((values) => {
      values.images.logotype = 'https://cdn.test/logo.png'
      return values
    })
    const { queryByText, queryByTestId, getAllByAltText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/orders/1' }} isTrackingOnly />,
      { initialEntries: ['/orders/1'], routePath: '/orders/1', theme }
    )
    expect(queryByText('Login')).toBeNull()
    expect(queryByText('Sign up')).toBeNull()
    expect(queryByTestId('address-order-type')).toBeNull()
    expect(queryByTestId('language-selector')).toBeNull()
    expect(queryByTestId('lazy-header-child')).toBeNull()
    // above the fold: loaded at once, sized by the header's logo box (no height of its own)
    getAllByAltText('Logo').forEach((logo) => {
      expect(logo).toHaveAttribute('loading', 'eager')
      expect(logo).not.toHaveAttribute('height')
    })
    fireEvent.click(getAllByAltText('Logo')[0])
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('navigates to single store when logo is clicked on single-store theme', () => {
    const theme = themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'demo-burger'
      values.images.logotype = 'https://cdn.test/logo.png'
      return values
    })
    const { getAllByAltText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home', theme }
    )
    fireEvent.click(getAllByAltText('Logo')[0].parentElement)
    expect(emit).toHaveBeenCalledWith('go_to_page', {
      page: 'business',
      params: { business_slug: 'demo-burger' }
    })
  })

  it('the order context moves up into the row all at once, from 1024px', () => {
    const at = (width) => {
      windowSize.width = width
      const view = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/search' }} />,
        { initialEntries: ['/search'], routePath: '/search' }
      )
      const has = {
        type: !!view.queryByTestId('address-order-type'),
        moment: !!view.queryByText('ASAP'),
        address: !!view.queryByText('123 Main St')
      }
      view.unmount()
      return has
    }
    expect(at(700)).toEqual({ type: false, moment: false, address: false })
    expect(at(800)).toEqual({ type: false, moment: false, address: false })
    expect(at(900)).toEqual({ type: false, moment: false, address: false })
    expect(at(1023)).toEqual({ type: false, moment: false, address: false })
    expect(at(1024)).toEqual({ type: true, moment: true, address: true })
  })

  it('the order context capsule: one surface (role=group) holds the type, the moment and the address', () => {
    windowSize.width = 1024
    const { getByTestId, getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    const capsule = getByTestId('address-order-type').closest('[role="group"]')
    expect(capsule).not.toBeNull()
    expect(capsule.contains(getByText('ASAP'))).toBe(true)
    expect(capsule.contains(getByText('123 Main St'))).toBe(true)
  })
})

describe('Header — its controls are real buttons', () => {
  beforeEach(() => {
    windowSize.width = 1024
    sessionState.auth = false
  })

  const renderSearch = (theme) => renderWithProviders(
    <Header isHome={false} location={{ pathname: '/search' }} />,
    { initialEntries: ['/search'], routePath: '/search', theme }
  )

  it('the map pin is a button with a name, it opens the map modal', async () => {
    const { getByRole } = renderSearch(themeWithValues())
    const pin = getByRole('button', { name: 'Businesses Map' })
    expect(pin.tagName).toBe('BUTTON')
    expect(pin).toHaveAttribute('type', 'button')
    fireEvent.click(pin)
    await findDialog()
  })

  it('the moment is a button that opens a dialog', () => {
    const { getByText } = renderSearch(themeWithValues())
    const moment = getByText('ASAP').closest('button')
    expect(moment).toBeTruthy()
    expect(moment).toHaveAttribute('aria-haspopup', 'dialog')
    expect(moment).not.toBeDisabled()
  })

  it('the logo is a button named by where it goes', () => {
    const { getByRole } = renderSearch(themeWithValues((values) => {
      values.images.logotype = 'https://cdn.test/logo.png'
      return values
    }))
    expect(getByRole('button', { name: 'Go to home' })).toBeInTheDocument()
  })
})

describe('Header — its parts the theme hides (visibility.header.*)', () => {
  // a theme with these visibility keys; a configured logo (these tests are
  // about visibility, not about the white-label-without-a-logo fallback)
  const themedWith = (keys = {}) => {
    const theme = themeWithValues((values) => {
      values.images.logotype = 'https://cdn.test/logo.png'
      Object.assign(values.visibility, keys)
      return values
    })
    return theme
  }
  // one header on the page at a time (its queries are the page's)
  const renderSearch = (theme, props = {}) => {
    cleanup()
    return renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} {...props} />,
      { initialEntries: ['/search'], routePath: '/search', theme }
    )
  }
  const geolocation = vi.fn((success) => success?.({ coords: { latitude: 40.71, longitude: -74.0 } }))

  beforeEach(() => {
    windowSize.width = 1024
    sessionState.auth = false
    sessionState.user = null
    mockGetDistance.mockReturnValue(0)
    Object.defineProperty(global.navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: geolocation } })
    geolocation.mockClear()
  })

  it('every key is in the schema, visible by default', () => {
    const keys = ['menu_toggle', 'logo', 'map', 'cart', 'login', 'signup', 'far_away', 'language_selector']
    keys.forEach((key) => expect(schemaDefault(`visibility.header.${key}`)).toBe(true))
  })

  it('by default every part shows', () => {
    const { container, getByRole, getByText, getByTestId } = renderSearch(themedWith())
    expect(container.querySelector('[data-sidebar]')).toBeTruthy()
    expect(getByRole('button', { name: 'Go to home' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Businesses Map' })).toBeInTheDocument()
    expect(getByText('Login')).toBeInTheDocument()
    expect(getByText('Sign up')).toBeInTheDocument()
    expect(getByTestId('language-selector')).toBeInTheDocument()
  })

  it('header.menu_toggle: hides the side menu; the default keeps it', () => {
    expect(renderSearch(themedWith({ 'header.menu_toggle': false })).container.querySelector('[data-sidebar]')).toBeNull()
    expect(renderSearch(themedWith()).container.querySelector('[data-sidebar]')).toBeTruthy()
  })

  it('header.logo: hides the logo (also in tracking-only); the default keeps it', () => {
    expect(renderSearch(themedWith({ 'header.logo': false })).queryByRole('button', { name: 'Go to home' })).toBeNull()
    expect(renderSearch(themedWith({ 'header.logo': false }), { isTrackingOnly: true }).queryByRole('button', { name: 'Go to home' })).toBeNull()
    expect(renderSearch(themedWith()).getAllByAltText('Logo').length).toBeGreaterThan(0)
  })

  it('offers a keyboard exit when the checkout footer covers navigation and both header exits are absent', () => {
    windowSize.width = 390
    const pathname = '/checkout/test-cart'
    const theme = themedWith({ 'header.menu_toggle': false, 'header.logo': false, footer: false })
    const scene = (covered) => (
      <>
        <Header location={{ pathname }} />
        {covered && <div data-bottom-nav-cover='' />}
      </>
    )
    const { container, rerender } = renderWithProviders(scene(true), { initialEntries: [pathname], theme })
    const exit = container.querySelector('[data-doc-control="checkout-home-exit"]')
    expect(exit).toBeVisible()
    exit.focus()
    expect(exit).toHaveFocus()
    fireEvent.click(exit)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
    rerender(scene(false))
    expect(exit).not.toBeVisible()
  })

  it('header.map: hides the map pin, on wide and narrow screens; the default keeps it', () => {
    expect(renderSearch(themedWith({ 'header.map': false })).queryByRole('button', { name: 'Businesses Map' })).toBeNull()
    windowSize.width = 500
    sessionState.auth = true
    sessionState.user = sessionUserFixture
    expect(renderSearch(themedWith({ 'header.map': false })).queryByRole('button', { name: 'Businesses Map' })).toBeNull()
    expect(renderSearch(themedWith()).getByRole('button', { name: 'Businesses Map' }).querySelector('svg.lucide-map-pinned')).not.toBeNull()
  })

  it('header.login / header.signup: hides each one; the default keeps both', () => {
    const noLogin = renderSearch(themedWith({ 'header.login': false }))
    expect(noLogin.queryByText('Login')).toBeNull()
    expect(noLogin.getByText('Sign up')).toBeInTheDocument()
    const noSignup = renderSearch(themedWith({ 'header.signup': false }))
    expect(noSignup.queryByText('Sign up')).toBeNull()
    expect(noSignup.getByText('Login')).toBeInTheDocument()
    const shown = renderSearch(themedWith())
    expect(shown.getByText('Login')).toBeInTheDocument()
    expect(shown.getByText('Sign up')).toBeInTheDocument()
  })

  it('header.far_away: hides the warning and asks for no position; the default keeps it', async () => {
    mockGetDistance.mockReturnValue(25)
    const hidden = renderSearch(themedWith({ 'header.far_away': false }))
    expect(geolocation).not.toHaveBeenCalled()
    expect(hidden.queryByText(/Is this the right address/)).toBeNull()
    const shown = renderSearch(themedWith())
    expect((await shown.findAllByText(/Is this the right address/)).length).toBeGreaterThan(0)
  })

  it('header.language_selector hides it', () => {
    expect(renderSearch(themedWith({ 'header.language_selector': false })).queryByTestId('language-selector')).toBeNull()
    expect(renderSearch(themedWith()).getByTestId('language-selector')).toBeInTheDocument()
  })

  describe('header.cart', () => {
    beforeEach(() => {
      sessionState.auth = true
      sessionState.user = sessionUserFixture
    })

    it('wide screens: the cart popover stays without its button', () => {
      expect(renderSearch(themedWith({ 'header.cart': false })).container.querySelector('[data-cart-popover]').dataset.cartPopover).toBe('true')
      expect(renderSearch(themedWith()).container.querySelector('[data-cart-popover]').dataset.cartPopover).toBe('false')
      expect(renderSearch(themedWith()).container.querySelector('[data-cart-popover]').dataset.cartPopover).toBe('false')
    })

    it('narrow screens: no cart button, and header_cart_open still opens the cart', async () => {
      windowSize.width = 500
      const innerWidth = window.innerWidth
      window.innerWidth = 500
      const { queryByTestId } = renderSearch(themedWith({ 'header.cart': false }))
      expect(queryByTestId('header-option-cart')).toBeNull()
      eventHandlers.header_cart_open?.()
      await findDialog()
      window.innerWidth = innerWidth
    })

    // implementation notesthe direct menu keeps its cart in a panel beside the menu; the icon takes the person there
    describe('a store page with its cart panel beside the menu', () => {
      const aside = () => document.querySelector('[data-doc-section="business-cart-aside"]')
      beforeEach(() => {
        document.body.insertAdjacentHTML('beforeend', '<aside data-doc-section="business-cart-aside" tabindex="-1"></aside>')
      })
      afterEach(() => {
        aside()?.remove()
        setStoreCartInPage(null)
      })

      it('the cart icon focuses the panel and does not open the drawer', () => {
        setStoreCartInPage('aside')
        const { getByTestId, container } = renderSearch(themedWith())
        fireEvent.click(getByTestId('cart-popover-click'))
        expect(document.activeElement).toBe(aside())
        expect(container.querySelector('[data-cart-popover]').dataset.cartOpen).toBe('false')
      })

      it('header_cart_open (the store bar\'s cart) goes to the panel too, with no dialog', () => {
        setStoreCartInPage('aside')
        renderSearch(themedWith())
        act(() => { eventHandlers.header_cart_open?.() })
        expect(document.activeElement).toBe(aside())
        expect(screen.queryByRole('dialog')).toBeNull()
      })

      it('without the panel on the page (another design, or narrow) the icon opens the drawer as ever', () => {
        const { getByTestId, container } = renderSearch(themedWith())
        fireEvent.click(getByTestId('cart-popover-click'))
        expect(container.querySelector('[data-cart-popover]').dataset.cartOpen).toBe('true')
        expect(document.activeElement).not.toBe(aside())
      })

      // implementation notesthe direct menu without the cart column; only `aside` takes the person to a panel
      it('with the cart in the header\'s drawer (header) the icon opens it, panel or not', () => {
        setStoreCartInPage('header')
        const { getByTestId, container } = renderSearch(themedWith())
        fireEvent.click(getByTestId('cart-popover-click'))
        expect(container.querySelector('[data-cart-popover]').dataset.cartOpen).toBe('true')
        expect(document.activeElement).not.toBe(aside())
      })

      it('the page says aside but the panel is not rendered (loading): the icon opens the drawer', () => {
        aside().remove()
        setStoreCartInPage('aside')
        const { getByTestId, container } = renderSearch(themedWith())
        fireEvent.click(getByTestId('cart-popover-click'))
        expect(container.querySelector('[data-cart-popover]').dataset.cartOpen).toBe('true')
      })
    })

    it('narrow screens: the default shows the button', () => {
      windowSize.width = 500
      expect(renderSearch(themedWith()).getByTestId('header-option-cart')).toBeInTheDocument()
    })
  })
})

describe('Header — the order context the theme hides (visibility.order_context.*)', () => {
  const themedWith = (keys = {}) => themeWithValues((values) => {
    Object.assign(values.visibility, keys)
    return values
  })
  // the row's controls at 1024px (all three are in it by default)
  const controls = (keys) => {
    cleanup()
    windowSize.width = 1024
    const view = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search', theme: themedWith(keys) }
    )
    return {
      type: !!view.queryByTestId('address-order-type'),
      moment: !!view.queryByText('ASAP'),
      address: !!view.queryByText('123 Main St')
    }
  }

  beforeEach(() => {
    sessionState.auth = false
    sessionState.user = null
  })

  it('the keys are in the schema, shown by default', () => {
    ['order_type', 'moment', 'address'].forEach((key) => expect(schemaDefault(`visibility.order_context.${key}`)).toBe(true))
    expect(controls()).toEqual({ type: true, moment: true, address: true })
  })

  it('order_context.order_type hides the order type of the row', () => {
    expect(controls({ 'order_context.order_type': false })).toEqual({ type: false, moment: true, address: true })
  })

  it('order_context.moment hides the moment of the row', () => {
    expect(controls({ 'order_context.moment': false })).toEqual({ type: true, moment: false, address: true })
  })

  it('order_context.address hides the address of the row', () => {
    expect(controls({ 'order_context.address': false })).toEqual({ type: true, moment: true, address: false })
  })
})

describe('Header — the logo when there is no logo image (white label)', () => {
  it.each(['logotype', 'isotype'])('keeps a lone %s available as the checkout home control', (variant) => {
    windowSize.width = 390
    const theme = themeWithValues((values) => {
      values.images[variant] = 'https://cdn.test/brand.png'
      values.visibility['header.menu_toggle'] = false
      values.visibility.footer = false
    })
    const pathname = '/checkout/test-cart'
    const { getByRole } = renderWithProviders(
      <><Header location={{ pathname }} /><div data-bottom-nav-cover='' /></>,
      { initialEntries: [pathname], theme }
    )
    const home = getByRole('button', { name: 'Go to home' })
    const images = home.querySelectorAll('img')
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute('src', 'https://cdn.test/brand.png')
    expect(cssFor(home.parentElement)).toContain('img:first-of-type:not(:only-of-type){display:none;')
    home.focus()
    expect(home).toHaveFocus()
    fireEvent.click(home)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it("shows the site's own name as text, clickable to home", () => {
    const theme = themeWithValues((values) => {
      values.site.name = 'Acme Eats'
      return values
    })
    const { getByRole, getByText } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home', theme }
    )
    const button = getByRole('button', { name: 'Go to home' })
    expect(getByText('Acme Eats')).toBeInTheDocument()
    fireEvent.click(button)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('renders no LogoHeader at all without a logo or an own name', () => {
    const { queryByRole } = renderWithProviders(
      <Header isHome location={{ pathname: '/home' }} />,
      { initialEntries: ['/home'], routePath: '/home' }
    )
    expect(queryByRole('button', { name: 'Go to home' })).toBeNull()
  })
})

describe("Header — Single Restaurant's brand", () => {
  const singleStoreTheme = (slug = 'demo-store') => themeWithValues((values) => {
    values.site.mode = 'single_store'
    values.site.business_slug = slug
    return values
  })

  beforeEach(() => {
    orderWithAddressFixture.carts['businessId:1'].business.logo = 'https://cdn.test/store-logo.png'
  })

  afterEach(() => {
    delete orderWithAddressFixture.carts['businessId:1'].business.logo
  })

  it('a single store with no site logo shows its own logo, off the carts (never the name)', () => {
    const { getByAltText, queryByRole } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search', theme: singleStoreTheme() }
    )
    const button = queryByRole('button', { name: 'Go to home' })
    expect(getByAltText('Logo')).toHaveAttribute('src', 'https://cdn.test/store-logo.png')
    // the tracking-only branch's own test already covers it still rendering; here,
    // the LogoHeaderName span never shows when there is a store logo to show instead
    expect(button.querySelector('span')).toBeNull()
    // $disabledResponsive is a transient prop (styled-components), never a real
    // DOM attribute, whatever case React/the DOM would normalize it to
    expect(button).not.toHaveAttribute('disabledresponsive')
    expect(button).not.toHaveAttribute('$disabledResponsive')
  })

  it('deep links into the store (category and product, templated or short) hide the brand on mount too (not only its own root page)', () => {
    const deepLinks = [
      ['/store/demo-store/burgers/cheeseburger', '/store/:business_slug/:category_slug/:product_slug'],
      ['/store/demo-store/burgers', '/store/:business_slug/:category_slug'],
      ['/demo-store/burgers/cheeseburger', '/:business_slug/:category_slug/:product_slug'],
      ['/demo-store/burgers', '/:business_slug/:category_slug']
    ]
    deepLinks.forEach(([pathname, routePath]) => {
      cleanup()
      const { getByAltText } = renderWithProviders(
        <Header isHome={false} location={{ pathname }} />,
        { initialEntries: [pathname], routePath, theme: singleStoreTheme() }
      )
      expect(getByAltText('Logo').closest('button')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('Marketplace never reads the persisted store logo at all (singleStore gates it, not just its result)', () => {
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem')
    renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    expect(getItemSpy.mock.calls.some(([key]) => String(key).startsWith('header_store_logo:'))).toBe(false)
  })

  it('a bounded fallback shows the brand if no single_store_in_view event ever arrives (unsupported IntersectionObserver, ~1500ms)', () => {
    vi.useFakeTimers()
    try {
      const { getByAltText } = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
        { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme: singleStoreTheme() }
      )
      const button = getByAltText('Logo').closest('button')
      expect(button).toHaveAttribute('aria-hidden', 'true')
      act(() => { vi.advanceTimersByTime(1500) })
      expect(button).not.toHaveAttribute('aria-hidden')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a single_store_in_view event that arrives before the fallback cancels it (stays hidden)', () => {
    vi.useFakeTimers()
    try {
      const { getByAltText } = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
        { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme: singleStoreTheme() }
      )
      const button = getByAltText('Logo').closest('button')
      act(() => { eventHandlers.single_store_in_view?.(true) })
      act(() => { vi.advanceTimersByTime(1500) })
      expect(button).toHaveAttribute('aria-hidden', 'true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('writes the published logo under the current slug, not a stale one from the first render', () => {
    const theme = themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'first-store'
      return values
    })
    const { rerender } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search', theme }
    )
    // the slug changes after mount (e.g. the site's own theme finishes loading)
    theme.values.site.business_slug = 'second-store'
    rerender(<Header isHome={false} location={{ pathname: '/search' }} />)

    eventHandlers.single_store_logo?.('https://cdn.test/new-logo.png')
    expect(window.localStorage.getItem('header_store_logo:second-store')).toBe('https://cdn.test/new-logo.png')
    expect(window.localStorage.getItem('header_store_logo:first-store')).toBeNull()
  })

  it("hides the brand on the store's own page while the store block is in view, shows it once scrolled past", async () => {
    const { getByAltText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
      { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme: singleStoreTheme() }
    )
    const button = getByAltText('Logo').closest('button')
    // hidden by default on the store's own page, before any event (no flash)
    expect(button).toHaveAttribute('aria-hidden', 'true')
    expect(button).toHaveAttribute('tabIndex', '-1')
    eventHandlers.single_store_in_view?.(false)
    await waitFor(() => expect(button).not.toHaveAttribute('aria-hidden'))
    expect(button).not.toHaveAttribute('tabIndex')
    eventHandlers.single_store_in_view?.(true)
    await waitFor(() => expect(button).toHaveAttribute('aria-hidden', 'true'))
  })

  it("the store's own logo stays shown while the block is in view if the block doesn't paint its own logo at this width", () => {
    const theme = themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'demo-store'
      values.visibility['business.header.logo'] = false
      return values
    })
    const { getByAltText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
      { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme }
    )
    const button = getByAltText('Logo').closest('button')
    expect(button).not.toHaveAttribute('aria-hidden')
  })

  it("the store's own logo still hides while the block is in view if the block does paint its own logo (as today, implementation notes)", () => {
    const theme = themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'demo-store'
      values.visibility['business.header.logo'] = true
      return values
    })
    const { getByAltText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
      { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme }
    )
    const button = getByAltText('Logo').closest('button')
    expect(button).toHaveAttribute('aria-hidden', 'true')
  })

  it("on the store's own page a site name other than the store's stays visible; the same name (case/space-insensitive) hides", async () => {
    delete orderWithAddressFixture.carts['businessId:1'].business.logo
    const theme = themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'demo-store'
      values.site.name = 'Nabe & Don'
      return values
    })
    const { getByText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
      { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug', theme }
    )
    const button = getByText('Nabe & Don').closest('button')
    act(() => { eventHandlers.single_store_in_view?.(true) })
    act(() => { eventHandlers.single_store_name?.('Example Restaurant') })
    await waitFor(() => expect(button).not.toHaveAttribute('aria-hidden'))
    act(() => { eventHandlers.single_store_name?.('  nabe & DON ') })
    await waitFor(() => expect(button).toHaveAttribute('aria-hidden', 'true'))
  })

  it('elsewhere on the site (checkout, not the store\'s own page) the brand always shows, even "in view"', () => {
    const { getByAltText } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/checkout/abc' }} />,
      { initialEntries: ['/checkout/abc'], routePath: '/checkout/:cartUuid', theme: singleStoreTheme() }
    )
    const button = getByAltText('Logo').closest('button')
    expect(button).not.toHaveAttribute('aria-hidden')
    eventHandlers.single_store_in_view?.(true)
    expect(button).not.toHaveAttribute('aria-hidden')
  })

  it('Marketplace (no singleStoreSlug) never shows a store logo, pixel for pixel as before, even with the same carts', () => {
    const { queryByAltText, queryByRole } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/store/demo-store' }} />,
      { initialEntries: ['/store/demo-store'], routePath: '/store/:business_slug' }
    )
    expect(queryByAltText('Logo')).toBeNull()
    expect(queryByRole('button', { name: 'Go to home' })).toBeNull()
  })

  it.each([
    ['reveal', 'reveal'],
    ['fixed', 'fixed'],
    [undefined, 'fixed'],
    ['sideways', 'fixed']
  ])('the root carries the stable hook and the theme\'s scroll behavior (%s -> %s), also in tracking-only mode', (value, expected) => {
    const theme = themedScroll(value)
    const regular = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search', theme }
    )
    const root = regular.container.querySelector('[data-app-header]')
    expect(root).toHaveAttribute('data-scroll-behavior', expected)
    // the state is kept on the DOM by the scroll listener, from the first paint of the effect
    expect(root).toHaveAttribute('data-scroll-state', 'top')
    regular.unmount()
    const tracking = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/orders/1' }} isTrackingOnly />,
      { initialEntries: ['/orders/1'], routePath: '/orders/1', theme }
    )
    const trackingRoot = tracking.container.querySelector('[data-app-header]')
    expect(trackingRoot).toHaveAttribute('data-scroll-behavior', expected)
    expect(trackingRoot).toHaveAttribute('data-scroll-state', 'top')
  })
})

describe('Header — map, login and signup are base Buttons of their header slots', () => {
  const varsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
  const slotTheme = themeWithValues((values) => {
    values.components.header.slots = {
      ...values.components.header.slots,
      map: { component: 'button', size: 'lg', color: 'primary', appearance: 'solid', shape: 'icon' },
      login: { component: 'button', size: 'sm', color: 'secondary', appearance: 'outline' },
      signup: { component: 'button', size: 'lg', color: 'neutral', appearance: 'tonal' }
    }
    return values
  })
  const bareTheme = themeWithValues((values) => { delete values.components.header.slots; return values })
  const renderSearch = (theme) => {
    cleanup()
    return renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search', theme }
    )
  }

  beforeEach(() => {
    windowSize.width = 1024
    sessionState.auth = false
    sessionState.user = null
  })

  it('each is the base piece (data-slot), keeps its name, type and handler', async () => {
    const { getByRole, getByText } = renderSearch(slotTheme)
    const map = getByRole('button', { name: 'Businesses Map' })
    const login = getByText('Login').closest('button')
    const signup = getByText('Sign up').closest('button')
    for (const button of [map, login, signup]) {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
    }
    expect(login).toHaveAttribute('name', 'signin')
    expect(signup).toHaveAttribute('name', 'signup')
    expect(signup.classList.contains('signup-button')).toBe(true)
    expect(map.querySelector('svg.lucide-map-pinned')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(login)
    await findDialog()
  })

  it('takes size, color and appearance from its header slot; the map is always the icon shape', () => {
    const header = scopedTheme(slotTheme, 'header')
    const { getByRole, getByText } = renderSearch(slotTheme)
    expect(varsOf(getByRole('button', { name: 'Businesses Map' }))).toEqual(componentVars(header, 'button', { size: 'lg', shape: 'icon', color: 'primary', appearance: 'solid' }))
    expect(getByRole('button', { name: 'Businesses Map' }).className).toContain('ui:w-(--ui-button-height)')
    expect(varsOf(getByText('Login').closest('button'))).toEqual(componentVars(header, 'button', { size: 'sm', color: 'secondary', appearance: 'outline' }))
    expect(varsOf(getByText('Sign up').closest('button'))).toEqual(componentVars(header, 'button', { size: 'lg', color: 'neutral', appearance: 'tonal' }))
  })

  it('without a slot: the neutral ghost md map and login, the primary solid md signup', () => {
    const header = scopedTheme(bareTheme, 'header')
    const { getByRole, getByText } = renderSearch(bareTheme)
    expect(varsOf(getByRole('button', { name: 'Businesses Map' }))).toEqual(componentVars(header, 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' }))
    expect(varsOf(getByText('Login').closest('button'))).toEqual(componentVars(header, 'button', { size: 'md', color: 'neutral', appearance: 'ghost' }))
    expect(varsOf(getByText('Sign up').closest('button'))).toEqual(componentVars(header, 'button', { size: 'md', color: 'primary', appearance: 'solid' }))
  })

  it('the map shows at the same widths as before: from 769px signed out, and on a phone only with a session', () => {
    windowSize.width = 768
    expect(renderSearch(slotTheme).queryByRole('button', { name: 'Businesses Map' })).toBeNull()
    windowSize.width = 769
    expect(renderSearch(slotTheme).getByRole('button', { name: 'Businesses Map' })).toBeInTheDocument()
    windowSize.width = 500
    sessionState.auth = true
    sessionState.user = sessionUserFixture
    expect(renderSearch(slotTheme).getByRole('button', { name: 'Businesses Map' })).toBeInTheDocument()
  })

  it('login and signup show from 921px, and only without a session', () => {
    windowSize.width = 920
    expect(renderSearch(slotTheme).queryByText('Login')).toBeNull()
    windowSize.width = 921
    expect(renderSearch(slotTheme).getByText('Login')).toBeInTheDocument()
    sessionState.auth = true
    sessionState.user = sessionUserFixture
    const withSession = renderSearch(slotTheme)
    expect(withSession.queryByText('Login')).toBeNull()
    expect(withSession.queryByText('Sign up')).toBeNull()
  })
})

describe('Header — the order context capsule\'s text, chevron and touch areas', () => {
  const tabs = getThemeCss(defaultTheme, 'tabs')
  const renderCapsule = () => renderWithProviders(
    <Header isHome={false} location={{ pathname: '/search' }} />,
    { initialEntries: ['/search'], routePath: '/search' }
  )

  beforeEach(() => {
    windowSize.width = 1100
    sessionState.auth = false
    sessionState.user = null
    mockGetDistance.mockReturnValue(0)
  })

  it('the address has the capsule\'s text (the tabs\' label), the same as the moment\'s', () => {
    const { getByText } = renderCapsule()
    const address = getByText('123 Main St').closest('button')
    const moment = getByText('ASAP').closest('button')
    expect(address.style.getPropertyValue('--ui-tabs-text-size')).toBe(tabs.base.text.size)
    expect(address.style.getPropertyValue('--ui-tabs-text-weight')).toBe(String(tabs.base.text.weight))
    for (const key of ['--ui-tabs-text-size', '--ui-tabs-text-weight']) {
      expect(address.style.getPropertyValue(key)).toBe(moment.style.getPropertyValue(key))
    }
  })

  it('its one chevron is the shared ChevronIcon (the moment\'s); the address and the pin have none', () => {
    const { getByText, getByTestId } = renderCapsule()
    const capsule = getByTestId('address-order-type').closest('[role="group"]')
    expect(capsule.querySelectorAll('svg[class*="chevron"], svg[class*="caret"]')).toHaveLength(1)
    expect(getByText('ASAP').closest('button').querySelector('svg.lucide-chevron-down')).not.toBeNull()
    expect(getByText('123 Main St').closest('button').querySelector('svg[class*="chevron"]')).toBeNull()
  })

  it('the far-away tooltip and the map dialog draw Lucide icons', async () => {
    mockGetDistance.mockReturnValue(25)
    const { findAllByText, getByRole, container } = renderCapsule()
    const [farAway] = await findAllByText(/Is this the right address/)
    expect(farAway.closest('[role="status"]').querySelector('svg.lucide-chevron-up')).not.toBeNull()
    fireEvent.click(getByRole('button', { name: 'Businesses Map' }))
    await findDialog()
    const items = container.ownerDocument.querySelectorAll('.address-map-info-item')
    expect([...items].map((item) => item.querySelector('svg').getAttribute('class'))).toEqual([
      expect.stringContaining('lucide-utensils'), expect.stringContaining('lucide-map-pin'), expect.stringContaining('lucide-search')
    ])
    expect(document.querySelector('[class*="lucide"]')).not.toBeNull()
  })

  it('the moment and the address are 44px targets with a coarse pointer, and nothing above them clips it', () => {
    const { getByText, getByTestId } = renderCapsule()
    const header = getByTestId('address-order-type').closest('header, [data-app-header]') || document.body
    for (const text of ['ASAP', '123 Main St']) {
      const button = getByText(text).closest('button')
      expect(button, text).toHaveClass('ui:pointer-coarse:after:min-w-[44px]', 'ui:pointer-coarse:after:min-h-[44px]')
      expect(clippedBy(button, header), text).toBeNull()
    }
  })
})

describe('Header — the cart is the header\'s for everyone, with or without a session', () => {
  const guest = { ...sessionUserFixture, guest_id: 'guest-1' }
  const hasCart = (width) => {
    windowSize.width = width
    cleanup()
    const { queryByTestId, container } = renderWithProviders(
      <Header isHome={false} location={{ pathname: '/search' }} />,
      { initialEntries: ['/search'], routePath: '/search' }
    )
    // narrow: the header option; wide: the cart popover (its button, not hidden by the theme)
    return !!queryByTestId('header-option-cart') || container.querySelector('[data-cart-popover="false"]') !== null
  }

  beforeEach(() => {
    sessionState.auth = false
    sessionState.user = null
  })

  it('a visitor with no session has it at every width', () => {
    for (const width of [360, 382, 390, 412, 500, 768, 769, 1024, 1400]) expect(hasCart(width), `${width}px`).toBe(true)
  })

  it('a guest user (auth with guest_id) has it, narrow and wide', () => {
    sessionState.auth = true
    sessionState.user = guest
    for (const width of [400, 500, 768, 769, 1024, 1400]) expect(hasCart(width), `${width}px`).toBe(true)
  })

  // implementation noteswith the language select, the cart is the narrow row's last control (the one at the page's side)
  it('narrow: the language select comes before the cart; wide: after it', () => {
    const order = (width) => {
      windowSize.width = width
      cleanup()
      const { getByTestId, queryByTestId, container } = renderWithProviders(
        <Header isHome={false} location={{ pathname: '/search' }} />,
        { initialEntries: ['/search'], routePath: '/search' }
      )
      const language = getByTestId('language-selector')
      const cart = queryByTestId('header-option-cart') ?? container.querySelector('[data-cart-popover]')
      return language.compareDocumentPosition(cart)
    }
    for (const width of [360, 382, 390, 412, 768]) expect(order(width) & Node.DOCUMENT_POSITION_FOLLOWING, `${width}px: the cart follows the select`).toBeTruthy()
    for (const width of [769, 1024, 1440]) expect(order(width) & Node.DOCUMENT_POSITION_PRECEDING, `${width}px: the cart precedes the select`).toBeTruthy()
  })

  it('the narrow map pin stays for a signed-in user only (as before)', () => {
    windowSize.width = 500
    const pin = () => renderWithProviders(<Header isHome={false} location={{ pathname: '/search' }} />, { initialEntries: ['/search'], routePath: '/search' }).container.querySelector('[data-header-map-trigger]')
    expect(pin()).toBeNull()
    cleanup()
    sessionState.auth = true
    sessionState.user = guest
    expect(pin()).not.toBeNull()
  })
})
