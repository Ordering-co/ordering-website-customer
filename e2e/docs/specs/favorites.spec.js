import { expect, test } from '@playwright/test'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('favorites.manifest')
const favoriteBusinessesPattern = '^/v400/en/docsmarket/users/9301/favorite_businesses\\?page=1&page_size=10$'
const businessesPattern = '^/v400/en/docsmarket/businesses(?:\\?.*)?$'
const favoriteProductsPattern = '^/v400/en/docsmarket/users/9301/favorite_products\\?page=1&page_size=10$'
const favoriteOrdersPattern = '^/v400/en/docsmarket/users/9301/favorite_orders\\?page=1&page_size=10$'
const ordersPattern = '^/v400/en/docsmarket/orders(?:\\?.*)?$'
const favoriteUsersPattern = '^/v400/en/docsmarket/users/9301/favorite_users\\?page=1&page_size=10$'
const removeBusinessPattern = '^/v400/en/docsmarket/users/9301/favorite_businesses/8102$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)
const matches = (requestLog, method, pattern) => requestLog.matched.filter(request => request.method === method && request.pattern === pattern)

const tabForCapture = capture => {
  if (capture.id.includes('products')) return 'products'
  if (capture.id.includes('orders')) return 'orders'
  if (capture.id.includes('professionals')) return 'professionals'
  return 'businesses'
}

const fixtureFor = async ({ tab = 'businesses', empty = false, remove = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const token = `docs-fixture-favorites-${remove ? 'remove' : empty ? 'empty' : tab}-token`
  fixture.authSession.token = token
  fixture.authSession.user.session.access_token = token
  const userRoute = fixture.routes.find(route => route.method === 'GET' && /users\/9301/.test(route.pattern) && !/addresses|favorite/.test(route.pattern))
  userRoute.response.result.session.access_token = token
  if (tab === 'professionals') fixture.firstLoad.theme.values.tokens.layout.mode = 'appointments'
  if (empty) {
    routeFor(fixture, 'GET', favoriteBusinessesPattern).response.result = []
    routeFor(fixture, 'GET', favoriteBusinessesPattern).response.pagination = { current_page: 1, page_size: 10, total_pages: 1, total: 0, from: 0, to: 0 }
    routeFor(fixture, 'GET', businessesPattern).response.result = []
    routeFor(fixture, 'GET', businessesPattern).response.pagination.total = 0
  }
  routeFor(fixture, 'GET', favoriteProductsPattern).assert = { count: tab === 'products' ? 1 : 0 }
  routeFor(fixture, 'GET', favoriteOrdersPattern).assert = { count: tab === 'orders' ? 1 : 0 }
  routeFor(fixture, 'GET', ordersPattern).assert = { count: tab === 'orders' ? 1 : 0 }
  routeFor(fixture, 'GET', favoriteUsersPattern).assert = { count: tab === 'professionals' ? 1 : 0 }
  routeFor(fixture, 'DELETE', removeBusinessPattern).assert = { count: remove ? 1 : 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_FAVORITES_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      geolocationAttempts: [],
      storageWrites: [],
      storageRemovals: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = value => {
      window.__DOC_FAVORITES_GUARD__.windowOpenAttempts.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_FAVORITES_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_FAVORITES_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_FAVORITES_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_FAVORITES_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const blockedGeolocation = (success, error) => {
      window.__DOC_FAVORITES_GUARD__.geolocationAttempts.push(true)
      error?.({ code: 1, message: 'Blocked by documentation capture.' })
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = blockedGeolocation
      navigator.geolocation.watchPosition = blockedGeolocation
    }
    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      window.__DOC_FAVORITES_GUARD__.storageWrites.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeRemoveItem = window.Storage.prototype.removeItem
    window.Storage.prototype.removeItem = function (key) {
      window.__DOC_FAVORITES_GUARD__.storageRemovals.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeRemoveItem, this, [key])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_FAVORITES_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
      return Reflect.apply(nativeClear, this, [])
    }
  })
}

const storageShape = page => page.evaluate(() => {
  const token = window.localStorage.getItem('token')
  const user = JSON.parse(window.localStorage.getItem('user') || 'null')
  return {
    localKeys: Object.keys(window.localStorage).sort(),
    sessionKeys: Object.keys(window.sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(Boolean).sort(),
    tokenReserved: typeof token === 'string' && token.startsWith('docs-fixture-'),
    userSafe: user?.id === 9301 && user?.session?.access_token === token
  }
})

const verifyHydrationQuery = (request, expectedIds) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()].sort()).toEqual(['location', 'order_type_id', 'params', 'where'])
  expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 0, lng: 0 })
  expect(url.searchParams.get('order_type_id')).toBe('2')
  const where = JSON.parse(url.searchParams.get('where'))
  expect(where).toEqual({ conditions: [{ attribute: 'id', value: expectedIds }], conector: 'AND' })
  expect(url.searchParams.get('params')?.split(',')).toEqual(['id', 'name', 'header', 'logo', 'location', 'address', 'ribbon', 'timezone', 'schedule', 'open', 'delivery_price', 'distance', 'delivery_time', 'pickup_time', 'reviews', 'featured', 'offers', 'food', 'laundry', 'alcohol', 'groceries', 'slug', 'description', 'today', 'enabled', 'disabled_reason', 'available_drivers_count', 'activated_orders'])
}

const verifyOrderHydrationQuery = request => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()].sort()).toEqual(['type', 'where'])
  expect(url.searchParams.get('type')).toBe('2')
  expect(JSON.parse(url.searchParams.get('where'))).toEqual({ conditions: [{ attribute: 'id', value: [8401] }], conector: 'AND' })
}

const setup = async (page, capture, options = {}) => {
  const tab = options.tab || tabForCapture(capture)
  const empty = options.empty ?? capture.id.includes('empty')
  const fixture = await fixtureFor({ ...options, tab, empty })
  const requestLog = createRequestLog()
  const browserEvents = { pageErrors: [], failedRequests: [], attachedFrames: [], extraPages: [], deleteHeaders: [] }
  page.on('pageerror', error => browserEvents.pageErrors.push(error.name))
  page.on('requestfailed', request => {
    const target = new URL(request.url())
    browserEvents.failedRequests.push({ origin: target.origin, pathname: target.pathname })
  })
  page.on('frameattached', frame => {
    const target = new URL(frame.url() || 'about:blank')
    browserEvents.attachedFrames.push({ origin: target.origin, pathname: target.pathname })
  })
  page.context().on('page', openedPage => {
    if (openedPage !== page) {
      const target = new URL(openedPage.url() || 'about:blank')
      browserEvents.extraPages.push({ origin: target.origin, pathname: target.pathname })
    }
  })
  page.on('request', request => {
    const target = new URL(request.url())
    if (request.method() === 'DELETE' && target.pathname.endsWith('/users/9301/favorite_businesses/8102')) {
      const headers = request.headers()
      browserEvents.deleteHeaders.push({
        hasAuthorization: typeof headers.authorization === 'string' && headers.authorization.startsWith('Bearer docs-fixture-'),
        hasApp: headers['x-app-x'] === 'docs-fixture-website-app',
        hasInternal: headers['x-internal-product-x'] === 'website',
        hasSocket: Object.hasOwn(headers, 'x-socket-id-x')
      })
    }
  })
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const root = page.locator("[data-doc-section='favorites']")
  const list = page.locator("[data-doc-section='favorites-list']")
  await expect(root).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/favorite`)
  await expect(list).toHaveAttribute('data-doc-kind', 'businesses')
  await expect(list).toHaveAttribute('data-doc-state', empty ? 'empty' : 'results')
  await expect.poll(() => matches(requestLog, 'GET', businessesPattern).length).toBe(1)
  verifyHydrationQuery(matches(requestLog, 'GET', businessesPattern)[0], empty ? [] : [8101, 8102])

  if (tab !== 'businesses') {
    await root.locator(`[data-doc-control='favorites-tab'][data-doc-tab='${tab}']`).click()
    await expect(list).toHaveAttribute('data-doc-kind', tab)
    await expect(list).toHaveAttribute('data-doc-state', 'results')
  }
  if (tab === 'businesses' && !empty) {
    await expect(list.locator("[data-doc-section='favorite-business-card']")).toHaveCount(2)
    await expect(list.locator("[data-doc-section='favorite-business-card'][data-doc-business-open='true']")).toHaveCount(1)
    await expect(list.locator("[data-doc-section='favorite-business-card'][data-doc-business-open='false']")).toHaveCount(1)
  }
  if (tab === 'products') {
    await expect(list.locator("[data-doc-section='favorite-product-card']")).toHaveCount(2)
  }
  if (tab === 'orders') {
    await expect(list.locator("[data-doc-section='favorite-order-card']")).toHaveCount(1)
    await expect.poll(() => matches(requestLog, 'GET', ordersPattern).length).toBe(1)
    verifyOrderHydrationQuery(matches(requestLog, 'GET', ordersPattern)[0])
  }
  if (tab === 'professionals') {
    await expect(list.locator("[data-doc-section='favorite-professional-card']")).toHaveCount(2)
    await expect(page.locator('body')).not.toContainText('docs-professional@example.invalid')
  }
  for (const request of requestLog.matched) {
    const target = new URL(request.url, 'https://api.docs.invalid')
    const queryKeys = [...target.searchParams.keys()].sort()
    request.url = target.pathname + (queryKeys.length > 0 ? `?${queryKeys.join('&')}` : '')
  }
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['local_phone_code', 'token', 'user'])
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.userSafe).toBe(true)
  await page.evaluate(() => {
    window.__DOC_FAVORITES_GUARD__.storageWrites = []
    window.__DOC_FAVORITES_GUARD__.storageRemovals = []
    window.__DOC_FAVORITES_GUARD__.storageClears = []
    window.__DOC_FAVORITES_GUARD__.navigationAttempts = []
  })
  return { fixture, requestLog, browserEvents, baseline, root, list, tab, empty }
}

const assertIsolation = async (page, runtime, { allowedWrites = [], deleteHeaders = [] } = {}) => {
  const { fixture, requestLog, browserEvents, baseline, tab } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(matches(requestLog, 'GET', favoriteBusinessesPattern)).toHaveLength(1)
  expect(matches(requestLog, 'GET', businessesPattern)).toHaveLength(1)
  expect(matches(requestLog, 'GET', favoriteProductsPattern)).toHaveLength(tab === 'products' ? 1 : 0)
  expect(matches(requestLog, 'GET', favoriteOrdersPattern)).toHaveLength(tab === 'orders' ? 1 : 0)
  expect(matches(requestLog, 'GET', ordersPattern)).toHaveLength(tab === 'orders' ? 1 : 0)
  expect(matches(requestLog, 'GET', favoriteUsersPattern)).toHaveLength(tab === 'professionals' ? 1 : 0)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET').map(({ method, pattern }) => ({ method, pattern }))).toEqual(allowedWrites)
  expect(browserEvents.deleteHeaders).toEqual(deleteHeaders)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(({ origin }) => origin === 'wss://sockets-v3.orderingplus.com').every(({ queryKeys, hasToken }) => (
    queryKeys.includes('project') && queryKeys.includes('token') && hasToken === true
  ))).toBe(true)
  expect(browserEvents.pageErrors).toEqual([])
  expect(browserEvents.attachedFrames).toEqual([])
  expect(browserEvents.extraPages).toEqual([])
  expect(browserEvents.failedRequests).toEqual([
    { origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' },
    { origin: 'https://www.google-analytics.com', pathname: '/analytics.js' }
  ])
  const guard = await page.evaluate(() => window.__DOC_FAVORITES_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.geolocationAttempts).toEqual([])
  expect(guard.storageWrites).toEqual([])
  expect(guard.storageRemovals).toEqual([])
  expect(guard.storageClears).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(await storageShape(page)).toEqual(baseline)
}

test.describe('Favorites documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }

  test('removing one listed closed synthetic business sends one exact delete and retains the open row @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private removal assertion runs on desktop only.')
    const runtime = await setup(page, manifest.captures[0], { remove: true })
    const closed = runtime.list.locator("[data-doc-section='favorite-business-card'][data-doc-business-id='8102']")
    await closed.locator("[data-doc-control='favorite-business-toggle']").click()
    await expect(runtime.list.locator("[data-doc-section='favorite-business-card']")).toHaveCount(1)
    await expect(runtime.list.locator("[data-doc-section='favorite-business-card'][data-doc-business-id='8101']")).toBeVisible()
    await expect(page.getByText('Favorite removed')).toBeVisible()
    const removals = matches(runtime.requestLog, 'DELETE', removeBusinessPattern)
    expect(removals).toHaveLength(1)
    expect(removals[0].body).toBeNull()
    await assertIsolation(page, runtime, {
      allowedWrites: [{ method: 'DELETE', pattern: removeBusinessPattern }],
      deleteHeaders: [{ hasAuthorization: true, hasApp: true, hasInternal: true, hasSocket: true }]
    })
  })

  test.skip('favorite product card clicks remain source-audited because they write tracking before opening availability', async () => {})
  test.skip('product business availability remains response-audited because passive cards expose no available-business count', async () => {})
  test.skip('favorite order detail, review, and reorder actions remain owned by their order-flow articles', async () => {})
  test.skip('favorite add entry points remain source-audited per business, product, order, and professional controller', async () => {})
})
