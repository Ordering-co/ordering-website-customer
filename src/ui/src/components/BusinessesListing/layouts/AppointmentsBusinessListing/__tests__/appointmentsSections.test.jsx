import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { AppointmentsBusinessListing } from '../index'

vi.mock('~ui/utils', () => ({
  priceList: [{ level: 1, content: '$' }],
  getCateringValues: () => ({}),
  checkSiteUrl: (_u, f) => f,
  capitalize: (s) => s
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder, onSearch }) => (
    <input data-testid='search' placeholder={placeholder} onChange={(e) => onSearch?.(e.target.value)} />
  )
}))
vi.mock('~ui/src/components/BusinessTypeFilter', () => ({
  BusinessTypeFilter: ({ handleChangeBusinessType }) => (
    <button type='button' data-testid='type-filter' onClick={() => handleChangeBusinessType?.(3)}>types</button>
  )
}))
vi.mock('~ui/src/components/MomentControl', () => ({
  MomentControl: () => <div data-testid='moment' />
}))
vi.mock('~ui/src/components/OrderTypeSelectorHeader', () => ({
  OrderTypeSelectorHeader: () => <div data-testid='order-type' />
}))
vi.mock('~ui/src/components/HighestRated', () => ({
  HighestRated: ({ isFeatured, titleAs }) => <div data-testid={isFeatured ? 'featured' : 'highest'} data-level={titleAs} />
}))
vi.mock('~ui/src/components/OrderProgress', () => ({
  OrderProgress: () => <div data-testid='order-progress' />
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: () => <div data-testid='page-banner' />
}))
vi.mock('~ui/src/components/CustomOrderBanner', () => ({
  CustomOrderBanner: ({ onCustomOrderClick }) => (
    <button type='button' data-testid='custom-order' onClick={onCustomOrderClick}>custom</button>
  )
}))
vi.mock('~ui/src/components/CustomOrderModal', () => ({
  CustomOrderModal: ({ open }) => (open ? <div data-testid='custom-order-modal' /> : null)
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, isSkeleton, onPreorderBusiness, withLogoAndFavorite }) => (
    (isSkeleton || !business?.id)
      ? <div data-testid='business-skeleton' />
      : (
        <button type='button' data-testid='business-card' data-logo-favorite={String(!!withLogoAndFavorite)} onClick={() => onPreorderBusiness?.(business)}>
          {business?.name}
        </button>
        )
  )
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='preorder' />
}))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => <div data-testid='address-list' /> }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, onClose }) => (
    open ? <div data-testid='modal'><button type='button' data-testid='modal-close' onClick={onClose}>x</button>{children}</div> : null
  )
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, children }) => <div data-testid='empty'>{content}{children}</div>
}))
vi.mock('~ui-icon', () => ({
  Icon: ({ name, onClick }) => <button type='button' data-testid={`icon-${name}`} onClick={onClick}>{name}</button>
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: {} }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { order_types_allowed: { value: '1|2' }, advanced_business_search_enabled: { value: '1' }, custom_order_enabled: { value: '1' } }, loading: false }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{
    options: { type: 1, address: { address: '1 Main' } },
    loading: false,
    carts: {}
  }, { refreshOrderOptions: vi.fn() }]
}))

const listingFixture = vi.hoisted(() => ({
  current: {
    businessesList: { loading: false, error: null, businesses: [] },
    paginationProps: { currentPage: 1, totalPages: 2 },
    searchValue: '',
    priceLevelSelected: null,
    businessTypeSelected: null,
    handleChangeBusinessType: vi.fn(),
    handleChangePriceLevel: vi.fn(),
    getBusinesses: vi.fn(),
    handleChangeSearch: vi.fn(),
    handleBusinessClick: vi.fn(),
    handleUpdateBusinessList: vi.fn(),
    onRedirectPage: vi.fn(),
    onBusinessClick: vi.fn()
  }
}))

vi.mock('~components/components/BusinessList', () => ({
  BusinessList: ({ UIComponent, ...rest }) => (
    <UIComponent {...listingFixture.current} {...rest} />
  )
}))

const appointmentsTheme = (sections) => themeWithValues((values) => {
  values.pages.business_listing = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
  return values
})
const renderAppointments = (theme) => renderWithProviders(<AppointmentsBusinessListing />, { theme })

// a row of filters
const ROW = '[data-doc-section="appointments-filters"]'
const DEFAULT_ORDER = ['order_context', 'order_progress', 'custom_order_banner', 'categories', 'search', 'filters', 'promo_banners', 'highest_rated', 'featured', 'all_businesses']
const withAll = (overrides = {}) => DEFAULT_ORDER.map((key) => [key, overrides[key] ?? true])
const priceFilter = (view) => view.getByRole('button', { name: '$' })
// each main section's mark in the page
const MARKS = { order_progress: 'order-progress', custom_order_banner: 'custom-order', categories: 'type-filter', search: 'search', filters: 'chip', promo_banners: 'page-banner', highest_rated: 'highest', featured: 'featured' }
// the main sections painted, in the order of the page
const painted = (view) => {
  const byMark = Object.fromEntries(Object.entries(MARKS).map(([key, id]) => [id, key]))
  return Array.from(view.container.querySelectorAll('[data-testid], [data-slot="chip"]'))
    .map((el) => byMark[el.dataset.testid ?? el.dataset.slot])
    .filter(Boolean)
}

describe('appointments listing sections (pages.business_listing)', () => {
  beforeEach(() => {
    listingFixture.current.businessesList = { loading: false, error: null, businesses: [{ id: 1, name: 'Spa Spot', open: true }] }
  })

  it('complete theme: every main section, in the default order, before the appointments\' panel', () => {
    const view = renderAppointments(appointmentsTheme(withAll()))
    expect(painted(view)).toEqual(['order_progress', 'custom_order_banner', 'categories', 'search', 'filters', 'promo_banners', 'highest_rated', 'featured'])
    const panel = view.getByText('Available appointments')
    expect(view.getByTestId('featured').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // the carousels: sections under the page's h1
    expect(view.getByTestId('highest')).toHaveAttribute('data-level', 'h2')
    expect(view.getByTestId('featured')).toHaveAttribute('data-level', 'h2')
  })

  it('complete theme: the main sections in the theme\'s order', () => {
    const order = ['featured', 'search', 'highest_rated', 'promo_banners', 'order_progress', 'custom_order_banner', 'filters', 'categories']
    const view = renderAppointments(appointmentsTheme(order.map((key) => [key, true])))
    expect(painted(view)).toEqual(order)
  })

  it('complete theme: each main section can be hidden; the others stay', () => {
    Object.entries(MARKS).forEach(([key, id]) => {
      const view = renderAppointments(appointmentsTheme(withAll({ [key]: false })))
      expect(key === 'filters' ? view.queryByRole('button', { name: '$' }) : view.queryByTestId(id)).toBeNull()
      expect(painted(view)).toEqual(Object.keys(MARKS).filter((other) => other !== key))
      // the appointments' panel (the order context) and all the businesses stay
      expect(view.getByText('Available appointments')).toBeInTheDocument()
      expect(view.getByTestId('business-card')).toBeInTheDocument()
      view.unmount()
    })
  })

  it('complete theme: categories and filters side by side while together, apart otherwise', () => {
    // by default the search is between them: each one in its place
    const byDefault = renderAppointments(appointmentsTheme(withAll()))
    expect(byDefault.getByTestId('type-filter').closest(ROW)).not.toBe(priceFilter(byDefault).closest(ROW))
    byDefault.unmount()
    const inOrder = (keys) => appointmentsTheme(keys.map((key) => [key, true]))
    const rest = ['order_progress', 'custom_order_banner', 'promo_banners', 'highest_rated', 'featured']
    const together = renderAppointments(inOrder(['search', 'categories', 'filters', ...rest]))
    expect(together.getByTestId('type-filter').closest(ROW)).toBe(priceFilter(together).closest(ROW))
    expect(painted(together).slice(0, 3)).toEqual(['search', 'categories', 'filters'])
    // the line after the first of the row
    const typesPart = (view) => view.getByTestId('type-filter').parentElement
    const pricePart = (view) => priceFilter(view).parentElement.parentElement
    expect(cssFor(typesPart(together))).toMatch(/border-right:/)
    expect(cssFor(pricePart(together))).not.toMatch(/border-right:/)
    together.unmount()
    // in the row, in the theme's order
    const swapped = renderAppointments(inOrder(['search', 'filters', 'categories', ...rest]))
    expect(swapped.getByTestId('type-filter').closest(ROW)).toBe(priceFilter(swapped).closest(ROW))
    expect(painted(swapped).slice(0, 3)).toEqual(['search', 'filters', 'categories'])
    expect(cssFor(pricePart(swapped))).toMatch(/border-right:/)
    expect(cssFor(typesPart(swapped))).not.toMatch(/border-right:/)
    swapped.unmount()
    // one of them hidden: the other alone
    const alone = renderAppointments(appointmentsTheme(withAll({ filters: false })))
    expect(alone.getByTestId('type-filter').closest(ROW)).not.toBeNull()
    expect(alone.queryByRole('button', { name: '$' })).toBeNull()
  })

  it('the custom order banner opens its modal; no carousels for a franchise or without businesses', () => {
    const view = renderAppointments(appointmentsTheme(withAll()))
    fireEvent.click(view.getByTestId('custom-order'))
    expect(view.getByTestId('custom-order-modal')).toBeInTheDocument()
    view.unmount()
    const franchise = renderWithProviders(<AppointmentsBusinessListing franchiseId='f1' />, { theme: appointmentsTheme(withAll()) })
    expect(franchise.queryByTestId('highest')).toBeNull()
    expect(franchise.queryByTestId('featured')).toBeNull()
    franchise.unmount()
    listingFixture.current.businessesList = { loading: false, error: null, businesses: [] }
    const empty = renderAppointments(appointmentsTheme(withAll()))
    expect(empty.queryByTestId('highest')).toBeNull()
    expect(empty.queryByTestId('featured')).toBeNull()
  })

  it('the business cards take the card\'s logo and favorite (A8)', () => {
    const view = renderAppointments(appointmentsTheme(withAll()))
    expect(view.getByTestId('business-card')).toHaveAttribute('data-logo-favorite', 'true')
  })

  it('complete theme: search hidden, the rest stays', () => {
    const noSearch = renderAppointments(appointmentsTheme([['search', false]]))
    expect(noSearch.queryByTestId('search')).toBeNull()
    expect(noSearch.getByText('Popular services')).toBeInTheDocument()
    expect(noSearch.getByText('Price')).toBeInTheDocument()
  })
})
