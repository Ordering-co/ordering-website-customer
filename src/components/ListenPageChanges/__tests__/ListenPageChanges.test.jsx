import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { ListenPageChanges } from '../index'

const emit = vi.fn()
const on = vi.fn()
const off = vi.fn()
const push = vi.fn()
const current = vi.hoisted(() => ({ pathname: '/home', template: '/store/:business_slug' }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useHistory: () => ({
      listen: vi.fn(() => vi.fn()),
      location: { pathname: current.pathname, search: '' },
      push,
      replace: vi.fn()
    }),
    useLocation: () => ({ pathname: '/home', search: '' })
  }
})
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on, off }]
}))
vi.mock('~components/contexts/SiteContext', () => ({
  useSite: () => [{ site: { business_url_template: current.template, product_url_template: current.template } }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { address: { location: { lat: 1, lng: 2 } } } }]
}))
vi.mock('~ui/utils', () => ({
  checkSiteUrl: (template) => template
}))

describe('ListenPageChanges', () => {
  it('renders children and wires event listeners', () => {
    const { getByText } = renderWithProviders(
      <ListenPageChanges><span>page-child</span></ListenPageChanges>
    )
    expect(getByText('page-child')).toBeInTheDocument()
    expect(on).toHaveBeenCalledWith('go_to_page', expect.any(Function))
    expect(on).toHaveBeenCalledWith('get_current_view', expect.any(Function))
  })

  it('navigates on go_to_page for business_search', () => {
    renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>)
    const handler = on.mock.calls.find(([event]) => event === 'go_to_page')?.[1]
    handler({ page: 'business_search', search: '?q=pizza' })
    expect(push).toHaveBeenCalled()
  })

  // implementation notesthe menu is /home as ever, or /order on a full website
  describe('the home page (the menu)', () => {
    const fullWebsite = () => themeWithValues((values) => { values.site.experience = 'full_website'; return values })
    const goHome = (theme) => {
      renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>, { theme })
      on.mock.calls.filter(([event]) => event === 'go_to_page').at(-1)[1]({ page: 'home' })
    }
    const viewsOf = (page) => emit.mock.calls.filter(([event, data]) => event === 'change_view' && data.page === page)

    beforeEach(() => {
      vi.clearAllMocks()
      current.pathname = '/home'
    })

    it('ordering only: go_to_page home pushes /home', () => {
      goHome()
      expect(push).toHaveBeenCalledWith('/home', undefined)
    })

    it('full website: go_to_page home pushes /order', () => {
      goHome(fullWebsite())
      expect(push).toHaveBeenCalledWith('/order', undefined)
    })

    it('full website: /order is the home view', () => {
      current.pathname = '/order'
      renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>, { theme: fullWebsite() })
      expect(viewsOf('home')).toHaveLength(1)
    })

    it('ordering only: /home is the home view, /order is not', () => {
      renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>)
      expect(viewsOf('home')).toHaveLength(1)
      vi.clearAllMocks()
      current.pathname = '/order'
      renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>)
      expect(viewsOf('home')).toHaveLength(0)
    })
  })

  // a store whose address would be the menu's ('/order') on a full website goes to /store/<slug>
  describe('a link to a store (go_to_page business)', () => {
    const goTo = (event, theme) => {
      renderWithProviders(<ListenPageChanges><span>x</span></ListenPageChanges>, { theme })
      on.mock.calls.filter(([name]) => name === 'go_to_page').at(-1)[1](event)
    }
    const fullWebsite = () => themeWithValues((values) => { values.site.experience = 'full_website'; return values })

    beforeEach(() => {
      vi.clearAllMocks()
      current.template = '/:business_slug'
    })
    afterEach(() => { current.template = '/store/:business_slug' })

    it('full website: the store `order` is /store/order, the menu stays /order', () => {
      goTo({ page: 'business', params: { business_slug: 'order' } }, fullWebsite())
      expect(push).toHaveBeenCalledWith('/store/order', undefined)
    })

    it('full website: a product link of that store too, with its query', () => {
      goTo({ page: 'product', params: { business_slug: 'order' }, search: '?category=1&product=2' }, fullWebsite())
      expect(push).toHaveBeenCalledWith('/store/order?category=1&product=2', undefined)
    })

    it('a normal slug keeps the template; ordering only keeps /order', () => {
      goTo({ page: 'business', params: { business_slug: 'downtown' } }, fullWebsite())
      expect(push).toHaveBeenLastCalledWith('/downtown', undefined)
      goTo({ page: 'business', params: { business_slug: 'order' } })
      expect(push).toHaveBeenLastCalledWith('/order', undefined)
    })
  })
})
