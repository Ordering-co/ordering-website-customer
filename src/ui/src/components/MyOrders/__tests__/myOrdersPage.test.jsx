import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { sampleOrder, pastOrder, activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { pageGutter } from '~/utils/themeTokens'
import { MyOrders } from '../index'

// the page's side space with the default theme (tokens.layout.page_gutter)
const HEADER_SIDE = pageGutter(themeWithValues())

// /profile/orders: the page's outline, its box (the account pages' one) and
// the rhythm of its groups of orders (Upcoming, Active, Past orders). The
// orders' controller is stubbed per group; a card is its real box with the
// business name (an h3, as the real card).
const preOrder = { ...sampleOrder, id: 44, uuid: 'order-uuid-44', status: 13, business: { ...sampleOrder.business, name: 'Taco Spot' } }
const GROUPS = {
  pre: { orders: [preOrder], pagination: { currentPage: 1, totalPages: 1 } },
  active: { orders: [activeOrder, { ...activeOrder, id: 45, uuid: 'order-uuid-45' }], pagination: { currentPage: 1, totalPages: 2 } },
  past: { orders: [pastOrder], pagination: { currentPage: 1, totalPages: 1 } }
}
let emptyOrders = false
// the groups without orders ('pre', 'active', 'past'), the others with theirs
let emptyGroups = []

vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => {
    const key = rest.preOrders ? 'pre' : rest.activeOrders ? 'active' : 'past'
    const group = GROUPS[key]
    return (
      <UIComponent
        {...rest}
        orderList={{ loading: false, error: null, orders: (emptyOrders || emptyGroups.includes(key)) ? [] : group.orders }}
        pagination={group.pagination}
        reorderState={{ loading: false, error: null, result: null }}
        businesses={{ loading: false, result: [] }}
        products={[]}
        professionals={[]}
        handleReorder={vi.fn()}
        handleUpdateOrderList={vi.fn()}
        loadMoreOrders={vi.fn()}
        loadOrders={vi.fn()}
        getPage={vi.fn()}
      />
    )
  }
}))
vi.mock('~ui/src/components/SingleOrderCard', async () => {
  const { Container } = await vi.importActual('~ui/src/components/SingleOrderCard/styles')
  return {
    SingleOrderCard: ({ order }) => (
      <Container data-testid='order-card'><h3>{order.business.name}</h3></Container>
    )
  }
})
vi.mock('~ui/src/components/GiftCard/GiftCardOrdersList', () => ({
  GiftCardOrdersList: () => <div data-testid='gift-card-orders-stub' />
}))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))

// Spaces apart from the schema's defaults, so the values can only come from the theme
const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
// (the page title, section_header.variants.page, aliases tokens.space.xl for its gap, as the API resolves it)
// The tab bar without its shadow: its box then keeps no room for it (see
// tabsShadowRoomCss), so the page's own spacing shows alone.
const noShadow = (variants) => Object.fromEntries(Object.entries(variants).map(([key, variant]) => [key, { ...variant, shadow: null }]))

const spacedTheme = () => themeWithValues((values) => ({
  ...values,
  tokens: { ...values.tokens, space: SPACE },
  components: {
    ...values.components,
    tabs: { ...values.components.tabs, variants: noShadow(values.components.tabs.variants) },
    section_header: {
      ...values.components.section_header,
      variants: { ...values.components.section_header.variants, page: { ...values.components.section_header.variants.page, margin_bottom: SPACE.xl } }
    }
  }
}))

const renderPage = (theme, { empty = false, emptyIn = [] } = {}) => {
  emptyOrders = empty
  emptyGroups = emptyIn
  const view = renderWithProviders(
    <MyOrders onRedirectPage={vi.fn()} onProductRedirect={vi.fn()} businessesSearchList={{ loading: false, result: [] }} />,
    { theme }
  )
  const groupTitles = Array.from(document.querySelectorAll('[data-doc-section="order-history-group-title"]'))
  return {
    ...view,
    page: document.querySelector('[data-doc-section="order-history"]'),
    groupTitles,
    tabsBox: document.querySelector('.category-lists')?.parentElement,
    lists: Array.from(document.querySelectorAll('[data-doc-section="order-history-cards"]')),
    cards: view.queryAllByTestId('order-card'),
    loadMore: document.querySelector('[data-doc-control="order-history-load-more"]')?.parentElement
  }
}

const levels = (view) => view.getAllByRole('heading').map((h) => h.tagName.toLowerCase())

describe('/profile/orders: headings', () => {
  it('one h1, the groups its h2 sections, the cards\' business names h3 under them', () => {
    const view = renderPage(themeWithValues())
    expect(view.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['My Orders'])
    expect(view.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Upcoming', 'Active', 'Past orders'])
    expect(view.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(view.queryAllByRole('heading', { level: 4 })).toHaveLength(0)
    // in document order, no level skipped
    const order = levels(view)
    order.forEach((level, i) => {
      if (i) expect(Number(level[1]) - Number(order[i - 1][1])).toBeLessThanOrEqual(1)
    })
  })
})

describe('/profile/orders: one left edge', () => {
  it('the account pages\' box; title, tabs, group titles and cards flush at its start', () => {
    const theme = spacedTheme()
    const { page, getByRole, tabsBox, groupTitles, cards } = renderPage(theme)
    const css = cssFor(page).replace(/\s+/g, '')
    // the box of components.account_page
    const box = theme.values.components.account_page.base
    expect(css).toContain(`padding:${box.padding_top}px${HEADER_SIDE}px${box.padding_bottom}px`)
    expect(css).toContain('width:75%')
    expect(page).toHaveStyle({ marginLeft: 'auto', marginRight: 'auto' })
    expect(getByRole('heading', { level: 1 })).toHaveStyle({ width: '100%', marginLeft: '0px', marginBottom: `${SPACE.xl}px` })
    // the tabs' box declares no side margin or padding of its own: the page's start
    expect(cssFor(tabsBox)).not.toMatch(/margin(-left|-inline)?:|padding/)
    groupTitles.forEach((title) => expect(title).toHaveStyle({ paddingLeft: '0px', paddingRight: '0px', marginLeft: '0px' }))
    expect(cards).toHaveLength(4)
    cards.forEach((card) => expect(card).toHaveStyle({ marginLeft: '0px', marginRight: '0px' }))
  })
})

describe('/profile/orders: spacing from tokens.space', () => {
  it('tabs xl over the list; a group title md over its cards, cards md apart; groups xl apart (the divider xl above and below)', () => {
    const { tabsBox, groupTitles, lists, cards, loadMore } = renderPage(spacedTheme())
    expect(tabsBox.style.getPropertyValue('--ui-tabs-space-after')).toBe(`${SPACE.xl}px`)
    expect(document.querySelector('.category-lists')).toHaveStyle({ marginBottom: '0px' })
    const [upcoming, active, past] = groupTitles
    expect(upcoming).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px` })
    expect(active).toHaveStyle({ marginTop: `${SPACE.xl}px`, marginBottom: `${SPACE.md}px` })
    // after the divider: the divider's xl alone
    const divider = past.previousElementSibling
    expect(divider).toHaveStyle({ marginTop: `${SPACE.xl}px`, marginBottom: `${SPACE.xl}px` })
    expect(past).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px` })
    lists.forEach((list) => expect(list).toHaveStyle({ gap: `${SPACE.md}px` }))
    cards.forEach((card) => expect(card).toHaveStyle({ marginTop: '0px', marginBottom: '0px' }))
    expect(loadMore).toHaveStyle({ marginTop: `${SPACE.md}px`, marginBottom: '0px' })
  })

  it('the separator is the theme\'s divider band (its color and thickness), xl above and below', () => {
    const BAND = { line: { width: 6, color: '#ABCDEF', style: 'solid' }, spacing: 0, indent: 0 }
    const theme = themeWithValues((values) => ({
      ...values,
      tokens: { ...values.tokens, space: SPACE },
      components: {
        ...values.components,
        divider: { ...values.components.divider, variants: { ...values.components.divider.variants, band: BAND } }
      }
    }))
    const { groupTitles } = renderPage(theme)
    const divider = groupTitles[2].previousElementSibling
    const css = cssFor(divider)
    expect(css).toContain('height:6px')
    expect(css).toContain('background:#ABCDEF')
    expect(divider).toHaveStyle({ height: '6px', marginTop: `${SPACE.xl}px`, marginBottom: `${SPACE.xl}px` })
  })

  it('a band without a line: nothing drawn, the groups still xl apart', () => {
    const theme = themeWithValues((values) => ({
      ...values,
      tokens: { ...values.tokens, space: SPACE },
      components: {
        ...values.components,
        divider: { ...values.components.divider, variants: { ...values.components.divider.variants, band: { line: null, spacing: 0, indent: 0 } } }
      }
    }))
    const { groupTitles } = renderPage(theme)
    const divider = groupTitles[2].previousElementSibling
    expect(divider).toHaveStyle({ height: '0px', marginTop: `${SPACE.xl}px`, marginBottom: '0px' })
    expect(cssFor(divider)).toContain('background:none')
  })

  it('the schema defaults: md and xl of the theme', () => {
    const theme = themeWithValues()
    const { md, xl } = theme.values.tokens.space
    const { tabsBox, groupTitles } = renderPage(theme)
    // the default bar has a shadow: its room is taken back from the xl
    expect(tabsBox.style.getPropertyValue('--ui-tabs-space-after')).toBe(`${xl}px`)
    expect(parseFloat(tabsBox.style.getPropertyValue('--ui-tabs-shadow-bottom'))).toBeGreaterThan(0)
    expect(groupTitles[0]).toHaveStyle({ marginBottom: `${md}px` })
    expect(groupTitles[1]).toHaveStyle({ marginTop: `${xl}px` })
  })

  it('no orders: the empty state of the page (NotFoundSource), its action lg under the message', () => {
    // components.empty_state.base.actions_gap is {space.lg}: the API resolves
    // it with the theme's own scale (the fixture resolved it before SPACE)
    const theme = themeWithValues((values) => ({
      ...values,
      tokens: { ...values.tokens, space: SPACE },
      components: {
        ...values.components,
        empty_state: { ...values.components.empty_state, base: { ...values.components.empty_state?.base, actions_gap: SPACE.lg } }
      }
    }))
    renderPage(theme, { empty: true })
    const empty = document.querySelector('[data-doc-section="order-history-empty"] #not-found-source')
    expect(empty).not.toBeNull()
    const action = document.querySelector('[data-doc-control="order-history-empty-action"]')
    expect(action.parentElement).toHaveStyle({ marginTop: `${SPACE.lg}px` })
  })

  it('a group without orders: its empty state md under its title, no margin of its own', () => {
    renderPage(spacedTheme(), { emptyIn: ['active'] })
    const empty = document.getElementById('order-history-empty-active')
    expect(empty.previousElementSibling).toHaveAttribute('data-doc-group', 'active')
    expect(empty.previousElementSibling).toHaveStyle({ marginBottom: `${SPACE.md}px` })
    expect(empty).toHaveStyle({ marginTop: '0px', marginBottom: '0px' })
  })

  describe('no orders: the image of the theme', () => {
    const NF = 'https://cdn.test/not-found.png'
    const ACTIVE = 'https://cdn.test/empty-active.png'
    const PAST = 'https://cdn.test/empty-past.png'
    const ALL = { 'empty.not_found': NF, 'empty.past_orders': PAST, 'empty.active_orders': ACTIVE }
    const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
    const emptyImage = () => document.querySelector('[data-doc-section="order-history-empty"] img')

    it('no orders at all: one empty state, with empty.not_found (not the groups\' images)', () => {
      const view = renderPage(withImages(ALL), { empty: true })
      expect(emptyImage()).toHaveAttribute('src', NF)
      expect(emptyImage()).toHaveAttribute('alt', '')
      // a section of the page's h1, no group's empty state
      expect(view.getByRole('heading', { level: 2, name: 'You don\'t have any orders' })).toBeInTheDocument()
      expect(document.querySelector('[id^="order-history-empty-"]')).toBeNull()
    })

    it('without empty.not_found: the icon (the box of NotFoundSource)', () => {
      renderPage(withImages({ 'empty.past_orders': PAST, 'empty.active_orders': ACTIVE }), { empty: true })
      expect(emptyImage()).toBeNull()
      // the icon's box (EmptyIcon) leads
      expect(document.querySelector('[data-doc-section="order-history-empty"] #not-found-source').firstElementChild.tagName).toBe('DIV')
    })

    it('each group without orders, its own empty state under its title (h2 > h3)', () => {
      const view = renderPage(withImages(ALL), { emptyIn: ['pre', 'active'] })
      const upcoming = document.getElementById('order-history-empty-upcoming')
      const active = document.getElementById('order-history-empty-active')
      expect(upcoming.querySelector('img')).toHaveAttribute('src', NF)
      expect(active.querySelector('img')).toHaveAttribute('src', ACTIVE)
      expect(active.querySelector('h3')).toHaveTextContent('You have no active orders')
      expect(upcoming.querySelector('h3')).toHaveTextContent('You have no upcoming orders')
      // every group keeps its title; the past orders show theirs
      expect(view.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Upcoming', 'Active', 'Past orders'])
      expect(document.getElementById('order-history-empty-past')).toBeNull()
      expect(view.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    })

    it('no past orders, empty.past_orders under its title, after the band', () => {
      renderPage(withImages(ALL), { emptyIn: ['past'] })
      const past = document.getElementById('order-history-empty-past')
      expect(past.querySelector('img')).toHaveAttribute('src', PAST)
      expect(past.querySelector('h3')).toHaveTextContent('You have no past orders')
      const title = past.previousElementSibling
      expect(title).toHaveAttribute('data-doc-group', 'past')
      expect(title.previousElementSibling.tagName).toBe('DIV')
      expect(title.previousElementSibling).not.toHaveAttribute('data-doc-section')
    })

    it('a group\'s empty state without its image falls back to empty.not_found', () => {
      renderPage(withImages({ 'empty.not_found': NF }), { emptyIn: ['active', 'past'] })
      expect(document.querySelector('#order-history-empty-active img')).toHaveAttribute('src', NF)
      expect(document.querySelector('#order-history-empty-past img')).toHaveAttribute('src', NF)
    })

    it('past orders hidden by the theme: no empty state (and no band) for them', () => {
      const theme = themeWithValues((values) => ({
        ...values,
        images: { ...values.images, ...ALL },
        pages: { ...values.pages, orders: { ...values.pages.orders, sections: [{ key: 'past_orders', visible: false }] } }
      }))
      renderPage(theme, { emptyIn: ['past'] })
      expect(document.getElementById('order-history-empty-past')).toBeNull()
      expect(document.querySelector('[data-doc-group="past"]')).toBeNull()
    })
  })
})
