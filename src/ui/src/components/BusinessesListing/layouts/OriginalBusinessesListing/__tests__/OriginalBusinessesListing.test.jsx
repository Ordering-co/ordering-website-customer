import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders, defaultTheme } from '../../../../../../../__tests__/helpers/testUtils'
import { OriginalBusinessesListing } from '../index'
import { themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { WrapperSearch } from '../styles'
import { ServerStyleSheet } from 'styled-components'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('../../../../../../../utils/searchQueryLocation', () => ({
  resolveSearchQuery: (search) => search || ''
}))
vi.mock('~ui/utils', () => ({
  getCateringValues: () => ({}),
  checkSiteUrl: (_u, f) => f,
  capitalize: (s) => s,
  priceList: []
}))
vi.mock('../OrdersSection', () => ({
  OrdersSection: () => <div data-testid='orders-section' />
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder, onSearch, handleCustomEnter }) => (
    <div>
      <input data-testid='search' placeholder={placeholder} onChange={(e) => onSearch?.(e.target.value)} />
      <button type='button' data-testid='search-enter' onClick={() => handleCustomEnter?.()}>enter</button>
    </div>
  )
}))
vi.mock('~ui/src/components/BusinessTypes', () => ({
  BusinessTypes: ({ handleChangeBusinessType }) => (
    <button type='button' data-testid='business-types' onClick={() => handleChangeBusinessType?.(2)}>types</button>
  )
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, isSkeleton, onPreorderBusiness }) => (
    (isSkeleton || !business?.id)
      ? <div data-testid='business-skeleton' />
      : (
        <button
          type='button'
          data-testid='business-card'
          onClick={() => onPreorderBusiness?.(business)}
        >
          {business?.name}
        </button>
        )
  )
}))
vi.mock('~ui/src/components/BusinessesMap', () => ({
  BusinessesMap: ({ setErrors }) => (
    <button type='button' data-testid='businesses-map' onClick={() => setErrors?.('ERROR_NOT_FOUND_ADDRESS')}>map</button>
  )
}))
vi.mock('~ui/src/components/HighestRated', () => ({
  HighestRated: () => <div data-testid='highest-rated' />
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='preorder' />
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: () => <div data-testid='page-banner' />
}))
vi.mock('~ui/src/components/CitiesControl', () => ({
  CitiesControl: () => <div data-testid='cities-control' />
}))
vi.mock('~ui/src/components/OrderContextUI', () => ({
  OrderContextUI: () => null
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~ui/src/components/OrderProgress', () => ({
  OrderProgress: () => <div data-testid='order-progress' />
}))
vi.mock('~ui/src/components/CustomOrderBanner', () => ({
  CustomOrderBanner: ({ onCustomOrderClick }) => (
    <button type='button' data-testid='custom-order' onClick={onCustomOrderClick}>custom</button>
  )
}))
vi.mock('~ui/src/components/CustomOrderModal', () => ({
  CustomOrderModal: ({ open }) => (open ? <div data-testid='custom-order-modal' /> : null)
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, content }) => (open ? <div data-testid='alert'>{content}</div> : null)
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, children, headingLevel }) => (
    <div data-testid='empty' data-heading={headingLevel}>{content}{children}</div>
  )
}))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))
vi.mock('~ui-icon', () => ({
  Icon: ({ name, onClick }) => (
    <button type='button' data-testid={`icon-${name}`} onClick={onClick}>{name}</button>
  )
}))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 1300, height: 800 })
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 }, loading: false }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      filter_search_options: { value: 'price_range|brands|max_delivery_fee|max_delivery_time|max_distance|business_categories' },
      order_types_allowed: { value: '1|2' },
      advanced_business_search_enabled: { value: '1' },
      custom_order_enabled: { value: '1' }
    },
    loading: false
  }]
}))

const changeType = vi.hoisted(() => vi.fn())
const listingFixture = vi.hoisted(() => ({
  current: {
    businessesList: { loading: false, error: null, businesses: [{ id: 1, name: 'Demo Cafe', open: true, slug: 'demo', featured: false }], fetched: true },
    paginationProps: { currentPage: 1, totalPages: 2, pageSize: 25 },
    searchValue: '',
    getBusinesses: vi.fn(),
    handleChangeSearch: vi.fn(),
    handleBusinessClick: vi.fn(),
    handleUpdateBusinessList: vi.fn(),
    onRedirectPage: vi.fn(),
    onBusinessClick: vi.fn(),
    citiesState: { cities: [{ id: 9, name: 'Austin', enabled: true }] },
    getCities: vi.fn(),
    changeCityFilter: vi.fn(),
    handleChangeBusinessType: vi.fn(),
    businessTypeSelected: null
  }
}))

vi.mock('~components/components/BusinessList', () => ({
  BusinessList: ({ UIComponent, ...rest }) => (
    <UIComponent {...listingFixture.current} {...rest} />
  )
}))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{
    options: { type: 1, address: { address: '1 Main St', location: { lat: 1, lng: 2 } } },
    carts: {},
    loading: false
  }, { changeType, refreshOrderOptions: vi.fn() }]
}))

const listingTheme = defaultTheme

describe('OriginalBusinessesListing', () => {
  it.each([false, true])('adds phone-only search spacing with custom layout %s', (isCustomLayout) => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(sheet.collectStyles(<WrapperSearch theme={listingTheme} $hasMobileSearch isCustomLayout={isCustomLayout} />))
      const css = sheet.getStyleTags()
      expect(css).toMatch(/@media\s*\(max-width:\s*580px\)\{[^}]*margin-top:\s*16px/)
      expect(css).toMatch(/@media\s*\(min-width:\s*581px\)\{[^}]*margin:\s*12px 0 0/) // px-map md (was 10px)
    } finally {
      sheet.seal()
    }
  })

  it.each([{ $hasMobileSearch: false }, { isCustomerMode: true }])('preserves spacing without the public mobile search: %j', (props) => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(sheet.collectStyles(<WrapperSearch theme={listingTheme} {...props} />))
      expect(sheet.getStyleTags()).not.toContain('margin-top:16px')
    } finally {
      sheet.seal()
    }
  })

  beforeEach(() => {
    changeType.mockClear()
    listingFixture.current.onRedirectPage.mockClear()
    listingFixture.current.getBusinesses.mockClear()
    window.localStorage.setItem('user-customer', JSON.stringify({ id: 99 }))
    listingFixture.current.businessesList = {
      loading: false,
      error: null,
      businesses: [{ id: 1, name: 'Demo Cafe', open: true, slug: 'demo', featured: false }],
      fetched: true
    }
    listingFixture.current.businessTypeSelected = null
  })

  it('renders business cards for open stores', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(getByTestId('order-progress')).toBeInTheDocument()
    expect(getByTestId('business-types')).toBeInTheDocument()
    expect(getByTestId('page-banner')).toBeInTheDocument()
    expect(getAllByTestId('business-card')[0]).toHaveTextContent('Demo Cafe')
  })

  it('renders logos layout skeletons while loading', () => {
    listingFixture.current.businessesList = { loading: true, error: null, businesses: [], fetched: false }
    const { getAllByTestId } = renderWithProviders(
      <OriginalBusinessesListing logosLayout onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders logos for open businesses', () => {
    const { container } = renderWithProviders(
      <OriginalBusinessesListing logosLayout onRedirectPage={vi.fn()} onBusinessClick={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('logos layout: a store without a logo shows its name, not an empty button (business.dummy_logo off)', () => {
    const { container } = renderWithProviders(
      <OriginalBusinessesListing logosLayout onRedirectPage={vi.fn()} onBusinessClick={vi.fn()} />,
      { theme: listingTheme }
    )
    const button = container.querySelector('button[aria-label="Demo Cafe"]')
    expect(button).toHaveTextContent('Demo Cafe')
    expect(button.style.backgroundImage).toBe('')
  })

  it('shows highest rated and custom order when businesses exist', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(getAllByTestId('highest-rated').length).toBeGreaterThan(0)
    fireEvent.click(getByTestId('custom-order'))
    expect(getByTestId('custom-order-modal')).toBeInTheDocument()
  })

  it('renders loading business skeletons', () => {
    listingFixture.current.businessesList = { loading: true, error: null, businesses: [], fetched: false }
    const { getAllByTestId } = renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(getAllByTestId('business-skeleton').length).toBeGreaterThan(0)
  })

  it('shows empty state when fetched with no businesses', async () => {
    listingFixture.current.businessesList = { loading: false, error: null, businesses: [], fetched: true }
    const { getByTestId, getByText, findByRole, queryByRole } = renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    expect(getByTestId('empty')).toBeInTheDocument()
    // its message one level under the list's title (the page's h1)
    expect(getByTestId('empty')).toHaveAttribute('data-heading', 'h2')
    fireEvent.click(getByText('Change address'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('redirects to advanced business search via enter and visual filters', () => {
    const onRedirectPage = listingFixture.current.onRedirectPage
    const { getByTestId, getByText } = renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={onRedirectPage} />,
      { theme: listingTheme }
    )
    fireEvent.click(getByTestId('search-enter'))
    expect(onRedirectPage).toHaveBeenCalled()
    fireEvent.click(getByText('Price'))
    fireEvent.click(getByText('Brands'))
    fireEvent.click(getByText('Delivery fee'))
    fireEvent.click(getByText('Max delivery time'))
    fireEvent.click(getByText('Max distance'))
    fireEvent.click(getByText('Categories'))
    expect(onRedirectPage.mock.calls.length).toBeGreaterThan(1)
    // they go to the search with that filter: no on / off state
    ;['Price', 'Brands', 'Delivery fee', 'Max delivery time', 'Max distance', 'Categories'].forEach((label) => {
      expect(getByText(label).closest('button')).not.toHaveAttribute('aria-pressed')
    })
  })

  it('toggles map in custom layout and opens preorder in the base dialog; its close closes it', async () => {
    const { getByTestId, getByRole, findByRole, queryByRole } = renderWithProviders(
      <OriginalBusinessesListing isCustomLayout onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    fireEvent.click(getByRole('button', { name: 'Show map' }))
    expect(getByTestId('businesses-map')).toBeInTheDocument()
    fireEvent.click(getByTestId('businesses-map'))
    expect(getByTestId('alert')).toBeInTheDocument()
    fireEvent.click(getByTestId('business-card'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog).toHaveAttribute('data-doc-section', 'business-preorder-dialog')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(dialog).getByTestId('preorder')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('renders customer mode delivery controls and previous orders', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <OriginalBusinessesListing
        isCustomerMode
        onRedirectPage={vi.fn()}
        userCustomer={{ id: 99 }}
      />,
      { theme: listingTheme }
    )
    expect(getByText('Delivery Type')).toBeInTheDocument()
    expect(getByTestId('orders-section')).toBeInTheDocument()
    fireEvent.click(getByText('Delivery'))
    expect(changeType).toHaveBeenCalled()
  })

  it('customer mode: delivery and pickup are icons of the theme', () => {
    const { getByText } = renderWithProviders(
      <OriginalBusinessesListing isCustomerMode onRedirectPage={vi.fn()} userCustomer={{ id: 99 }} />,
      { theme: themeWithValues() }
    )
    // the base Icon (real): a decorative svg in each tab, the tab's text names it
    const delivery = getByText('Delivery').closest('button').querySelector('svg')
    const pickup = getByText('Pickup').closest('button').querySelector('svg')
    expect(delivery).toHaveClass('lucide-truck')
    expect(pickup).toHaveClass('lucide-shopping-bag')
    expect(delivery).toHaveAttribute('aria-hidden', 'true')
    expect(pickup).toHaveAttribute('aria-hidden', 'true')
  })

  it('customer mode: delivery and pickup are the theme tab bar (content width), pressed state on the active one', () => {
    const { getByText } = renderWithProviders(
      <OriginalBusinessesListing isCustomerMode onRedirectPage={vi.fn()} userCustomer={{ id: 99 }} />,
      { theme: themeWithValues() }
    )
    const delivery = getByText('Delivery').closest('button')
    const pickup = getByText('Pickup').closest('button')
    const bar = delivery.closest('[data-slot=tabs-navigation]')
    expect(bar).not.toBeNull()
    expect(pickup.closest('[data-slot=tabs-navigation]')).toBe(bar)
    expect(bar.className).toContain('ui:w-fit')
    expect(delivery).toHaveAttribute('data-slot', 'tabs-action')
    expect(delivery).toHaveAttribute('aria-pressed', 'true')
    expect(pickup).toHaveAttribute('aria-pressed', 'false')
  })

  it('loads more businesses on window scroll', () => {
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 9000, configurable: true })
    Object.defineProperty(document.documentElement, 'offsetHeight', { value: 100, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
    renderWithProviders(
      <OriginalBusinessesListing onRedirectPage={vi.fn()} />,
      { theme: listingTheme }
    )
    fireEvent.scroll(window)
    expect(listingFixture.current.getBusinesses).toHaveBeenCalled()
  })
})
