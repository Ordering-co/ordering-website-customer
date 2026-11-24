import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { classicStoreTheme, themeWithValues as baseThemeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { RenderProductsLayout } from '../index'

// These tests read the sections around the menu of the `classic` store page (its menu is StoreMenu, mocked here:
// storeMenu.test.jsx) and, with `useKioskApp`, the legacy bar of categories that the kiosk keeps.
const renderClassic = (ui, options = {}) => renderWithProviders(ui, { theme: classicStoreTheme(), ...options })
const themeWithValues = (mutate = (values) => values) => baseThemeWithValues((values) => {
  values.components.store_page.base.template = 'classic'
  return mutate(values) ?? values
})

// The sections of the business page (pages.business): hidden and ordered by
// the theme.

const viewport = vi.hoisted(() => ({ width: 1024, height: 768 }))
const categoriesProps = vi.hoisted(() => ({ current: null }))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => viewport
}))
vi.mock('~ui/src/components/BusinessBasicInformation', () => ({
  BusinessBasicInformation: () => <div data-testid='business_header' />
}))
vi.mock('../StoreMenu', () => ({
  StoreMenu: () => <div data-testid='menu' />
}))
vi.mock('~ui/src/components/BusinessProductsCategories', () => ({
  BusinessProductsCategories: (props) => {
    categoriesProps.current = props
    return <div data-testid='categories' />
  }
}))
vi.mock('~ui/src/components/BusinessProductsList', () => ({
  BusinessProductsList: () => <div data-testid='menu' />
}))
vi.mock('~ui/src/components/BusinessProductsCategories/layouts/groceries', () => ({
  BusinessProductsCategories: () => <div data-testid='groceries-categories' />
}))
vi.mock('~ui/src/components/FreeDeliveryProgress', () => ({
  FreeDeliveryProgress: () => <div data-testid='free_delivery_banner' />
}))
vi.mock('~ui/src/components/StudentSelector', () => ({
  StudentSelector: () => <div data-testid='student_selector' />
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: () => <div data-testid='offers_banner' />
}))
vi.mock('~ui/src/components/OrderItAgain', () => ({
  OrderItAgain: () => <div data-testid='order_it_again' />
}))
vi.mock('~ui/src/components/BusinessReviews', () => ({
  BusinessReviews: () => <div data-testid='reviews' />
}))
vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: () => <div data-testid='product' />
}))
vi.mock('~ui/src/components/BusinessesListing', () => ({
  BusinessesListing: () => <div data-testid='near_business' />
}))
vi.mock('~ui/src/components/CategoriesPopover', () => ({
  CategoriesPopover: () => null
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/SearchProducts', () => ({ SearchProducts: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: () => null
}))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))

const business = {
  ...businessFixture,
  vertical: 'school',
  previously_products: [{ id: 1, name: 'Again' }],
  reviews: { reviews: [{ id: 1 }], total: 4 },
  categories: [{ id: 5, name: 'Burgers', rank: 1 }]
}

const props = {
  business,
  businessState: { business, loading: false },
  categoryState: { products: [{ id: 1, featured: true }], loading: false },
  categorySelected: null,
  isLoading: false,
  isError: false,
  currentCart: {},
  onClickCategory: vi.fn(),
  onProductClick: vi.fn(),
  handler: {},
  featuredProducts: true,
  freeDeliveryProgress: { status: 'awareness' }
}

const SECTION_IDS = ['near_business', 'business_header', 'free_delivery_banner', 'student_selector', 'offers_banner', 'order_it_again', 'reviews', 'menu']

// The sections painted, in the order of the page.
// (the featured products are the menu's first section in this design, not a section of the page)
const paintedSections = (container) => Array.from(container.querySelectorAll('[data-testid]'))
  .map((el) => el.getAttribute('data-testid'))
  .filter((id) => SECTION_IDS.includes(id))

const withSections = (sections) => themeWithValues((values) => {
  values.pages.business.sections = sections
  return values
})

beforeEach(() => {
  viewport.width = 1024
  categoriesProps.current = null
})

describe('business page sections (pages.business)', () => {
  it('by default: the order of today, order it again and the near businesses hidden', () => {
    const { container } = renderClassic(<RenderProductsLayout {...props} />, { theme: themeWithValues() })
    expect(paintedSections(container)).toEqual(['business_header', 'free_delivery_banner', 'student_selector', 'offers_banner', 'reviews', 'menu'])
  })

  it('the main group in the theme\'s order; the header first and the menu last', () => {
    const theme = withSections([
      { key: 'menu', visible: true },
      { key: 'reviews', visible: true },
      { key: 'order_it_again', visible: true },
      { key: 'featured_products', visible: true },
      { key: 'student_selector', visible: true },
      { key: 'offers_banner', visible: true },
      { key: 'free_delivery_banner', visible: true },
      { key: 'business_header', visible: true }
    ])
    const { container } = renderClassic(<RenderProductsLayout {...props} />, { theme })
    expect(paintedSections(container)).toEqual(['business_header', 'reviews', 'order_it_again', 'student_selector', 'offers_banner', 'free_delivery_banner', 'menu'])
  })

  it('hides the sections the theme hides, never the student selector or the menu; the store header stays (its section hides only its cover)', () => {
    const theme = withSections([
      { key: 'near_business', visible: true },
      { key: 'free_delivery_banner', visible: false },
      { key: 'student_selector', visible: false },
      { key: 'offers_banner', visible: false },
      { key: 'featured_products', visible: false },
      { key: 'reviews', visible: false },
      { key: 'business_header', visible: false },
      { key: 'menu', visible: false }
    ])
    const { container } = renderClassic(<RenderProductsLayout {...props} />, { theme })
    expect(paintedSections(container)).toEqual(['near_business', 'business_header', 'student_selector', 'menu'])
  })

  it('the business conditions still apply: no reviews, no reviews section', () => {
    const noReviews = { ...business, reviews: { reviews: [] } }
    const { container } = renderClassic(
      <RenderProductsLayout {...props} business={noReviews} businessState={{ business: noReviews, loading: false }} />,
      { theme: themeWithValues() }
    )
    expect(screen.queryByTestId('reviews')).not.toBeInTheDocument()
    expect(paintedSections(container)).toContain('menu')
  })
})

describe('category bar: the menu tab (category_tabs); no "All" tab', () => {
  const ids = () => categoriesProps.current.categories.map((category) => category.id)

  it('by default: the menu before the categories, no "All" tab', () => {
    renderClassic(<RenderProductsLayout {...props} useKioskApp />, { theme: themeWithValues() })
    expect(ids()).toEqual([-1, 5])
  })

  it('with visibility business.categories.all true there is still no "All" tab (only the groceries list has it)', () => {
    const theme = themeWithValues((values) => {
      values.visibility['business.categories.all'] = true
      return values
    })
    renderClassic(<RenderProductsLayout {...props} useKioskApp />, { theme })
    expect(ids()).toEqual([-1, 5])
  })

  it('without the menu (visibility business.categories.menu)', () => {
    const theme = themeWithValues((values) => {
      values.visibility['business.categories.all'] = false
      values.visibility['business.categories.menu'] = false
      return values
    })
    renderClassic(<RenderProductsLayout {...props} useKioskApp />, { theme })
    expect(ids()).toEqual([5])
  })
})
