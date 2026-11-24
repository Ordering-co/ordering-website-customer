import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { BusinessListingSearch } from '../index'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

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

const searchTheme = (sections, mutate = (values) => values) => themeWithValues((values) => {
  if (sections) values.pages.business_search = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
  return mutate(values)
})
const renderSearch = (theme) => renderWithProviders(<BusinessListingSearch />, { theme })
const flat = (text) => text.replace(/\s+/g, '')

describe('/business_search sections and product_search', () => {
  beforeEach(() => {
    searchFixture.current.termValue = 'pizza'
    searchFixture.current.isShowMap = false
  })

  it('the order progress, the filter chips and the products can be hidden', () => {
    const shown = renderSearch(searchTheme(null))
    expect(shown.getByTestId('order-progress')).toBeInTheDocument()
    expect(shown.getByText('Price')).toBeInTheDocument()
    expect(shown.getByTestId('product-card')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderSearch(searchTheme([['order_progress', false], ['filters', false], ['products', false]]))
    expect(hidden.queryByTestId('order-progress')).toBeNull()
    expect(hidden.queryByText('Price')).toBeNull()
    expect(hidden.queryByTestId('product-card')).toBeNull()
    // the search and the businesses stay
    expect(hidden.getByTestId('search')).toBeInTheDocument()
    expect(hidden.getByTestId('business-card')).toBeInTheDocument()
  })

  it('a filter chip opens its dialog (data-doc-section, named by the filter); Close closes it', async () => {
    const view = renderSearch(themeWithValues())
    fireEvent.click(view.getByText('Max delivery time'))
    const dialog = await view.findByRole('dialog', { name: 'Max delivery time' })
    expect(dialog).toHaveAttribute('data-doc-section', 'business-search-filter-dialog')
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
  })

  it('by default: all of them', () => {
    const view = renderSearch(themeWithValues())
    expect(view.getByTestId('order-progress')).toBeInTheDocument()
    expect(view.getByText('Price')).toBeInTheDocument()
    expect(view.getByTestId('product-card')).toBeInTheDocument()
  })

  it('the group of a business over its products (product_search: logo, name, meta, go_to_store)', () => {
    const theme = searchTheme(null, (values) => {
      values.components.product_search.base = {
        ...values.components.product_search.base,
        logo_size: 64,
        logo_radius: 6,
        name: { size: 17, line: 1.35, weight: 700 },
        name_color: '#112233',
        meta: { size: 13, line: 1.46, weight: 400 },
        meta_color: '#445566'
      }
      values.components.product_search.slots.go_to_store = { ...values.components.product_search.slots.go_to_store, color: 'secondary' }
      // the fixture's business has no logo: visibility.business.dummy_logo on, so the placeholder paints (and can be styled)
      values.visibility = { ...values.visibility, 'business.dummy_logo': true }
      return values
    })
    const view = renderSearch(theme)
    // a section of the page under its h1 (an h2; the look of product_search)
    const name = view.getByRole('heading', { level: 2, name: 'Search Cafe' })
    expect(name).toHaveStyle({ fontSize: '17px', color: '#112233' })
    const info = name.closest('div').parentElement
    const logo = info.firstElementChild
    const logoCss = flat(cssFor(logo))
    expect(logoCss).toContain('border-radius:6px;')
    expect(logoCss).toMatch(/@media\(min-width:576px\)\{[^}]*width:64px;min-width:64px;height:64px;/)
    const meta = name.nextElementSibling
    const metaCss = flat(cssFor(meta))
    expect(metaCss).toContain('color:#445566;')
    expect(metaCss).toMatch(/@media\(min-width:576px\)\{[^}]*font-size:13px;line-height:1\.46;/)
    const go = within(info).getByRole('button', { name: 'Go to the store' })
    // the base Button of the slot's color
    expect(go).toHaveAttribute('data-slot', 'button')
    expect(go.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'solid' })['--ui-button-background'])
  })

  it('business_card.fee, time and distance hide the meta of each business of the results', () => {
    const metaOf = (theme) => {
      const view = renderSearch(theme)
      const text = view.getByRole('heading', { level: 2, name: 'Search Cafe' }).nextElementSibling.textContent
      view.unmount()
      return text
    }
    const shown = metaOf(searchTheme(null))
    expect(shown).toContain('20')
    expect(shown).toContain('1.2mi')
    const hidden = metaOf(searchTheme(null, (values) => ({
      ...values,
      visibility: { ...values.visibility, 'business_card.fee': false, 'business_card.time': false, 'business_card.distance': false }
    })))
    expect(hidden).toBe('')
  })

  it('the listing title is a section header (section_header)', () => {
    searchFixture.current.termValue = ''
    const view = renderSearch(searchTheme(null, (values) => {
      values.components.section_header.variants.page.title = { size: 31, line: 1.26, weight: 700 }
      values.components.section_header.base.title_color = '#654321'
      return values
    }))
    // the same text (key ALL_BUSINESSES) as the list's title in /search
    const title = view.getByText('All Businesses')
    expect(title.tagName).toBe('H1')
    expect(title).toHaveStyle({ fontSize: '31px', color: '#654321' })
  })
})

describe('/business_search product results: the business logo (visibility product_search.logo)', () => {
  const business = () => searchFixture.current.businessesSearchList.businesses[0]
  const logo = (view) => view.container.querySelector('[style*="biz-logo.png"]')
  beforeEach(() => {
    searchFixture.current.termValue = 'pizza'
    searchFixture.current.isShowMap = false
    business().logo = 'https://img/biz-logo.png'
  })
  afterEach(() => { business().logo = '' })

  it('shown by default, hidden by the key', () => {
    const shown = renderSearch(searchTheme(null))
    expect(logo(shown)).not.toBeNull()
    shown.unmount()
    const hidden = renderSearch(searchTheme(null, (values) => {
      values.visibility['product_search.logo'] = false
      return values
    }))
    expect(logo(hidden)).toBeNull()
    expect(hidden.getByRole('heading', { name: 'Search Cafe' })).toBeInTheDocument()
  })
})

describe('/business_search sections off by default: promo_banners, highest_rated, featured, previous_orders', () => {
  const OPTIONAL = ['page-banner', 'highest', 'featured', 'previous-orders']
  const allOn = () => searchTheme([['promo_banners', true], ['highest_rated', true], ['featured', true], ['previous_orders', true]])
  // whether `a` comes before `b` in the page
  const before = (view, a, b) => !!(view.getByTestId(a).compareDocumentPosition(view.getByTestId(b)) & Node.DOCUMENT_POSITION_FOLLOWING)
  beforeEach(() => {
    searchFixture.current.termValue = ''
    searchFixture.current.isShowMap = false
  })
  afterEach(() => {
    searchFixture.current.termValue = 'pizza'
  })

  it('by default none of them', () => {
    const view = renderSearch(themeWithValues())
    OPTIONAL.forEach((id) => expect(view.queryByTestId(id)).toBeNull())
    expect(view.getByTestId('business-card')).toBeInTheDocument()
  })

  it('turned on, each one shows, in the page\'s order, before the results', () => {
    const view = renderSearch(allOn())
    OPTIONAL.forEach((id) => expect(view.getByTestId(id)).toBeInTheDocument())
    expect(before(view, 'page-banner', 'highest')).toBe(true)
    expect(before(view, 'highest', 'featured')).toBe(true)
    expect(before(view, 'featured', 'previous-orders')).toBe(true)
    expect(before(view, 'previous-orders', 'business-card')).toBe(true)
    // the previous orders of the search: its stores and products tabs
    expect(view.getByTestId('previous-orders')).toHaveAttribute('data-hide-orders', 'true')
  })

  it('each one alone', () => {
    [['promo_banners', 'page-banner'], ['highest_rated', 'highest'], ['featured', 'featured'], ['previous_orders', 'previous-orders']].forEach(([key, id]) => {
      const view = renderSearch(searchTheme([[key, true]]))
      expect(view.getByTestId(id)).toBeInTheDocument()
      OPTIONAL.filter((other) => other !== id).forEach((other) => expect(view.queryByTestId(other)).toBeNull())
      view.unmount()
    })
  })

  it('the previous orders only without a term; none of them on the map; a franchise has no carousels', () => {
    searchFixture.current.termValue = 'pizza'
    const typed = renderSearch(allOn())
    expect(typed.queryByTestId('previous-orders')).toBeNull()
    expect(typed.getByTestId('highest')).toBeInTheDocument()
    typed.unmount()
    searchFixture.current.termValue = ''
    searchFixture.current.isShowMap = true
    const map = renderSearch(allOn())
    OPTIONAL.forEach((id) => expect(map.queryByTestId(id)).toBeNull())
    map.unmount()
    searchFixture.current.isShowMap = false
    const franchise = renderWithProviders(<BusinessListingSearch franchiseId='franchise' />, { theme: allOn() })
    expect(franchise.queryByTestId('highest')).toBeNull()
    expect(franchise.queryByTestId('featured')).toBeNull()
    expect(franchise.getByTestId('page-banner')).toBeInTheDocument()
  })
})
