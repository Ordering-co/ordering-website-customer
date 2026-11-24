import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { buildAppTheme } from '../../../utils/appTheme'
import { buildLocalTheme, envelope } from '../../../utils/__tests__/fixtures/themeFixtures'
import { isFullWebsite, singleStoreSlug } from '../../../utils/siteSettings'
import { singleBusinessHomePath } from '../../../utils/singleStore'
import { LANDING_SSR_ID, LANDING_SSR_STYLE_ID } from '../../../pages/Landing/ssrSwap'
import { menuHomeRoutes } from '../index'

// loadable never resolves under jsdom here: React.lazy does the same job
vi.mock('@loadable/component', async () => {
  const { lazy, Suspense, createElement } = await import('react')
  return {
    default: (load) => {
      const Lazy = lazy(() => load().then((module) => ({ default: module.default ?? module })))
      return (props) => createElement(Suspense, { fallback: null }, createElement(Lazy, props))
    }
  }
})
vi.mock('../../../pages/Home', () => ({ default: () => <div>menu-home</div> }))
vi.mock('../../../pages/Landing', () => ({ default: () => <div>landing</div> }))
vi.mock('~ui/src/components/QueryLoginSpoonity', () => ({ QueryLoginSpoonity: ({ token, destination }) => <div>spoonity:{token}{destination && `>${destination}`}</div> }))

const SITES = {
  'one store': { mode: 'single_store', business_slug: 'my-store' },
  franchise: { mode: 'franchise', franchise_slug: 'my-franchise' },
  marketplace: { mode: 'marketplace' }
}

// App.js's flags for a site, the way it derives them from the theme
const SHORT_URLS = { business_url_template: '/:business_slug' }
const appFlags = (site, experience, extra = {}, urls = SHORT_URLS) => {
  const theme = buildAppTheme(buildLocalTheme(), envelope({ site: { ...site, experience } }, { complete: false }))
  const slug = singleStoreSlug(theme, {})
  const fullWebsite = isFullWebsite(theme)
  const singleBusinessHome = singleBusinessHomePath({ site: urls, slug, businessSlug: slug, direct: true, fullWebsite })
  return {
    fullWebsite,
    singleBusinessActive: !!slug,
    singleBusinessHome,
    homeOrderLocationRedirectPath: slug ? singleBusinessHome : '/search',
    ...extra
  }
}

// The real Switch with the home routes before '/:business_slug', as in App.js
const visit = async (url, appFlags) => {
  // App.js reads the Spoonity login from the URL's query
  const query = new URLSearchParams(url.split('?')[1])
  const flags = { queryIntegrationToken: query.get('integration_token') ?? undefined, queryIntegrationCode: query.get('integration_code') ?? undefined, ...appFlags }
  const { container, unmount } = render(
    <MemoryRouter initialEntries={[url]}>
      <Switch>
        {menuHomeRoutes(flags)}
        <Route path='/verify'><div>verify</div></Route>
        <Route exact path='/search'><div>search</div></Route>
        <Route exact path='/store/:business_slug' render={({ match }) => <div>business:{match.params.business_slug}</div>} />
        <Route exact path='/:business_slug' render={({ match }) => <div>business:{match.params.business_slug}</div>} />
      </Switch>
      <Route render={({ location }) => <div data-testid='at'>{location.pathname + location.search}</div>} />
    </MemoryRouter>
  )
  const body = () => container.querySelector('[data-testid="at"]').previousSibling?.textContent ?? ''
  await waitFor(() => expect(body(), container.innerHTML).not.toBe(''))
  const result = { at: screen.getByTestId('at').textContent, body: body() }
  unmount()
  return result
}

describe.each(Object.entries(SITES))('%s', (name, site) => {
  const menu = name === 'one store' ? 'business:my-store' : 'menu-home'
  const menuAt = name === 'one store' ? '/my-store' : null

  it('ordering only: \'/\' and \'/home\' are the menu, \'/order\' a business slug', async () => {
    const flags = appFlags(site, 'ordering_only')
    expect(await visit('/', flags)).toEqual({ at: menuAt ?? '/', body: menu })
    expect(await visit('/home', flags)).toEqual({ at: menuAt ?? '/home', body: menu })
    expect(await visit('/order', flags)).toEqual({ at: '/order', body: 'business:order' })
  })

  it('full website: \'/\' is the landing, \'/order\' the menu, \'/home\' goes to \'/order\' keeping the query', async () => {
    const flags = appFlags(site, 'full_website')
    expect(await visit('/', flags)).toEqual({ at: '/', body: 'landing' })
    expect(await visit('/order', flags)).toEqual({ at: menuAt ?? '/order', body: menu })
    expect(await visit('/home?lat=1', flags)).toEqual({ at: menuAt ?? '/order?lat=1', body: menu })
  })
})

describe('the decision tree of the menu home', () => {
  it('full website: the landing is public, the menu asks to verify', async () => {
    const flags = appFlags(SITES.marketplace, 'full_website', { isUserVerifyRequired: true })
    expect(await visit('/', flags)).toEqual({ at: '/', body: 'landing' })
    expect(await visit('/order', flags)).toEqual({ at: '/verify', body: 'verify' })
  })

  it('full website: the kiosk opens on its menu, not the landing', async () => {
    expect(await visit('/', appFlags(SITES.marketplace, 'full_website', { isKioskApp: true }))).toEqual({ at: '/', body: 'menu-home' })
  })

  it('the Spoonity login keeps \'/\' on both experiences, and \'/order\' on a full website; a full website sends it on to \'/order\'', async () => {
    const query = '?integration_token=tok&integration_code=spoonity'
    expect((await visit(`/${query}`, appFlags(SITES.marketplace, 'ordering_only'))).body).toBe('spoonity:tok')
    expect((await visit(`/${query}`, appFlags(SITES.marketplace, 'full_website'))).body).toBe('spoonity:tok>/order')
    expect((await visit(`/order${query}`, appFlags(SITES.marketplace, 'full_website'))).body).toBe('spoonity:tok>/order')
  })

  it('\'/home\' shows the menu with the custom order even with an address; \'/\' goes to the search', async () => {
    const flags = appFlags(SITES.marketplace, 'ordering_only', { customOrderEnabled: true, shouldRedirectHomeToOrderLocation: true })
    expect((await visit('/home', flags)).body).toBe('menu-home')
    expect(await visit('/', flags)).toEqual({ at: '/search', body: 'search' })
  })
})

describe('a store whose slug is `order` (the full website\'s menu address)', () => {
  const orderStore = { mode: 'single_store', business_slug: 'order' }

  it('full website: the single store goes to /store/order, which the Switch routes to the store', async () => {
    const flags = appFlags(orderStore, 'full_website')
    expect(flags.singleBusinessHome).toBe('/store/order')
    expect(await visit('/order', flags)).toEqual({ at: '/store/order', body: 'business:order' })
    expect(await visit('/home', flags)).toEqual({ at: '/store/order', body: 'business:order' })
    // the redirect to the order's location is the same address
    const located = appFlags(orderStore, 'full_website', { shouldRedirectHomeToOrderLocation: true })
    expect(await visit('/order', located)).toEqual({ at: '/store/order', body: 'business:order' })
  })

  it('a template with a query falls back to the short address, which takes the same way out', async () => {
    const flags = appFlags(orderStore, 'full_website', {}, { business_url_template: '/store?store=:business_slug' })
    expect((await visit('/order', flags)).at).toBe('/store/order')
  })

  it('ordering only: nothing changes, the store stays at /order', async () => {
    const flags = appFlags(orderStore, 'ordering_only')
    expect(flags.singleBusinessHome).toBe('/order')
    expect(await visit('/', flags)).toEqual({ at: '/order', body: 'business:order' })
  })
})

describe('the Custom Order on the menu', () => {
  const session = { auth: { id: 1 }, singleBusinessActive: true, singleBusinessHome: '/my-store', customOrderEnabled: true }

  it('a single store with a session and the flag on: \'/home\' and \'/order\' show the menu, not the store', async () => {
    const flags = appFlags(SITES['one store'], 'full_website', session)
    expect(await visit('/home', flags)).toEqual({ at: '/order', body: 'menu-home' })
    expect(await visit('/order', flags)).toEqual({ at: '/order', body: 'menu-home' })
    // without the flag, the store
    expect((await visit('/order', { ...flags, customOrderEnabled: false })).body).toBe('business:my-store')
  })

  it('the order is verify, kiosk, Spoonity, Custom Order, the order\'s location, the single store, the home', async () => {
    const query = '?integration_token=tok&integration_code=spoonity'
    const flags = appFlags(SITES['one store'], 'full_website', { ...session, shouldRedirectHomeToOrderLocation: true, homeOrderLocationRedirectPath: '/search' })
    expect((await visit(`/order${query}`, { ...flags, isUserVerifyRequired: true })).body).toBe('verify')
    expect((await visit(`/order${query}`, { ...flags, isKioskApp: true })).body).toBe('menu-home')
    expect((await visit(`/order${query}`, flags)).body).toBe('spoonity:tok>/order')
    expect((await visit('/order', flags)).body).toBe('menu-home') // the Custom Order before the location
    expect(await visit('/order', { ...flags, customOrderEnabled: false })).toEqual({ at: '/search', body: 'search' })
  })
})

describe('the server\'s paint of \'/\' goes away with the screen that takes the landing\'s place', () => {
  const paint = () => {
    document.body.insertAdjacentHTML('afterbegin', `<div id="${LANDING_SSR_ID}">ssr</div><style id="${LANDING_SSR_STYLE_ID}"></style>`)
    return () => [LANDING_SSR_ID, LANDING_SSR_STYLE_ID].map((id) => !!document.getElementById(id))
  }

  it('the kiosk\'s menu and the Spoonity login take it out as they mount', async () => {
    const present = paint()
    expect(await visit('/', appFlags(SITES.marketplace, 'full_website', { isKioskApp: true }))).toEqual({ at: '/', body: 'menu-home' })
    expect(present()).toEqual([false, false])
    const again = paint()
    await visit('/?integration_token=tok&integration_code=spoonity', appFlags(SITES.marketplace, 'full_website'))
    expect(again()).toEqual([false, false])
  })

  it('the landing leaves it to its own swap (the page takes it out after painting)', async () => {
    const present = paint()
    expect((await visit('/', appFlags(SITES.marketplace, 'full_website'))).body).toBe('landing')
    expect(present()).toEqual([true, true])
    document.getElementById(LANDING_SSR_ID).remove()
    document.getElementById(LANDING_SSR_STYLE_ID).remove()
  })
})
