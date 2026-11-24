import React, { useEffect } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { OriginalBusinessesListing } from '../index'
import { cssFor, themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'

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
  BusinessController: ({ business, isSkeleton, onPreorderBusiness, nameAs }) => (
    (isSkeleton || !business?.id)
      ? <div data-testid='business-skeleton' />
      : (
        <button
          type='button'
          data-testid='business-card'
          data-name-as={nameAs}
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
// Each carousel shows businesses (it tells the page) and its heading level
vi.mock('~ui/src/components/HighestRated', () => ({
  HighestRated: ({ scrollId, titleAs, onVisibleChange }) => {
    useEffect(() => { onVisibleChange && onVisibleChange(true) }, [])
    return <div data-testid={scrollId === 'featured' ? 'featured' : 'highest-rated'} data-level={titleAs || 'h2'} />
  }
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='preorder' />
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: () => <div data-testid='page-banner' />
}))
vi.mock('~ui/src/components/CitiesControl', () => ({
  CitiesControl: ({ cities, handleChangeCity, onClose }) => (
    <div data-testid='cities-control'>
      {cities?.map((city) => (
        <button type='button' key={city.id} onClick={() => { handleChangeCity(city.id); onClose() }}>{`pick ${city.name}`}</button>
      ))}
    </div>
  )
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
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, onClose, flush, showCloseButton, 'aria-label': label }) => (
    open
      ? (
        <div data-testid='modal' aria-label={label} data-flush={String(!!flush)} data-close={String(showCloseButton !== false)}>
          <button type='button' data-testid='modal-close' onClick={onClose}>x</button>
          {children}
        </div>
        )
      : null
  )
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, content }) => (open ? <div data-testid='alert'>{content}</div> : null)
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, children }) => (
    <div data-testid='empty'>{content}{children}</div>
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
const windowWidth = vi.hoisted(() => ({ current: 1300 }))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: windowWidth.current, height: 800 })
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
const changeCityFilter = vi.hoisted(() => vi.fn())
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
  }, { changeType, changeCityFilter, refreshOrderOptions: vi.fn() }]
}))

// A complete theme with the listing's sections (`[key, visible]`, in that
// order)
const listingTheme = (sections, mutate = (values) => values) => themeWithValues((values) => {
  if (sections) values.pages.business_listing = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
  return mutate(values)
})
const DEFAULT_ORDER = ['order_context', 'order_progress', 'custom_order_banner', 'categories', 'search', 'filters', 'promo_banners', 'highest_rated', 'featured', 'all_businesses']
const withAll = (overrides = {}) => DEFAULT_ORDER.map((key) => [key, overrides[key] ?? true])

const renderListing = (theme) => renderWithProviders(<OriginalBusinessesListing onRedirectPage={vi.fn()} />, { theme })
// the test ids in the order of the page
const order = (container, ids) => Array.from(container.querySelectorAll(ids.map((id) => `[data-testid="${id}"]`).join(',')))
  .map((el) => el.getAttribute('data-testid'))
const chips = () => document.querySelector('[data-doc-section="business-list-filters"]')
const allBusinessesTitle = (view) => view.getByText('All Businesses')

describe('business listing sections (pages.business_listing)', () => {
  beforeEach(() => {
    windowWidth.current = 1300
    window.localStorage.setItem('user-customer', JSON.stringify({ id: 99 }))
    listingFixture.current.businessesList = {
      loading: false,
      error: null,
      businesses: [{ id: 1, name: 'Demo Cafe', open: true, slug: 'demo', featured: false }],
      fetched: true
    }
    listingFixture.current.businessTypeSelected = null
  })

  it('complete theme: the main sections in the theme\'s order; all businesses stays last', () => {
    const sections = [
      ['order_context', true], ['featured', true], ['promo_banners', true], ['categories', true],
      ['order_progress', true], ['highest_rated', true], ['custom_order_banner', true], ['search', true], ['filters', true], ['all_businesses', true]
    ]
    const view = renderListing(listingTheme(sections))
    expect(order(view.container, ['featured', 'page-banner', 'business-types', 'order-progress', 'highest-rated', 'custom-order', 'business-card']))
      .toEqual(['featured', 'page-banner', 'business-types', 'order-progress', 'highest-rated', 'custom-order', 'business-card'])
  })

  it('complete theme: each main section can be hidden; the others stay', () => {
    const view = renderListing(listingTheme(withAll({ order_progress: false, custom_order_banner: false, categories: false, promo_banners: false })))
    expect(view.queryByTestId('order-progress')).toBeNull()
    expect(view.queryByTestId('custom-order')).toBeNull()
    expect(view.queryByTestId('business-types')).toBeNull()
    expect(view.queryByTestId('page-banner')).toBeNull()
    expect(view.getByTestId('highest-rated')).toBeInTheDocument()
    expect(view.getByTestId('featured')).toBeInTheDocument()
    // all businesses cannot be hidden
    expect(view.getByTestId('business-card')).toBeInTheDocument()
  })

  it('complete theme: featured and highest rated are independent sections', () => {
    const noHighest = renderListing(listingTheme(withAll({ highest_rated: false })))
    expect(noHighest.queryByTestId('highest-rated')).toBeNull()
    expect(noHighest.getByTestId('featured')).toBeInTheDocument()
    noHighest.unmount()
    const noFeatured = renderListing(listingTheme(withAll({ featured: false })))
    expect(noFeatured.getByTestId('highest-rated')).toBeInTheDocument()
    expect(noFeatured.queryByTestId('featured')).toBeNull()
  })

  it('complete theme: one h1, the first carousel painted with businesses, else All Businesses', () => {
    const v = renderListing(listingTheme(withAll()))
    expect(v.getByTestId('highest-rated')).toHaveAttribute('data-level', 'h1')
    expect(v.getByTestId('featured')).toHaveAttribute('data-level', 'h2')
    expect(allBusinessesTitle(v).tagName).toBe('H2')
    v.unmount()
    const featuredFirst = withAll()
    featuredFirst.splice(featuredFirst.findIndex(([key]) => key === 'highest_rated'), 2, ['featured', true], ['highest_rated', true])
    const f = renderListing(listingTheme(featuredFirst))
    expect(f.getByTestId('featured')).toHaveAttribute('data-level', 'h1')
    expect(f.getByTestId('highest-rated')).toHaveAttribute('data-level', 'h2')
    f.unmount()
    const none = renderListing(listingTheme(withAll({ highest_rated: false, featured: false })))
    expect(allBusinessesTitle(none).tagName).toBe('H1')
    expect(none.container.querySelectorAll('h1')).toHaveLength(1)
  })

  it('complete theme: filters hide the chips; search hides the search (wide: the row keeps the other)', () => {
    const noFilters = renderListing(listingTheme(withAll({ filters: false })))
    expect(noFilters.queryByText('Price')).toBeNull()
    expect(within(chips()).getByTestId('search')).toBeInTheDocument()
    noFilters.unmount()
    const noSearch = renderListing(listingTheme(withAll({ search: false })))
    expect(noSearch.queryByTestId('search')).toBeNull()
    expect(within(chips()).getByText('Price')).toBeInTheDocument()
    noSearch.unmount()
    const neither = renderListing(listingTheme(withAll({ search: false, filters: false })))
    expect(chips()).toBeNull()
    expect(neither.queryByTestId('search')).toBeNull()
  })

  it('complete theme, wide: the search beside the chips in the place of the first of the two', () => {
    const sections = withAll()
    // filters, then promo banners, then search
    const keys = sections.map(([key]) => key)
    const reordered = [...sections]
    reordered.splice(keys.indexOf('search'), 3, ['filters', true], ['promo_banners', true], ['search', true])
    const view = renderListing(listingTheme(reordered))
    const row = chips()
    expect(within(row).getByText('Price')).toBeInTheDocument()
    expect(within(row).getByTestId('search')).toBeInTheDocument()
    // the row comes before the banners
    expect(row.compareDocumentPosition(view.getByTestId('page-banner')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(view.getAllByTestId('search')).toHaveLength(1)
  })

  it('complete theme, narrow: search and filters each in their own place', () => {
    windowWidth.current = 800
    const sections = withAll()
    const keys = sections.map(([key]) => key)
    const reordered = [...sections]
    reordered.splice(keys.indexOf('search'), 2, ['filters', true], ['search', true])
    const view = renderListing(listingTheme(reordered))
    const row = chips()
    expect(within(row).queryByTestId('search')).toBeNull()
    expect(row.compareDocumentPosition(view.getByTestId('search')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('complete theme: All Businesses is a section header of the theme (section_header)', () => {
    const view = renderListing(listingTheme(withAll({ highest_rated: false, featured: false }), (values) => {
      values.components.section_header.base.title_color = '#123456'
      values.components.section_header.variants.page.title = { size: 33, line: 1.24, weight: 700 }
      // as the page's h1: the page variant's own space under it
      values.components.section_header.variants.page.margin_bottom = 14
      return values
    }))
    const title = allBusinessesTitle(view)
    expect(title).toHaveStyle({ color: '#123456', fontSize: '33px', lineHeight: '1.24', marginBottom: '14px' })
  })

  it('complete theme: the cards\' names one level under All Businesses (h2 under its h1, h3 under its h2)', () => {
    const asH1 = renderListing(listingTheme(withAll({ highest_rated: false, featured: false })))
    expect(asH1.getByTestId('business-card')).toHaveAttribute('data-name-as', 'h2')
    asH1.unmount()
    const asH2 = renderListing(listingTheme(withAll()))
    expect(asH2.getByTestId('business-card')).toHaveAttribute('data-name-as', 'h3')
  })

  it('complete theme: the sections one rhythm apart (space.xl gap), whatever their order; no block adds its own space over or under it', () => {
    const theme = listingTheme(withAll())
    const view = renderListing(theme)
    const page = view.container.querySelector('[data-doc-section="businesses-list"]')
    const css = cssFor(page).replace(/\s+/g, '')
    expect(css).toContain(`gap:${theme.values.tokens.space.xl}px`)
    expect(css).toMatch(/margin-top:0;margin-bottom:0;/)
    // an empty block (a carousel without businesses, the search row beside the chips) takes no place
    expect(css).toMatch(/:empty\{display:none;/)
    // All Businesses: its title and its list, one block
    const title = allBusinessesTitle(view)
    expect(title.parentElement).toBe(view.getByTestId('business-card').closest('[data-doc-section="business-list-results"]').parentElement)
    expect(title.parentElement.parentElement).toBe(page)
  })
})

describe('the city choice (visibility business_listing.cities)', () => {
  const citiesOn = () => listingTheme(null, (values) => {
    values.visibility['business_listing.cities'] = true
    return values
  })
  beforeEach(() => {
    changeCityFilter.mockClear()
    listingFixture.current.getCities.mockClear()
    listingFixture.current.citiesState = { cities: [{ id: 9, name: 'Austin', enabled: true }] }
  })
  afterEach(() => {
    windowWidth.current = 1300
    window.innerWidth = 1024
  })

  it('by default there is none', () => {
    [1300, 800].forEach((width) => {
      windowWidth.current = width
      window.innerWidth = width
      const view = renderListing(themeWithValues())
      expect(view.queryByText('Select a city')).toBeNull()
      view.unmount()
    })
  })

  it('turned on: a button beside the search opens the cities; the city picked filters the list', () => {
    [1300, 800].forEach((width) => {
      windowWidth.current = width
      window.innerWidth = width
      const view = renderListing(citiesOn())
      const button = view.getByRole('button', { name: 'Select a city' })
      expect(button.closest('[data-doc-control="business-list-search"]')).not.toBeNull()
      fireEvent.click(button)
      expect(view.getByTestId('cities-control')).toBeInTheDocument()
      // implementation notesthe base dialog, flush and without its own close (CitiesControl draws its row), named
      const dialog = view.getByTestId('cities-control').closest('[data-testid="modal"]')
      expect(dialog).toHaveAttribute('data-flush', 'true')
      expect(dialog).toHaveAttribute('data-close', 'false')
      expect(dialog).toHaveAttribute('aria-label', 'Select a store')
      // the cities are loaded: no new request
      expect(listingFixture.current.getCities).not.toHaveBeenCalled()
      fireEvent.click(view.getByRole('button', { name: 'pick Austin' }))
      expect(changeCityFilter).toHaveBeenCalledWith(9)
      expect(view.queryByTestId('cities-control')).toBeNull()
      view.unmount()
      changeCityFilter.mockClear()
    })
  })

  it('turned on, without cities loaded: no button', () => {
    listingFixture.current.citiesState = { cities: [] }
    expect(renderListing(citiesOn()).queryByText('Select a city')).toBeNull()
  })
})
