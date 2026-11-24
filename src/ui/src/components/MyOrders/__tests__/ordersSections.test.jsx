import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { sampleOrder, pastOrder, activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { MyOrders } from '../index'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

// /profile/orders as the theme lays it out (pages.orders): its tabs and its
// groups of orders hidden and ordered, the band between them, and the
// orders_page component (group titles, divider, tabs and load more pieces).
const preOrder = { ...sampleOrder, id: 44, uuid: 'order-uuid-44', status: 13, business: { ...sampleOrder.business, name: 'Taco Spot' } }
const GROUPS = {
  pre: { orders: [preOrder], pagination: { currentPage: 1, totalPages: 1 } },
  active: { orders: [activeOrder], pagination: { currentPage: 1, totalPages: 2 } },
  past: { orders: [pastOrder], pagination: { currentPage: 1, totalPages: 1 } }
}
// the groups each render mounted
const mounted = []
// the tab's content each render mounted ("Previously ordered": business, products)
const tabContent = []

vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => {
    if (rest.hideOrders) tabContent.push(rest.isBusiness ? 'business' : rest.isProducts ? 'products' : 'other')
    const key = rest.preOrders ? 'pre' : rest.activeOrders ? 'active' : 'past'
    mounted.push(key)
    const group = GROUPS[key]
    return (
      <UIComponent
        {...rest}
        orderList={{ loading: false, error: null, orders: group.orders }}
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

const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }

// A theme whose orders page shows `sections` ([key, visible]) in that order
const withSections = (sections, mutate = (values) => values) => themeWithValues((values) => mutate({
  ...values,
  tokens: { ...values.tokens, space: SPACE },
  pages: {
    ...values.pages,
    orders: { ...values.pages.orders, sections: sections.map(([key, visible = true]) => ({ key, visible })) }
  }
}))

const renderPage = (theme) => {
  mounted.length = 0
  const view = renderWithProviders(
    <MyOrders onRedirectPage={vi.fn()} onProductRedirect={vi.fn()} businessesSearchList={{ loading: false, result: [] }} />,
    { theme }
  )
  const page = document.querySelector('[data-doc-section="order-history"]')
  return {
    ...view,
    page,
    groups: Array.from(document.querySelectorAll('[data-doc-section="order-history-group-title"]')).map((title) => title.getAttribute('data-doc-group')),
    titles: Array.from(document.querySelectorAll('[data-doc-section="order-history-group-title"]')),
    tabs: document.querySelector('[data-slot=tabs-navigation]')
  }
}

// The children of the page that are the band between groups: an empty div right before or after a group's title
const dividers = (page) => Array.from(page.children).filter((el) => el.tagName === 'DIV' && !el.children.length && !el.textContent && !el.getAttribute('data-doc-section') && !el.className.includes('category'))

describe('/profile/orders: sections of the theme (pages.orders)', () => {
  it('the schema defaults: tabs, then upcoming, active, the band and past', () => {
    const { groups, tabs, page } = renderPage(themeWithValues())
    expect(tabs).not.toBeNull()
    expect(groups).toEqual(['upcoming', 'active', 'past'])
    // the band right before the past orders' title
    const past = page.querySelector('[data-doc-group="past"]')
    expect(dividers(page)).toEqual([past.previousElementSibling])
  })

  it('the groups in the theme\'s order; the band before the past orders when they are not first', () => {
    const { titles, page } = renderPage(withSections([['title'], ['tabs'], ['active_orders'], ['past_orders'], ['upcoming_orders']]))
    const [first, second, third] = titles
    expect(first.textContent).toBe('Active')
    expect(second.textContent).toBe('Past orders')
    expect(third.textContent).toBe('Upcoming')
    expect(dividers(page)).toEqual([second.previousElementSibling])
    // the rhythm: the band's xl alone over the past orders, the next group xl down
    expect(second).toHaveStyle({ marginTop: '0px' })
    expect(third).toHaveStyle({ marginTop: `${SPACE.xl}px` })
  })

  it('the past orders first, the band after them (between them and the next group)', () => {
    const { titles, page } = renderPage(withSections([['past_orders'], ['upcoming_orders'], ['active_orders']]))
    expect(titles.map((title) => title.textContent)).toEqual(['Past orders', 'Upcoming', 'Active'])
    const [band] = dividers(page)
    expect(band).toBeDefined()
    expect(band.nextElementSibling).toBe(titles[1])
    expect(titles[0]).toHaveStyle({ marginTop: '0px' })
    expect(titles[1]).toHaveStyle({ marginTop: '0px' })
    expect(titles[2]).toHaveStyle({ marginTop: `${SPACE.xl}px` })
  })

  it('a hidden group is not mounted and the page does not wait for it', () => {
    const { titles, page, tabs } = renderPage(withSections([['upcoming_orders', false], ['active_orders'], ['past_orders', false]]))
    expect(mounted).not.toContain('pre')
    expect(mounted).not.toContain('past')
    expect(titles.map((title) => title.textContent)).toEqual(['Active'])
    // loaded: the tabs (not their skeleton), no band without the past orders
    expect(tabs).not.toBeNull()
    expect(dividers(page)).toHaveLength(0)
  })

  it('the past orders alone, no band', () => {
    const { titles, page } = renderPage(withSections([['upcoming_orders', false], ['active_orders', false], ['past_orders']]))
    expect(titles.map((title) => title.textContent)).toEqual(['Past orders'])
    expect(dividers(page)).toHaveLength(0)
  })

  it('hidden tabs, the orders alone (no bar)', () => {
    const view = renderPage(withSections([['tabs', false]]))
    expect(view.tabs).toBeNull()
    expect(view.queryByText('Business')).toBeNull()
    expect(view.titles).toHaveLength(3)
  })

  it('every group hidden, the page\'s empty state', () => {
    const view = renderPage(withSections([['upcoming_orders', false], ['active_orders', false], ['past_orders', false]]))
    expect(mounted).toHaveLength(0)
    expect(view.getByText('You don\'t have any orders')).toBeInTheDocument()
  })

  it('each tab follows its own key (orders.business_tab / orders.products_tab), no key hides both', () => {
    const tabsOf = (view) => Array.from(view.container.querySelectorAll('[data-doc-control="order-history-tab"]')).map((tab) => tab.getAttribute('data-doc-tab'))
    expect(tabsOf(renderPage(themeWithValues()))).toEqual(['orders', 'business', 'products'])
    const noBusiness = renderPage(themeWithValues((values) => { values.visibility['orders.business_tab'] = false; return values }))
    expect(tabsOf(noBusiness)).toEqual(['orders', 'products'])
    const neither = renderPage(themeWithValues((values) => {
      values.visibility['orders.business_tab'] = false
      values.visibility['orders.products_tab'] = false
      return values
    }))
    expect(tabsOf(neither)).toEqual(['orders'])
  })

})

describe('/profile/orders: components.orders_page', () => {
  it('the groups\' titles are section titles (section_header: text and color)', () => {
    const theme = withSections([], (values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title: { size: 21, line: 1.48, weight: 700 }, title_color: '#123456' }
      return values
    })
    const { titles } = renderPage(theme)
    const css = cssFor(titles[0].closest('[data-doc-section="order-history"]')).replace(/\s+/g, '')
    expect(css).toMatch(/h2,\.[\w-]+\.[\w-]+\{[^}]*font-size:21px;line-height:1\.48;font-weight:700;[^}]*color:#123456;/)
    expect(titles[0].querySelector('h2')).toHaveStyle({ color: '#123456', fontSize: '21px' })
  })

  it('its divider `none` draws nothing between the groups, still xl apart', () => {
    const theme = withSections([], (values) => {
      values.components.orders_page.base.divider = 'none'
      return values
    })
    const { titles } = renderPage(theme)
    const band = titles[2].previousElementSibling
    expect(band).toHaveStyle({ height: '0px', marginTop: `${SPACE.xl}px`, marginBottom: '0px' })
    expect(cssFor(band)).toContain('background:none')
  })

  it('its divider `section` is the section line of components.divider', () => {
    const theme = withSections([], (values) => {
      values.components.orders_page.base.divider = 'section'
      values.components.divider.variants.section = { line: { width: 3, color: '#FEDCBA', style: 'dashed' }, spacing: 0, indent: 0 }
      return values
    })
    const { titles } = renderPage(theme)
    const band = titles[2].previousElementSibling
    const css = cssFor(band).replace(/\s+/g, '')
    expect(css).toContain('border-top:3pxdashed#FEDCBA')
    expect(band).toHaveStyle({ marginTop: `${SPACE.xl}px`, marginBottom: `${SPACE.xl}px` })
  })

  it('the tabs and load more of its slots', () => {
    const theme = withSections([], (values) => {
      values.components.orders_page.slots.tabs = { component: 'tabs', size: 'lg', variant: 'underline' }
      values.components.orders_page.slots.load_more = { component: 'button', size: 'sm', appearance: 'solid', color: 'secondary', shape: null }
      return values
    })
    renderPage(theme)
    // the bar of the slot's size
    expect(document.querySelector('[data-slot=tabs-navigation]').style.getPropertyValue('--ui-tabs-height')).toBe(`${theme.values.components.tabs.sizes.lg.height}px`)
    const loadMore = document.querySelector('[data-doc-control="order-history-load-more"]')
    // a base Button: the slot reaches it as its --ui-button-* variables (jsdom does not compile its classes)
    expect(loadMore).toHaveAttribute('data-slot', 'button')
    const vars = componentVars(theme, 'button', { size: 'sm', color: 'secondary', appearance: 'solid' })
    expect(loadMore.style.getPropertyValue('--ui-button-background')).toBe(vars['--ui-button-background'])
    expect(loadMore.style.getPropertyValue('--ui-button-height')).toBe(vars['--ui-button-height'])
  })
})

describe('"Previously ordered" in the search (hideOrders): the tabs\' keys', () => {
  const renderEmbedded = (theme) => {
    tabContent.length = 0
    return renderWithProviders(
      <MyOrders hideOrders isFromBusinessListingSearch onRedirectPage={vi.fn()} onProductRedirect={vi.fn()} businessesSearchList={{ loading: false, result: [] }} />,
      { theme }
    )
  }

  it('opens on the stores\' tab; on the products\' one when the theme hides the stores\'', () => {
    renderEmbedded(themeWithValues())
    expect(tabContent[tabContent.length - 1]).toBe('business')
    renderEmbedded(themeWithValues((values) => { values.visibility['orders.business_tab'] = false; return values }))
    expect(tabContent).not.toContain('business')
    expect(tabContent[tabContent.length - 1]).toBe('products')
  })

  it('it does not wait for the order groups (not mounted there): no endless loading bar', () => {
    const view = renderEmbedded(themeWithValues())
    expect(view.container.querySelector('[data-slot=tabs-navigation] [data-testid="skeleton"]')).toBeNull()
  })

  it('both tabs hidden: neither content, and no empty state in their place', () => {
    const view = renderEmbedded(themeWithValues((values) => {
      values.visibility['orders.business_tab'] = false
      values.visibility['orders.products_tab'] = false
      return values
    }))
    expect(tabContent).toEqual([])
    expect(view.queryByText('Nothing to show')).toBeNull()
  })
})
