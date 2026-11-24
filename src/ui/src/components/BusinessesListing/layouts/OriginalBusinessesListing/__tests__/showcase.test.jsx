import React, { useEffect } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
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
// A card is a heading of the level it is given (nameAs) in a box that says what it was
// given; its skeleton is a box
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, isSkeleton, nameAs, fromBusinessListing, isBusinessOpen, showFeaturedBadge }) => {
    const Name = nameAs || 'h3'
    return (isSkeleton || !business?.id)
      ? <div data-testid='business-skeleton' />
      : (
        <div data-testid='business-card' data-id={business.id} data-from-listing={String(!!fromBusinessListing)} data-open={String(!!isBusinessOpen)}>
          <Name>{business?.name}</Name>
          {business.featured && showFeaturedBadge && <span>Featured crown</span>}
        </div>
        )
  }
}))
vi.mock('~ui/src/components/BusinessesMap', () => ({
  BusinessesMap: ({ setErrors }) => (
    <button type='button' data-testid='businesses-map' onClick={() => setErrors?.('ERROR_NOT_FOUND_ADDRESS')}>map</button>
  )
}))
// Each carousel shows businesses (it tells the page) under a heading of its level
vi.mock('~ui/src/components/HighestRated', () => ({
  HighestRated: ({ scrollId, titleAs, onVisibleChange }) => {
    const Title = titleAs || 'h2'
    useEffect(() => { onVisibleChange && onVisibleChange(true) }, [])
    return <div data-testid={scrollId === 'featured' ? 'featured' : 'highest-rated'}><Title>carousel</Title></div>
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
  DialogOverlay: ({ open, children, onClose }) => (
    open
      ? (
        <div data-testid='modal'>
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
  NotFoundSource: ({ content, subtitle, children, headingLevel }) => {
    const Title = headingLevel || 'h3'
    return <div data-testid='not-found'><Title>{content}</Title>{subtitle && <p>{subtitle}</p>}{children}</div>
  }
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

const orderFixture = vi.hoisted(() => ({ address: { address: '1 Main St', location: { lat: 1, lng: 2 } } }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{
    options: { type: 1, address: orderFixture.address },
    carts: {},
    loading: false
  }, { changeType, changeCityFilter, refreshOrderOptions: vi.fn() }]
}))

// A complete theme with the sections (`[key, visible]`, in the theme's order) and the layout
const DEFAULT_ORDER = ['order_context', 'order_progress', 'custom_order_banner', 'categories', 'search', 'filters', 'promo_banners', 'highest_rated', 'featured', 'all_businesses']
const themeOf = (layout, hidden = [], base = {}) => themeWithValues((values) => {
  Object.assign(values.components.business_listing_page.base, { layout, ...base })
  values.pages.business_listing = { footer: null, sections: DEFAULT_ORDER.map((key) => ({ key, visible: !hidden.includes(key) })) }
})
const store = (id, extra = {}) => ({ id, name: `Store ${id}`, open: true, featured: false, ...extra })
const setList = (businesses, extra = {}) => {
  listingFixture.current.businessesList = { loading: false, error: null, businesses, fetched: true, ...extra }
}
const renderListing = (theme, props = {}) => renderWithProviders(<OriginalBusinessesListing onRedirectPage={vi.fn()} {...props} />, { theme })
const cardIds = (root) => Array.from(root.querySelectorAll('[data-testid="business-card"]')).map((el) => el.getAttribute('data-id'))
const heading = (view, name) => view.getByRole('heading', { name })
const h1s = () => document.querySelectorAll('h1')

const MIXED = [store(1), store(2, { open: false }), store(3, { featured: true }), store(4, { featured: true }), store(5, { enabled: false })]

describe('store list: showcase', () => {
  beforeEach(() => {
    windowWidth.current = 1300
    orderFixture.address = { address: '1 Main St', location: { lat: 1, lng: 2 } }
    window.localStorage.setItem('user-customer', JSON.stringify({ id: 99 }))
    listingFixture.current.getBusinesses.mockClear()
    listingFixture.current.businessTypeSelected = null
    setList(MIXED)
  })

  it('splits the stores: the hero first (once), "Open now", then "Order for later" with its line', () => {
    const view = renderListing(themeOf('showcase', ['highest_rated']))
    expect(view.queryByTestId('featured')).toBeNull()
    const listed = view.container.querySelector('[data-doc-section="business-list-results"]')
    // the hero is store 3 (the first featured one that is open), a card of the listing, one level under the h1
    const hero = view.getAllByTestId('business-card').find((el) => el.getAttribute('data-id') === '3')
    expect(hero).toHaveAttribute('data-from-listing', 'true')
    expect(hero.firstChild.tagName).toBe('H2')
    expect(listed.contains(hero)).toBe(false)
    expect(cardIds(view.container).filter((id) => id === '3')).toHaveLength(1)
    const groups = Array.from(listed.children)
    expect(groups.map((group) => group.querySelector('h1, h2').textContent)).toEqual(['Open now', 'Order for later'])
    expect(cardIds(groups[0])).toEqual(['1', '4'])
    expect(cardIds(groups[1])).toEqual(['2', '5'])
    expect(groups[1]).toHaveTextContent('Closed right now. Schedule your order for when they open.')
    expect(groups[0]).not.toHaveTextContent('Closed right now')
    // the hero's section has the page's only h1 (its title, for assistive technology), above the
    // hero's h2; both groups an h2 and h3 cards
    expect(h1s()).toHaveLength(1)
    expect(heading(view, 'Top Businesses').tagName).toBe('H1')
    expect(heading(view, 'Top Businesses').nextSibling).toBe(hero)
    expect(heading(view, 'Open now').tagName).toBe('H2')
    expect(groups[0].querySelector('[data-id="1"]').firstChild.tagName).toBe('H3')
    expect(groups[1].querySelector('[data-id="2"]').firstChild.tagName).toBe('H3')
  })

  // the page's headings in document order: the h1 first, and never a level skipped going down
  it.each([
    ['with a hero', MIXED],
    ['a hero and one more store', [store(1, { featured: true }), store(2)]],
    ['without a hero', [store(1), store(2, { open: false })]]
  ])('the headings read in order, the h1 first: %s', (_label, businesses) => {
    setList(businesses)
    renderListing(themeOf('showcase', ['highest_rated']))
    const levels = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((el) => Number(el.tagName[1]))
    expect(levels[0]).toBe(1)
    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    levels.forEach((level, index) => index > 0 && expect(level - levels[index - 1]).toBeLessThanOrEqual(1))
  })

  it('a disabled store is closed for the card too', () => {
    const view = renderListing(themeOf('showcase'))
    expect(view.container.querySelector('[data-id="5"]')).toHaveAttribute('data-open', 'false')
    expect(view.container.querySelector('[data-id="4"]')).toHaveAttribute('data-open', 'true')
  })

  it.each([
    ['with the carousel owning the h1', []],
    ['with All Businesses owning the h1', ['highest_rated']]
  ])('exactly one h1 %s', (_label, hidden) => {
    const view = renderListing(themeOf('showcase', hidden))
    expect(h1s()).toHaveLength(1)
    view.unmount()
  })

  it.each([
    ['with a hero', MIXED, {}],
    ['without a featured store', [store(1), store(2, { open: false })], {}],
    ['a featured store that is closed', [store(1), store(2, { open: false, featured: true })], {}],
    ['all closed', [store(1, { open: false }), store(2, { open: false })], {}],
    ['only the hero', [store(1, { featured: true })], {}],
    ['empty', [], {}],
    ['an error', [], { error: ['boom'] }],
    ['an error with the first page shown', [store(1)], { error: true }],
    ['the first load', [], { loading: true, fetched: false }]
  ])('exactly one h1 without the carousel: %s', (_label, businesses, extra) => {
    setList(businesses, extra)
    renderListing(themeOf('showcase', ['highest_rated']))
    expect(h1s()).toHaveLength(1)
  })

  it('all closed: "Order for later" heads the list with the h1', () => {
    setList([store(1, { open: false }), store(2, { open: false })])
    const view = renderListing(themeOf('showcase', ['highest_rated']))
    expect(view.queryByRole('heading', { name: 'Open now' })).toBeNull()
    expect(heading(view, 'Order for later').tagName).toBe('H1')
    expect(view.container.querySelector('[data-id="1"]').firstChild.tagName).toBe('H2')
  })

  it('no featured store open: no hero, the featured section paints nothing', () => {
    setList([store(1), store(2, { featured: true, open: false })])
    const view = renderListing(themeOf('showcase', ['highest_rated']))
    expect(view.queryByTestId('featured')).toBeNull()
    expect(cardIds(view.container)).toEqual(['1', '2'])
  })

  it('with a category chosen or the featured section hidden there is no hero: the featured store stays in "Open now"', () => {
    listingFixture.current.businessTypeSelected = 7
    const chosen = renderListing(themeOf('showcase', ['highest_rated']))
    expect(cardIds(chosen.container)).toContain('3')
    expect(chosen.container.querySelector('[data-id="3"]').closest('[data-doc-section="business-list-results"]')).not.toBeNull()
    chosen.unmount()
    listingFixture.current.businessTypeSelected = null
    const hidden = renderListing(themeOf('showcase', ['highest_rated', 'featured']))
    expect(hidden.container.querySelector('[data-id="3"]').closest('[data-doc-section="business-list-results"]')).not.toBeNull()
  })

  it('the first load: skeletons in the "Open now" grid; more pages: skeletons at the end of the last group, where the customer is', () => {
    setList([], { loading: true, fetched: false })
    const first = renderListing(themeOf('showcase', ['highest_rated']))
    expect(heading(first, 'Open now').tagName).toBe('H1')
    expect(first.getAllByTestId('business-skeleton').length).toBeGreaterThan(0)
    first.unmount()
    setList([store(1), store(2, { open: false })], { loading: true })
    const more = renderListing(themeOf('showcase', ['highest_rated']))
    expect(heading(more, 'Open now').parentElement.querySelector('[data-testid="business-skeleton"]')).toBeNull()
    const later = heading(more, 'Order for later').parentElement
    expect(Array.from(later.querySelectorAll('[data-testid]')).map((el) => el.getAttribute('data-testid')).slice(0, 2)).toEqual(['business-card', 'business-skeleton'])
    more.unmount()
    // all closed while more pages load: no empty "Open now" taking the h1
    setList([store(3, { open: false })], { loading: true })
    const closed = renderListing(themeOf('showcase', ['highest_rated']))
    expect(closed.queryByRole('heading', { name: 'Open now' })).toBeNull()
    expect(heading(closed, 'Order for later').tagName).toBe('H1')
  })

  // computed from the theme: the hero's card spans the content (its side space out), the
  // line under a group's title is the theme's muted text; two themes
  it.each([
    ['lg 24px / muted red', { lg: 24, muted: '#aa0000' }],
    ['lg 16px / muted green', { lg: 16, muted: '#00aa00' }]
  ])('hero width and group line follow the theme: %s', (_label, { lg, muted }) => {
    const theme = themeWithValues((values) => {
      values.components.business_listing_page.base.layout = 'showcase'
      values.tokens.color.text_muted = muted
      values.tokens.space.lg = lg
    })
    const view = renderListing(theme)
    const side = theme.css.tokens.space.lg
    const hero = view.container.querySelector('[data-id="3"]').parentElement
    expect(cssFor(hero)).toContain(`margin:0 -${side}`)
    expect(cssFor(hero)).toContain(`width:calc(100% - 2 * ${side})`)
    const line = view.getByText('Closed right now. Schedule your order for when they open.')
    expect(cssFor(line)).toContain(`color:${theme.values.tokens.color.text_muted}`)
    expect(theme.values.tokens.color.text_muted).toBe(muted)
  })

  it.each(['grid', 'showcase'])('mixed preserves API order in %s with no closed group', (layout) => {
    const theme = themeOf(layout, ['highest_rated'], { closed_stores: 'mixed' })
    const view = renderListing(theme)
    expect(view.queryByRole('heading', { name: 'Order for later' })).toBeNull()
    const listed = view.container.querySelector('[data-doc-section="business-list-results"]')
    expect(cardIds(listed)).toEqual(layout === 'grid' ? ['1', '2', '3', '4', '5'] : ['1', '2', '4', '5'])
  })

  it('shows the featured badge by default on the hero and featured results, and can turn it off', () => {
    const view = renderListing(themeOf('showcase'))
    expect(view.getAllByText('Featured crown')).toHaveLength(2)
    view.unmount()
    const hidden = renderListing(themeOf('showcase', [], { showcase_featured_badge: false }))
    expect(hidden.queryByText('Featured crown')).toBeNull()
  })

  it('opens the same configured filter shortcuts inside the Sheet only when requested', async () => {
    const navigate = vi.fn()
    const view = renderListing(themeOf('showcase', [], { filters: 'sheet' }), { onRedirectPage: navigate })
    expect(view.queryByRole('button', { name: 'Price' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Filters' }))
    const sheet = await view.findByRole('dialog', { name: 'Filters' })
    const price = within(sheet).getByRole('button', { name: 'Price' })
    expect(price).toHaveAttribute('data-slot', 'chip')
    fireEvent.click(price)
    expect(navigate).toHaveBeenCalledWith({ page: 'business_search', search: '?openFilter=price_range' })
  })

  it('the call center keeps the grid', () => {
    const view = renderListing(themeOf('showcase'), { isCustomerMode: true })
    expect(view.queryByRole('heading', { name: 'Open now' })).toBeNull()
    expect(view.queryByRole('heading', { name: 'Order for later' })).toBeNull()
    expect(view.getByRole('heading', { name: 'All Businesses' })).toBeInTheDocument()
  })

  it('the grid theme keeps the carousel and one grid of all the stores', () => {
    const view = renderListing(themeOf('grid'))
    expect(view.getByTestId('featured')).toBeInTheDocument()
    expect(view.queryByRole('heading', { name: 'Open now' })).toBeNull()
    expect(cardIds(view.container)).toEqual(['1', '3', '4', '2', '5'])
  })
})

describe.each(['grid', 'showcase'])('store list, %s: error and empty states', (layout) => {
  beforeEach(() => {
    windowWidth.current = 1300
    orderFixture.address = { address: '1 Main St', location: { lat: 1, lng: 2 } }
    listingFixture.current.getBusinesses.mockClear()
    listingFixture.current.businessTypeSelected = null
  })

  it('an API error shows the message and a retry that asks for the stores from the start', () => {
    setList([], { error: ['boom'] })
    const view = renderListing(themeOf(layout, ['highest_rated']))
    expect(view.getByText("We couldn't load the stores")).toBeInTheDocument()
    expect(view.queryByText('No businesses available at this address')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Retry' }))
    expect(listingFixture.current.getBusinesses).toHaveBeenCalledWith(true)
  })

  it('a request that did not answer (error true) is the same state', () => {
    setList([], { error: true })
    const view = renderListing(themeOf(layout, ['highest_rated']))
    expect(view.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('a later page that fails keeps the stores shown and offers the retry', () => {
    setList([store(1)], { error: true })
    const view = renderListing(themeOf(layout, ['highest_rated']))
    expect(cardIds(view.container)).toEqual(['1'])
    expect(view.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    // it asks for the next page again, keeping the stores already shown
    fireEvent.click(view.getByRole('button', { name: 'Retry' }))
    expect(listingFixture.current.getBusinesses).toHaveBeenCalledWith(false)
  })

  it('with a location but no street the empty state is the one of an address', () => {
    orderFixture.address = { location: { lat: 1, lng: 2 } }
    setList([])
    const view = renderListing(themeOf(layout, ['highest_rated']))
    expect(view.getByText('No businesses available at this address')).toBeInTheDocument()
    expect(view.getByText('Try changing your address or filters.')).toBeInTheDocument()
    expect(view.getByRole('button', { name: 'Change address' })).toBeInTheDocument()
    expect(view.queryByText('Add your address to see businesses near you')).toBeNull()
  })

  it('the location of the query counts too', () => {
    orderFixture.address = {}
    setList([])
    const view = renderListing(themeOf(layout, ['highest_rated']), { customLocation: { lat: 1, lng: 2 } })
    expect(view.getByText('No businesses available at this address')).toBeInTheDocument()
  })

  it('without any place it asks for the address', () => {
    orderFixture.address = {}
    setList([])
    const view = renderListing(themeOf(layout, ['highest_rated']))
    expect(view.getByText('Add your address to see businesses near you')).toBeInTheDocument()
    expect(view.getByRole('button', { name: 'Add address' })).toBeInTheDocument()
  })

  it('the buttons of both states are the base Button', () => {
    setList([], { error: true })
    const failed = renderListing(themeOf(layout, ['highest_rated']))
    expect(failed.getByRole('button', { name: 'Retry' })).toHaveAttribute('data-slot', 'button')
    failed.unmount()
    setList([])
    const empty = renderListing(themeOf(layout, ['highest_rated']))
    expect(empty.getByRole('button', { name: 'Change address' })).toHaveAttribute('data-slot', 'button')
  })
})
