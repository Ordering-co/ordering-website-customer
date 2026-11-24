import { expect, test } from '@playwright/test'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('order-details-tracking.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))

const fixtureFor = async ({ terminal = false, terminalMobile = false, notFound = false, multi = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const order = routeFor(fixture, 'GET', 'orders/docs-order-active$')
  const business = routeFor(fixture, 'GET', 'business/8101')
  const messageOne = routeFor(fixture, 'GET', 'orders/8701/messages')
  const messageTwo = routeFor(fixture, 'GET', 'orders/8702/messages')
  const messageUndefined = routeFor(fixture, 'GET', 'orders/undefined/messages')
  const loyalty = routeFor(fixture, 'GET', 'loyalty_plans')
  const group = routeFor(fixture, 'GET', 'orders\\?orderBy=-')
  order.assert = { count: multi ? 0 : 1 }
  business.assert = { count: multi || notFound ? 0 : 1 }
  messageOne.assert = { count: notFound || multi ? 0 : 1 }
  messageTwo.assert = { count: 0 }
  messageUndefined.assert = { count: 0 }
  loyalty.assert = { count: multi ? 0 : 1 }
  group.assert = { count: multi ? 1 : 0 }
  if (terminal) {
    order.response.result.status = 11
    order.response.result.delivery_datetime = '2026-08-01 12:00:00'
    order.response.result.delivery_datetime_utc = '2026-08-01 17:00:00'
    order.response.result.reporting_data = { at: { 'status:11': '2026-08-01 17:05:00' } }
    if (terminalMobile) order.response.result.review = true
  }
  if (notFound) {
    order.response = { error: true, result: ['SYNTHETIC_NOT_FOUND'] }
    messageOne.assert = { count: 0 }
  }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_ORDER_DETAILS_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [] }
  const safe = value => { const u = new URL(String(value || location.href), location.href); return { origin: u.origin, pathname: u.pathname } }
  window.open = value => { window.__DOC_ORDER_DETAILS_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) { const original = history[method].bind(history); history[method] = (...args) => { window.__DOC_ORDER_DETAILS_GUARD__.nav.push({ method, ...safe(args[2]) }); return original(...args) } }
  for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function (...args) { window.__DOC_ORDER_DETAILS_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) }); return Reflect.apply(original, this, args) } }
  for (const method of ['submit', 'requestSubmit']) { const original = HTMLFormElement.prototype[method]; HTMLFormElement.prototype[method] = function (...args) { window.__DOC_ORDER_DETAILS_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) } }
  const nativePost = window.postMessage
  window.postMessage = function (...args) { window.__DOC_ORDER_DETAILS_GUARD__.messages.push(String(args[1] ?? '')); return Reflect.apply(nativePost, window, args) }
  if (navigator.geolocation) { navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_ORDER_DETAILS_GUARD__.geo.push(true); error?.({ code: 1 }) }; navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition }
})

const storageShape = page => page.evaluate(() => { const token = localStorage.getItem('token'); const user = JSON.parse(localStorage.getItem('user') || 'null'); return { local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).sort(), cookies: document.cookie.split(';').map(v => v.trim().split('=')[0]).filter(Boolean).sort(), tokenSafe: token?.startsWith('docs-fixture-') === true, userSafe: user?.id === 9301 && user?.session?.access_token === token } })

const setup = async (page, capture) => {
  const multi = capture.id.startsWith('multi-orders')
  const terminal = capture.id.includes('terminal')
  const notFound = capture.id.includes('not-found')
  const fixture = await fixtureFor({ terminal, terminalMobile: capture.id === 'order-details-terminal-mobile', notFound, multi })
  const requestLog = createRequestLog()
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  const route = capture.route || manifest.route
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const root = page.locator(multi ? "[data-doc-section='multi-order-details']" : "[data-doc-section='order-details']")
  await expect(root).toBeVisible({ timeout: 30_000 })
  await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [multi ? "[data-doc-section='multi-order-details']" : "[data-doc-section='order-details']"] })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  if (multi) {
    await expect(root.locator("[data-doc-section='multi-order-customer']")).toBeVisible()
    await expect(root.locator("[data-doc-section='multi-order-summary']")).toContainText('21')
    await expect(root.getByText('Order #8701', { exact: true })).toBeVisible()
    await expect(root.getByText('Order #8702', { exact: true })).toBeVisible()
    const groupRead = requestLog.matched.find(item => item.pattern.includes('orders\\?orderBy=-'))
    const url = new URL(groupRead.url, 'https://api.docs.invalid')
    expect([...url.searchParams.keys()]).toEqual(['orderBy', 'where'])
    expect(url.searchParams.get('orderBy')).toBe('-')
    expect(JSON.parse(url.searchParams.get('where'))).toEqual([{ attribute: 'cart_group_id', value: 'docs-group' }])
  } else if (notFound) {
    await expect(root).toContainText("Sorry, we couldn't find the requested order.")
    await expect(root.getByRole('button', { name: 'Go to Orders' })).toBeVisible()
    await expect(root).not.toContainText('SYNTHETIC_NOT_FOUND')
    await expect(root).not.toContainText('Synthetic message history unavailable.')
  } else if (terminal) {
    await expect(root.locator("[data-doc-section='order-details-terminal']")).toBeVisible()
    await expect(root).toContainText('Order Details')
    await expect(root.getByRole('button', { name: 'Order again' })).toBeVisible()
  } else {
    await expect(root.locator("[data-doc-section='order-details-active']")).toBeVisible()
    await expect(root).toContainText('Accepted by business')
    await expect(root).toContainText('Synthetic Bowl')
  }
  const baseline = await storageShape(page)
  await page.evaluate(() => { window.__DOC_ORDER_DETAILS_GUARD__.storage = []; window.__DOC_ORDER_DETAILS_GUARD__.nav = [] })
  return { fixture, requestLog, baseline, multi, notFound }
}

const assertIsolation = async (page, runtime) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  await assertWebSocketIsolation(page, { expectedOrigins: ['https://sockets-v3.orderingplus.com'], requireAttempt: true })
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(runtime.requestLog.matched.filter(item => /\/messages\/[^/]+\/read$/.test(new URL(item.url, 'https://api.docs.invalid').pathname))).toEqual([])
  expect(runtime.requestLog.matched.filter(item => /reorder|review|tracking_events|confirm|place/.test(item.url))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_ORDER_DETAILS_GUARD__)
  expect(guard).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [] })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}

test.describe('Order details and tracking documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }
  test.skip('hash access, driver tracking, maps, messaging, reorder, review, and status changes remain source-only', async () => {})
})
