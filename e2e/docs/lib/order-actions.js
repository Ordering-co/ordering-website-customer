import { expect } from '@playwright/test'
import { APP_WS_ORIGIN } from './server.cjs'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from './fixtures.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from './network.js'

export const clone = value => JSON.parse(JSON.stringify(value))

export const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))

export const orderFixture = async (fixtureName, mutate = () => {}) => {
  const fixture = clone(await loadFixture(fixtureName))
  const order = routeFor(fixture, 'GET', 'orders/docs-order-active$')
  routeFor(fixture, 'GET', 'business/8101').assert = { count: 1 }
  routeFor(fixture, 'GET', 'orders/8701/messages').assert = { count: 1 }
  routeFor(fixture, 'GET', 'orders/8702/messages').assert = { count: 0 }
  routeFor(fixture, 'GET', 'orders/undefined/messages').assert = { count: 0 }
  routeFor(fixture, 'GET', 'loyalty_plans').assert = { count: 1 }
  routeFor(fixture, 'GET', 'orders\\?orderBy=-').assert = { count: 0 }
  order.assert = { count: 1 }
  order.response.result.status = 11
  order.response.result.delivery_datetime = '2026-08-01 12:00:00'
  order.response.result.delivery_datetime_utc = '2026-08-01 17:00:00'
  order.response.result.reporting_data = { at: { 'status:11': '2026-08-01 17:05:00' } }
  await mutate({ fixture, order, orderOptions: routeFor(fixture, 'GET', 'order_options') })
  assertFixturePrivacy(fixture)
  return fixture
}

export const insertWriteRoute = (fixture, route) => {
  const index = fixture.routes.findIndex(item => item.method === route.method && item.pattern === '.*')
  fixture.routes.splice(index < 0 ? fixture.routes.length : index, 0, route)
}

export const installOrderBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_ORDER_ACTION_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [] }
  const safe = value => { const url = new URL(String(value || location.href), location.href); return { origin: url.origin, pathname: url.pathname } }
  window.open = value => { window.__DOC_ORDER_ACTION_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => { window.__DOC_ORDER_ACTION_GUARD__.nav.push({ method, ...safe(args[2]) }); return original(...args) }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) { window.__DOC_ORDER_ACTION_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) }); return Reflect.apply(original, this, args) }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) { window.__DOC_ORDER_ACTION_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) { window.__DOC_ORDER_ACTION_GUARD__.messages.push(String(args[1] ?? '')); return Reflect.apply(nativePost, window, args) }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_ORDER_ACTION_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
})

export const orderStorageShape = page => page.evaluate(() => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return {
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
    cookies: document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(Boolean).sort(),
    tokenSafe: token?.startsWith('docs-fixture-') === true,
    userSafe: user?.id === 9301 && user?.session?.access_token === token
  }
})

export const initializeOrderPage = async ({ page, fixture, mobile = false }) => {
  const requestLog = createRequestLog()
  const writeMetadata = []
  if (mobile) await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installOrderBrowserGuards(page)
  await page.addInitScript(() => { window.__DOC_ORDER_WRITE_KEYS__ = [] })
  page.on('request', request => {
    if (request.method() === 'GET') return
    const url = new URL(request.url())
    const headers = request.headers()
    writeMetadata.push({
      method: request.method(),
      pathname: url.pathname,
      queryKeys: [...url.searchParams.keys()].sort(),
      hasAuthorization: Boolean(headers.authorization),
      hasApp: Boolean(headers['x-app-x']),
      hasInternal: Boolean(headers['x-internal-product-x']),
      hasSocket: Boolean(headers['x-socket-id-x']),
      hasCountry: Boolean(headers['x-country-code-x'])
    })
  })
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto('/orders/docs-order-active', { waitUntil: 'domcontentloaded' })
  return { requestLog, writeMetadata }
}

export const settleOrderPage = async ({ page, fixture, requestLog, network = { quietMs: 350, timeout: 7000 } }) => {
  const root = page.locator("[data-doc-section='order-details']")
  await expect(root).toBeVisible({ timeout: 30_000 })
  await waitForRequestQuiescence(requestLog, network)
  const baseline = await orderStorageShape(page)
  await page.evaluate(() => { window.__DOC_ORDER_ACTION_GUARD__.storage = []; window.__DOC_ORDER_ACTION_GUARD__.nav = [] })
  return { fixture, requestLog, baseline }
}

export const assertOrderIsolation = async ({ page, fixture, requestLog, baseline, allowedWrites = 0, network = { quietMs: 350, timeout: 7000 } }) => {
  await waitForRequestQuiescence(requestLog, network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(attempt => attempt.origin === 'wss://sockets-v3.orderingplus.com' && attempt.pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(attempt => (
    (attempt.origin === APP_WS_ORIGIN && attempt.pathname === '/') ||
    (attempt.origin === 'wss://sockets-v3.orderingplus.com' && attempt.pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(attempt => attempt.origin === 'wss://sockets-v3.orderingplus.com').every(attempt => attempt.hasToken && attempt.queryKeys.includes('project') && attempt.queryKeys.includes('token'))).toBe(true)
  expect(requestLog.matched.filter(item => item.method !== 'GET')).toHaveLength(allowedWrites)
  const guard = await page.evaluate(() => window.__DOC_ORDER_ACTION_GUARD__)
  expect(guard).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [] })
  expect(await orderStorageShape(page)).toEqual(baseline)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}
