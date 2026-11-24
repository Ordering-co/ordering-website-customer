import React from 'react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { BusinessListingSearch } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

// implementation notes"Load more business", "Go to the store" and the filter modal's "View Results" are
// the design system's Button ("Go to the store" with product_search.slots.go_to_store, neutral
// without a slot color, as the legacy button without a color was).

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/utils', () => ({
  generalUtilities: () => ({
    getOrderStatus: () => 'pending',
    convertHoursToMinutes: (v) => v
  }),
  checkSiteUrl: (_u, f) => f,
  removeQueryToUrl: vi.fn(),
  capitalize: (s) => s,
  getCateringValues: () => ({})
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder, search, onSearch, onSearchStart }) => (
    <input
      data-testid='search'
      placeholder={placeholder}
      value={search || ''}
      onChange={(e) => {
        onSearchStart?.(e.target.value)
        onSearch?.(e.target.value)
      }}
    />
  )
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, handleCustomClick, isSkeleton }) => (
    (isSkeleton || !business?.id)
      ? <div data-testid='business-skeleton' />
      : (
        <button type='button' data-testid='business-card' onClick={() => handleCustomClick?.(business)}>
          {business?.name}
        </button>
        )
  )
}))
vi.mock('~ui/src/components/BusinessTypeFilter', () => ({
  BusinessTypeFilter: ({ handleChangeBusinessType }) => (
    <button type='button' data-testid='type-filter' onClick={() => handleChangeBusinessType?.(1)}>types</button>
  )
}))
vi.mock('~ui/src/components/MyOrders', () => ({ MyOrders: ({ hideOrders }) => <div data-testid='previous-orders' data-hide-orders={String(!!hideOrders)} /> }))
vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product, onProductClick }) => (
    <button type='button' data-testid='product-card' onClick={() => onProductClick?.(product)}>
      {product?.name}
    </button>
  )
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, children }) => (
    <div data-testid='empty'>{content}{children}</div>
  )
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, onClose, title }) => (
    open
      ? (
        <div data-testid='modal' data-title={title}>
          <button type='button' data-testid='modal-close' onClick={onClose}>close</button>
          {children}
        </div>
        )
      : null
  )
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: ({ onSave }) => (
    <button type='button' data-testid='product-form' onClick={() => onSave?.({}, 'OK')}>save</button>
  )
}))
vi.mock('~ui/src/components/PageBanner', () => ({ PageBanner: () => <div data-testid='page-banner' /> }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/HighestRated', () => ({ HighestRated: ({ isFeatured }) => <div data-testid={isFeatured ? 'featured' : 'highest'} /> }))
vi.mock('~ui/src/components/OrderProgress', () => ({ OrderProgress: () => <div data-testid='order-progress' /> }))
vi.mock('~ui/src/components/Locations', () => ({ Locations: () => <div data-testid='locations' /> }))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))
vi.mock('../MaxSectionItem', () => ({
  MaxSectionItem: ({ title, handleChangeFilters, filter }) => (
    <button type='button' data-testid={`max-${filter}`} onClick={() => handleChangeFilters?.(filter, 5)}>
      {title}
    </button>
  )
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{
    parsePrice: (v) => `$${v}`,
    parseDistance: (v) => `${v}mi`,
    optimizeImage: (url) => url,
    parseDate: () => 'now'
  }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      filter_search_options: { value: 'price_range|brands|max_delivery_fee|max_delivery_time|max_distance|business_categories' },
      distance_unit: { value: 'mi' },
      format_number_currency: { value: '$' }
    }
  }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
}))

const searchFixture = vi.hoisted(() => ({
  current: {
    businessesSearchList: {
      loading: false,
      error: null,
      businesses: [{
        id: 1,
        name: 'Search Cafe',
        products: [{ id: 11, name: 'Pizza' }],
        categories: [{ id: 1, products: [{ id: 11, name: 'Pizza' }] }],
        open: true,
        reviews: { total: 4 },
        location: { lat: 30, lng: -97 },
        logo: '',
        delivery_time: '20',
        delivery_price: 2,
        distance: 1.2,
        slug: 'search-cafe'
      }]
    },
    onBusinessClick: vi.fn(),
    handleChangeFilters: vi.fn(),
    filters: { business_types: [], orderBy: 'default', franchise_ids: [], price_level: null },
    handleChangeTermValue: vi.fn(),
    termValue: 'pizza',
    paginationProps: { currentPage: 1, totalPages: 2 },
    handleSearchbusinessAndProducts: vi.fn(),
    brandList: { loading: false, brands: [{ id: 7, name: 'Brand A', enabled: true }] },
    onRedirectPage: vi.fn(),
    onProductRedirect: vi.fn(),
    handleUpdateBusinessList: vi.fn(),
    handleUpdateProducts: vi.fn(),
    businessUrlTemplate: '/store/:business_slug',
    isShowMap: false
  }
}))

vi.mock('~components/components/BusinessSearchList', () => ({
  BusinessSearchList: ({ UIComponent, ...rest }) => (
    <UIComponent {...searchFixture.current} {...rest} />
  )
}))

const varOf = (el, name) => el.style.getPropertyValue(name)
const render = (theme = themeWithValues()) => renderWithProviders(<BusinessListingSearch />, { theme })

beforeEach(() => {
  searchFixture.current.termValue = 'pizza'
  searchFixture.current.handleSearchbusinessAndProducts.mockClear()
  searchFixture.current.onBusinessClick.mockClear()
})

describe('BusinessListingSearch: its buttons are the base Button', () => {
  it('"Load more business": outline md, it asks for the next page', () => {
    const theme = themeWithValues()
    const { getByRole } = render(theme)
    const more = getByRole('button', { name: 'Load more business' })
    expect(more).toHaveAttribute('data-slot', 'button')
    expect(more).toHaveClass('load-orders')
    const look = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' })
    ;['--ui-button-height', '--ui-button-border'].forEach((name) => expect(varOf(more, name)).toBe(look[name] ?? ''))
    fireEvent.click(more)
    expect(searchFixture.current.handleSearchbusinessAndProducts).toHaveBeenCalledWith(false, {}, 'pizza')
  })

  it('"Go to the store": the slot\'s options (another theme, another look), it opens the store', () => {
    const goIn = (theme) => {
      const view = render(theme)
      const go = view.getByRole('button', { name: 'Go to the store' })
      expect(go).toHaveAttribute('data-slot', 'button')
      // no unlayered max-width of the row voids the piece's own cap
      expect(cssFor(go.parentElement).replace(/\s+/g, '')).not.toContain('max-width:none')
      fireEvent.click(go)
      const value = varOf(go, '--ui-button-background')
      view.unmount()
      return value
    }
    const plain = themeWithValues()
    const slot = plain.values.components.product_search.slots.go_to_store ?? {}
    const slotted = themeWithValues((values) => {
      values.components.product_search.slots.go_to_store = { ...values.components.product_search.slots.go_to_store, color: 'secondary', appearance: 'solid' }
      return values
    })
    const a = goIn(plain)
    const b = goIn(slotted)
    expect(a).toBe(componentVars(plain, 'button', { size: slot.size ?? 'md', color: slot.color ?? 'neutral', appearance: slot.appearance ?? 'solid' })['--ui-button-background'])
    expect(b).toBe(componentVars(slotted, 'button', { size: slot.size ?? 'md', color: 'secondary', appearance: 'solid' })['--ui-button-background'])
    expect(a).not.toBe(b)
    expect(searchFixture.current.onBusinessClick).toHaveBeenCalledTimes(2)
  })

  it('"View Results" of the filter modal: primary solid lg, it closes the modal', () => {
    const theme = themeWithValues()
    const view = render(theme)
    fireEvent.click(view.getByText('Price'))
    const modal = view.getByTestId('modal')
    const results = within(modal).getByRole('button', { name: 'View Results' })
    expect(results).toHaveAttribute('data-slot', 'button')
    expect(varOf(results, '--ui-button-height')).toBe(componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })['--ui-button-height'])
    fireEvent.click(results)
    expect(view.queryByTestId('modal')).toBeNull()
  })
})

// implementation notes B2: the sort list is a named group, and the direction is announced by the active option
describe('BusinessListingSearch: the sort list', () => {
  const openSort = (orderBy) => {
    searchFixture.current.filters = { ...searchFixture.current.filters, orderBy }
    window.history.pushState({}, '', '/?openFilter=sort')
    return render()
  }
  afterEach(() => {
    window.history.pushState({}, '', '/')
    searchFixture.current.filters = { ...searchFixture.current.filters, orderBy: 'default' }
    searchFixture.current.handleChangeFilters.mockClear()
  })

  it('is a group named Sort By; the active option says its direction, and choosing it again reverses it', () => {
    searchFixture.current.handleChangeFilters.mockClear()
    const up = openSort('distance')
    const group = up.getByRole('radiogroup', { name: 'Sort By' })
    const active = within(group).getByRole('radio', { name: /Picked for you/ })
    expect(active).toHaveAttribute('aria-checked', 'true')
    expect(active).toHaveAccessibleDescription('Ascending order')
    // the other options say nothing of a direction
    expect(within(group).getByRole('radio', { name: 'Delivery time' })).not.toHaveAccessibleDescription()
    fireEvent.click(active)
    expect(searchFixture.current.handleChangeFilters).toHaveBeenCalledWith('orderBy', 'distance')
    searchFixture.current.handleChangeFilters.mockClear()
    active.focus()
    fireEvent.keyDown(active, { key: ' ' })
    fireEvent.keyUp(active, { key: ' ' })
    expect(searchFixture.current.handleChangeFilters).toHaveBeenCalledWith('orderBy', 'distance')
    up.unmount()
    const down = openSort('-distance')
    expect(within(down.getByRole('radiogroup', { name: 'Sort By' })).getByRole('radio', { name: /Picked for you/ })).toHaveAccessibleDescription('Descending order')
  })
})
