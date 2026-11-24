import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss } from '../../../styles/__tests__/themeTestUtils'
import { StoreMenu } from '../StoreMenu'
import { StoreClosedCard } from '../StoreClosedCard'

// The store page's designs (menu_index and menu_index_no_cart: the direct menu, showcase: the visual showcase, classic: cover and
// tabs): the products as rows, tiles or cards under their categories, the "+" of each, the search, and the closed store's notice.

const viewport = vi.hoisted(() => ({ width: 390, height: 844 }))
const order = vi.hoisted(() => ({ options: { type: 2, moment: null } }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => viewport }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [order, {}] }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: ({ content }) => <div data-testid='not-found'>{content}</div> }))

const categories = [{ id: 1, name: 'Burgers' }, { id: 2, name: 'Drinks' }]
const products = [
  { id: 11, name: 'Cheeseburger', description: 'With cheese', price: 9, category_id: 1, images: 'a.jpg', featured: true },
  { id: 12, name: 'Veggie burger', price: 8, category_id: 1, images: 'b.jpg' },
  { id: 21, name: 'Lemonade', price: 3, category_id: 2, images: 'c.jpg' },
  { id: 22, name: 'Sold out soda', price: 3, category_id: 2, inventoried: true, quantity: 0 }
]
const base = {
  categories,
  business: { id: 1 },
  currentCart: {},
  featured: true,
  categoryState: { products, loading: false },
  categorySelected: null,
  searchValue: '',
  handleChangeSearch: vi.fn(),
  onClickCategory: vi.fn(),
  onProductClick: vi.fn(),
  onProductAdd: vi.fn()
}

beforeEach(() => {
  viewport.width = 390
  vi.clearAllMocks()
})

describe('the direct menu (menu)', () => {
  it('a section per category with its products as rows, the featured ones first as tiles', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    expect(screen.getByRole('heading', { level: 2, name: 'Featured Items' })).toBeInTheDocument()
    expect(document.getElementById('categoryfeatured').querySelectorAll('[data-doc-section=business-product-tile]')).toHaveLength(1)
    const burgers = document.getElementById('category1')
    expect(within(burgers).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Cheeseburger', 'Veggie burger'])
    expect(burgers.querySelectorAll('[data-doc-section=business-product-row]')).toHaveLength(2)
  })

  it('the categories are tabs and the search is the store\'s own', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Featured Items', 'Burgers', 'Drinks'])
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Products' }), { target: { value: 'soup' } })
    expect(base.handleChangeSearch).toHaveBeenCalledWith('soup')
  })

  it('from the desktop cut the categories are a list beside the menu, and the cart is beside it', () => {
    viewport.width = 1280
    renderWithProviders(<StoreMenu {...base} variant='menu' cart={<div data-testid='cart-slot' />} />)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    const nav = screen.getByRole('navigation', { name: 'Categories' })
    expect(within(nav).getAllByRole('button').map(button => button.textContent)).toEqual(['Featured Items', 'Burgers', 'Drinks'])
    expect(screen.getByTestId('cart-slot')).toBeInTheDocument()
  })

  // implementation notesthe design without the cart column hands the menu no `cart`; the menu takes the freed width
  it('from the desktop cut without a cart there is no panel, and the grid is the list and the menu', () => {
    const columns = (cart) => {
      viewport.width = 1280
      const { unmount } = renderWithProviders(<StoreMenu {...base} variant='menu' cart={cart} />)
      const tracks = cssFor(document.querySelector('[data-doc-section=business-menu]')).match(/grid-template-columns:\s*([^;]+);/g).at(-1)
      const panel = document.querySelector('[data-doc-section=business-cart-aside]')
      unmount()
      return { tracks: tracks.replace('grid-template-columns:', '').trim().split(/\s+(?![^(]*\))/), panel }
    }
    const withCart = columns(<div data-testid='cart-slot' />)
    expect(withCart.panel).not.toBeNull()
    expect(withCart.tracks).toHaveLength(3)
    const without = columns(false)
    expect(without.panel).toBeNull()
    expect(screen.queryByTestId('cart-slot')).toBeNull()
    expect(without.tracks).toHaveLength(2)
    expect(without.tracks[1]).toMatch(/minmax\(0,\s*1fr\)/)
    // the categories' list stays
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    expect(screen.getByRole('navigation', { name: 'Categories' })).toBeInTheDocument()
  })

  // implementation notesthe bar is only as wide as the menu's column, so its fixed shadow must not spill past its sides
  it('the fixed bar casts its shadow only below it, and the classic\'s and the showcase\'s keep theirs around', () => {
    viewport.width = 1280
    const rules = (variant, selector) => {
      const { unmount } = renderWithProviders(<StoreMenu {...base} variant={variant} />)
      // every class of the bar: the classic's and the showcase's extend the StickyBar, whose rules are its own class's
      const classes = document.querySelector(selector).className.split(' ')
      const css = injectedCss().split('}').filter(rule => classes.some(cls => rule.includes(`.${cls}`))).join('}')
      unmount()
      return css
    }
    const menu = rules('menu', '[data-doc-section=business-menu-bar]')
    const stuck = menu.split('}').filter(rule => rule.includes('.is-stuck'))
    expect(stuck).toHaveLength(1)
    expect(stuck[0]).toContain('::after')
    expect(stuck[0]).toMatch(/box-shadow:\s*[^;]*\dpx/)
    expect(stuck[0]).toMatch(/clip-path:\s*inset\(100%\s+0\s+-[^)]+\s+0\)/)
    expect(stuck[0]).toContain('pointer-events:none')
    // the bar itself paints no shadow and is not clipped (the search's focus ring reaches its edges)
    expect(menu.replace(stuck[0], '')).not.toMatch(/box-shadow|clip-path/)
    for (const [variant, selector] of [['cover', '[data-doc-section=business-menu-bar]'], ['showcase', '[data-doc-section=business-menu-categories]']]) {
      const css = rules(variant, selector)
      expect(css).toMatch(/\.is-stuck\s*\{[^}]*box-shadow/)
      expect(css).not.toMatch(/::after|clip-path/)
    }
  })

  it('no products: the empty state, not a blank page', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' categoryState={{ products: [], loading: false }} />)
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
  })
})

describe('the classic (cover)', () => {
  it('every section, the featured one too, is a grid of cards: name, price and heart, the photo with its "+"', () => {
    renderWithProviders(<StoreMenu {...base} variant='cover' />)
    expect(document.querySelectorAll('[data-doc-section=business-product-card]')).toHaveLength(5)
    expect(document.querySelectorAll('[data-doc-section=business-product-tile], [data-doc-section=business-product-row]')).toHaveLength(0)
    const burgers = document.getElementById('category1')
    expect(within(burgers).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Cheeseburger', 'Veggie burger'])
    const card = burgers.querySelector('[data-doc-section=business-product-card]')
    expect(within(card).getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Cheeseburger: Add to cart' })).toBeInTheDocument()
  })

  it('a bar with the visible search and the categories as tabs, on a phone and on the desktop (no side list)', () => {
    for (const width of [390, 1280]) {
      viewport.width = width
      const { unmount } = renderWithProviders(<StoreMenu {...base} variant='cover' />)
      const bar = document.querySelector('[data-doc-section=business-menu-bar]')
      expect(within(bar).getByRole('textbox', { name: 'Search Products' })).toBeInTheDocument()
      expect(within(bar).getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Featured Items', 'Burgers', 'Drinks'])
      expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('has no Sort By and no cart beside the menu', () => {
    viewport.width = 1280
    renderWithProviders(<StoreMenu {...base} variant='cover' cart={<div data-testid='cart-slot' />} />)
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cart-slot')).not.toBeInTheDocument()
  })

  it('the "+" asks the store to add; the name opens the product', () => {
    renderWithProviders(<StoreMenu {...base} variant='cover' />)
    fireEvent.click(within(document.getElementById('category2')).getByRole('button', { name: 'Lemonade: Add to cart' }))
    expect(base.onProductAdd).toHaveBeenCalledWith(products[2])
    fireEvent.click(within(document.getElementById('category1')).getByRole('button', { name: 'Veggie burger' }))
    expect(base.onProductClick).toHaveBeenCalledWith(products[1])
  })
})

describe('the "+" of each product', () => {
  it('is named by the product and asks the store to add it', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    const add = within(document.getElementById('category2')).getByRole('button', { name: 'Lemonade: Add to cart' })
    fireEvent.click(add)
    expect(base.onProductAdd).toHaveBeenCalledWith(products[2])
    expect(base.onProductClick).not.toHaveBeenCalled()
  })

  it('shows how many are in the cart', () => {
    const currentCart = { products: [{ id: 21, quantity: 2 }, { id: 21, quantity: 1 }] }
    renderWithProviders(<StoreMenu {...base} variant='menu' currentCart={currentCart} />)
    const add = within(document.getElementById('category2')).getByRole('button', { name: 'Lemonade: Add to cart (3)' })
    expect(add).toHaveTextContent('3')
  })

  it('a sold out product has no "+"', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    expect(screen.queryByRole('button', { name: /Sold out soda/ })).toHaveTextContent('Sold out soda')
    expect(screen.queryByRole('button', { name: 'Sold out soda: Add to cart' })).not.toBeInTheDocument()
  })

  it('the name opens the product', () => {
    renderWithProviders(<StoreMenu {...base} variant='menu' />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Veggie burger' })[0])
    expect(base.onProductClick).toHaveBeenCalledWith(products[1])
  })
})

describe('the visual showcase (showcase)', () => {
  it('chips with the search first, and the products as tiles', () => {
    renderWithProviders(<StoreMenu {...base} variant='showcase' />)
    expect(screen.getAllByRole('button', { pressed: true }).map(chip => chip.textContent)).toEqual(['Featured Items'])
    expect(screen.getByRole('button', { name: 'Burgers' })).toHaveAttribute('aria-pressed', 'false')
    expect(document.getElementById('category2').querySelectorAll('[data-doc-section=business-product-tile]')).toHaveLength(2)
    expect(document.querySelectorAll('[data-doc-section=business-product-row]')).toHaveLength(0)
  })

  it('the search chip opens into the field', () => {
    renderWithProviders(<StoreMenu {...base} variant='showcase' />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Search Products' }))
    expect(screen.getByRole('textbox', { name: 'Search Products' })).toBeInTheDocument()
  })

  it('a store that loads its menu by category filters: the chosen category\'s products and the way back', () => {
    renderWithProviders(<StoreMenu {...base} variant='showcase' isFiltered categorySelected={categories[1]} categoryState={{ products: [products[2]], loading: false }} back={<button type='button'>Back</button>} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Drinks' })).toBeInTheDocument()
  })
})

describe('the closed store\'s notice', () => {
  const closed = { id: 1, open: false, timezone: 'UTC', schedule: [] }

  it('an open store has none', () => {
    const { container } = renderWithProviders(<StoreClosedCard business={{ id: 1, open: true }} onSchedule={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('closed: says so and its button opens the moment picker', () => {
    const onSchedule = vi.fn()
    renderWithProviders(<StoreClosedCard business={closed} onSchedule={onSchedule} />)
    const card = document.querySelector('[data-doc-section=business-closed-card]')
    expect(card).toHaveAttribute('data-doc-state', 'closed')
    expect(within(card).getByText('Closed now')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Schedule for later' }))
    expect(onSchedule).toHaveBeenCalledTimes(1)
  })

  it('the store reloaded for the chosen moment says it is open: its own schedule tells it is closed now', () => {
    order.options.moment = '2030-05-01 12:30:00'
    const noLapses = { id: 1, open: true, timezone: 'UTC', today: { enabled: false, lapses: [] } }
    renderWithProviders(<StoreClosedCard business={noLapses} onSchedule={vi.fn()} />)
    expect(document.querySelector('[data-doc-section=business-closed-card]')).toHaveAttribute('data-doc-state', 'scheduled')
    order.options.moment = null
  })

  it('open now by its schedule, a chosen moment does not show it', () => {
    order.options.moment = '2030-05-01 12:30:00'
    const allDay = { id: 1, open: true, timezone: 'UTC', today: { enabled: true, lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }] } }
    const { container } = renderWithProviders(<StoreClosedCard business={allDay} onSchedule={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    order.options.moment = null
  })

  it('once a moment is chosen it is a confirmation with it and a "Change" button for the same picker', () => {
    order.options.moment = '2030-05-01 12:30:00'
    const onSchedule = vi.fn()
    renderWithProviders(<StoreClosedCard business={closed} onSchedule={onSchedule} />)
    const card = document.querySelector('[data-doc-section=business-closed-card]')
    expect(card).toHaveAttribute('data-doc-state', 'scheduled')
    expect(within(card).getByText('Order scheduled')).toBeInTheDocument()
    expect(within(card).queryByText('Closed now')).not.toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Change' }))
    expect(onSchedule).toHaveBeenCalledTimes(1)
    order.options.moment = null
  })
})
