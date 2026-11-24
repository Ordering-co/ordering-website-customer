import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { RenderProductsLayout } from '../index'
import { classicStoreTheme, noCartColumnStoreTheme, themeWithValues as baseThemeWithValues } from '../../../styles/__tests__/themeTestUtils'

// These tests read the sections around the menu of the `classic` store page (its menu is StoreMenu, mocked here:
// storeMenu.test.jsx) and, with `useKioskApp`, the legacy bar and popover of categories that the kiosk keeps.
const renderClassic = (ui, options = {}) => renderWithProviders(ui, { theme: classicStoreTheme(), ...options })
const themeWithValues = (mutate = (values) => values) => baseThemeWithValues((values) => {
  values.components.store_page.base.template = 'classic'
  return mutate(values) ?? values
})

const viewport = vi.hoisted(() => ({ width: 1024, height: 768 }))
const config = vi.hoisted(() => ({ configs: {} }))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => viewport
}))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: config.configs }]
}))

vi.mock('~ui/src/components/BusinessBasicInformation', () => ({
  BusinessBasicInformation: () => <div data-testid='basic-info' />
}))
vi.mock('~ui/src/components/BusinessProductsCategories', () => ({
  BusinessProductsCategories: () => <div data-testid='categories' />
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: () => null
}))
const menuProps = vi.hoisted(() => ({ current: null }))
vi.mock('../StoreMenu', () => ({
  StoreMenu: (props) => {
    menuProps.current = props
    return <div data-testid='products-list' />
  }
}))
vi.mock('~ui/src/components/BusinessProductsList', () => ({
  BusinessProductsList: () => <div data-testid='products-list' />
}))
const scrolled = vi.hoisted(() => ({ calls: [] }))
vi.mock('~ui/src/components/BusinessProductsCategories/scrollToCategory', () => ({
  scrollToCategory: (element) => scrolled.calls.push(element)
}))
const groceriesCategories = vi.hoisted(() => ({ props: [] }))
vi.mock('~ui/src/components/BusinessProductsCategories/layouts/groceries', () => ({
  BusinessProductsCategories: (props) => {
    groceriesCategories.props.push(props)
    return <div data-testid='groceries-categories' />
  }
}))
vi.mock('~ui/src/components/Cart', () => ({
  Cart: ({ freeDeliveryProgress }) => (
    <div data-testid='cart' data-progress-status={freeDeliveryProgress?.status} />
  )
}))
vi.mock('~ui/src/components/FreeDeliveryProgress', () => ({
  FreeDeliveryProgress: ({ status, variant }) => status === 'hidden'
    ? null
    : <div data-testid='free-delivery-progress' data-status={status} data-variant={variant} />
}))
vi.mock('~ui/src/components/CategoriesPopover', () => ({
  CategoriesPopover: ({ CategoriesPopoverUI }) => <CategoriesPopoverUI />
}))
vi.mock('~ui/src/components/SearchProducts', () => ({
  SearchProducts: () => <div data-testid='search-products' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null)
}))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))

describe('RenderProductsLayout', () => {
  const baseProps = {
    business: businessFixture,
    businessState: { business: businessFixture, loading: false },
    categoryState: { products: [], loading: false },
    categorySelected: { id: 1, name: 'Menu' },
    categories: [{ id: 1, name: 'Menu' }],
    isLoading: false,
    isError: false,
    currentCart: {},
    onClickCategory: vi.fn(),
    onProductClick: vi.fn(),
    handler: {},
    featuredProducts: []
  }

  beforeEach(() => {
    viewport.width = 1024
    viewport.height = 768
    config.configs = {}
  })

  it('renders basic info and products list when loaded', () => {
    const { getByTestId } = renderClassic(
      <RenderProductsLayout {...baseProps} />
    )
    expect(getByTestId('basic-info')).toBeInTheDocument()
    expect(getByTestId('products-list')).toBeInTheDocument()
  })

  // implementation notesthe direct menu without the cart column hands its menu no cart panel
  it('the direct menu gets the cart panel; the direct menu without the cart column does not', () => {
    renderWithProviders(<RenderProductsLayout {...baseProps} />)
    expect(menuProps.current.variant).toBe('menu')
    expect(menuProps.current.cart).toBeTruthy()
    renderWithProviders(<RenderProductsLayout {...baseProps} />, { theme: noCartColumnStoreTheme() })
    expect(menuProps.current.variant).toBe('menu')
    expect(menuProps.current.cart).toBeFalsy()
  })

  it('renders desktop awareness after business information when the inline cart is disabled', () => {
    renderClassic(
      <RenderProductsLayout
        {...baseProps}
        freeDeliveryProgress={{ status: 'awareness', minimum: 25 }}
      />
    )

    const info = screen.getByTestId('basic-info')
    const awareness = screen.getByTestId('free-delivery-progress')
    // the first of the sections that follow the business (one box, pages.business)
    expect(info.nextElementSibling.firstElementChild).toBe(awareness)
    expect(awareness).toHaveAttribute('data-status', 'awareness')
    expect(awareness).toHaveAttribute('data-variant', 'full')
  })

  it('renders mobile awareness immediately after business information', () => {
    viewport.width = 375
    renderClassic(
      <RenderProductsLayout
        {...baseProps}
        freeDeliveryProgress={{ status: 'awareness', minimum: 25 }}
      />
    )

    const info = screen.getByTestId('basic-info')
    const awareness = screen.getByTestId('free-delivery-progress')
    // the first of the sections that follow the business (one box, pages.business)
    expect(info.nextElementSibling.firstElementChild).toBe(awareness)
  })

  it('the store\'s banner follows only its section: visibility cart.free_delivery_progress (the cart\'s places) leaves it', () => {
    const progress = { status: 'awareness', minimum: 25 }
    const keyOff = themeWithValues((values) => { values.visibility['cart.free_delivery_progress'] = false; return values })
    const shown = renderClassic(<RenderProductsLayout {...baseProps} freeDeliveryProgress={progress} />, { theme: keyOff })
    expect(shown.getByTestId('free-delivery-progress')).toHaveAttribute('data-variant', 'full')
    shown.unmount()
    const sectionOff = themeWithValues((values) => {
      values.pages.business.sections = [{ key: 'free_delivery_banner', visible: false }]
      return values
    })
    renderClassic(<RenderProductsLayout {...baseProps} freeDeliveryProgress={progress} />, { theme: sectionOff })
    expect(screen.queryByTestId('free-delivery-progress')).toBeNull()
  })

  it('covers the tablet empty-cart gap with the same single awareness strip', () => {
    viewport.width = 768
    renderClassic(
      <RenderProductsLayout
        {...baseProps}
        freeDeliveryProgress={{ status: 'awareness', minimum: 25 }}
      />
    )

    expect(screen.getAllByTestId('free-delivery-progress')).toHaveLength(1)
    expect(screen.getByTestId('basic-info').nextElementSibling.firstElementChild).toBe(screen.getByTestId('free-delivery-progress'))
  })

  // A store with front_layout=groceries is painted as food: the chosen design's menu, never the groceries list.
  it.each([['1'], [undefined]])('a groceries store (use_parent_category %s) renders the same page as a food store', (parentCategory) => {
    config.configs = parentCategory ? { use_parent_category: { value: parentCategory } } : {}
    const page = (frontLayout) => {
      const business = { ...businessFixture, front_layout: frontLayout, categories: [{ id: 1, name: 'Menu' }] }
      const { container, unmount } = renderClassic(
        <RenderProductsLayout
          {...baseProps}
          business={business}
          businessState={{ business, loading: false }}
          freeDeliveryProgress={{ status: 'awareness', minimum: 25 }}
        />
      )
      const html = container.innerHTML
      unmount()
      return html
    }

    const food = page('food')
    expect(page('groceries')).toBe(food)
    expect(food).toContain('products-list')
    expect(food).not.toContain('groceries')
  })

  it('preserves the default desktop layout without enabling the dormant inline cart', () => {
    renderClassic(
      <RenderProductsLayout
        {...baseProps}
        currentCart={{ products: [{ id: 10 }] }}
        freeDeliveryProgress={{ status: 'progress', minimum: 25, remainingAmount: 15 }}
      />
    )

    expect(screen.queryByTestId('cart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('free-delivery-progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('products-list')).toBeInTheDocument()
  })

  it('preserves an explicitly hidden desktop cart without duplicating awareness', () => {
    const classic = classicStoreTheme()
    const theme = {
      ...classic,
      business_view: {
        ...classic.business_view,
        components: {
          ...classic.business_view?.components,
          cart: { components: { hidden: true } }
        }
      }
    }

    renderClassic(
      <RenderProductsLayout
        {...baseProps}
        currentCart={{ products: [{ id: 10 }] }}
        freeDeliveryProgress={{ status: 'progress', minimum: 25, remainingAmount: 15 }}
      />,
      { theme }
    )

    expect(screen.queryByTestId('cart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('free-delivery-progress')).not.toBeInTheDocument()
  })

  it.each([
    ['Pickup', { status: 'hidden', diagnosticReason: 'not-delivery' }],
    ['request error', { status: 'hidden', diagnosticReason: 'request-error' }]
  ])('keeps the module hidden for %s while the product list remains available', (_name, progress) => {
    viewport.width = 375
    renderClassic(
      <RenderProductsLayout {...baseProps} freeDeliveryProgress={progress} />
    )

    expect(screen.queryByTestId('free-delivery-progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('products-list')).toBeInTheDocument()
  })

  describe('the kiosk keeps the legacy popover of categories', () => {
    // implementation notesthe bar's Categories menu does what a tab does
    it('in the default layout, a category with a section picked from the popover goes to its section and filters nothing', async () => {
      scrolled.calls = []
      groceriesCategories.props = []
      baseProps.onClickCategory.mockClear()
      const section = document.body.appendChild(document.createElement('section'))
      section.id = 'category7'
      renderClassic(<RenderProductsLayout {...baseProps} categorySelected={null} useKioskApp />, { theme: themeWithValues() })
      const popover = () => groceriesCategories.props.filter((p) => p.isPopover).at(-1)
      act(() => popover().onClickCategory({ id: 7 }))
      await waitFor(() => expect(scrolled.calls).toEqual([section]))
      expect(baseProps.onClickCategory).not.toHaveBeenCalled()
      section.remove()
    })

    it('in the default layout, a category with no section (a subcategory) still filters the menu, with its way back', () => {
      scrolled.calls = []
      groceriesCategories.props = []
      baseProps.onClickCategory.mockClear()
      renderClassic(<RenderProductsLayout {...baseProps} categorySelected={null} useKioskApp />, { theme: themeWithValues() })
      const popover = () => groceriesCategories.props.filter((p) => p.isPopover).at(-1)
      act(() => popover().onClickCategory({ id: 99 }))
      expect(baseProps.onClickCategory).toHaveBeenCalledWith({ id: 99 })
      expect(scrolled.calls.at(-1)?.id).toBe('wrapper-categories')
    })
  })
})

// These two legacy cart surfaces are wired off in this layout. Check both
// call sites because the empty state would otherwise have an inert tab stop.
it('renders the empty status as non-interactive text in both cart surfaces', () => {
  const source = readFileSync(resolve('src/ui/src/components/RenderProductsLayout/index.js'), 'utf8')
  const emptyStates = source.match(/<EmptyCartMessage role='status'>\{t\('EMPTY_CART', 'Empty cart'\)\}<\/EmptyCartMessage>/g)
  expect(emptyStates ?? []).toHaveLength(2)
  expect(source).not.toMatch(/<Button[^>]*>\{t\('EMPTY_CART'/)
})
