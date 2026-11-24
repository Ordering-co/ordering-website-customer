import { expect, test } from '@playwright/test'
import { APP_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('order-history.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const orderRoutes = fixture => fixture.routes.filter(route => route.method === 'GET' && route.pattern.startsWith('^/v400/en/docsmarket/orders\\?'))

const fixtureFor = async ({ empty = false, loadMore = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  for (const route of orderRoutes(fixture).filter(route => route.pattern.includes('page=0'))) {
    if (empty) {
      route.response.result = []
      route.response.pagination = { current_page: 1, page_size: 0, total_pages: 1, total: 0, from: 0, to: 0 }
    }
  }
  const next = orderRoutes(fixture).find(route => route.pattern.includes('page=2'))
  next.assert = { count: loadMore ? 1 : 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_ORDER_HISTORY_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [] }
  const safe = value => { const u = new URL(String(value || location.href), location.href); return { origin: u.origin, pathname: u.pathname } }
  window.open = value => { window.__DOC_ORDER_HISTORY_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => { window.__DOC_ORDER_HISTORY_GUARD__.nav.push({ method, ...safe(args[2]) }); return original(...args) }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) { window.__DOC_ORDER_HISTORY_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) }); return Reflect.apply(original, this, args) }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) { window.__DOC_ORDER_HISTORY_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) { window.__DOC_ORDER_HISTORY_GUARD__.messages.push(String(args[1] ?? '')); return Reflect.apply(nativePost, window, args) }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_ORDER_HISTORY_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
})

const storageShape = page => page.evaluate(() => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return { local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).sort(), cookies: document.cookie.split(';').map(v => v.trim().split('=')[0]).filter(Boolean).sort(), tokenSafe: token?.startsWith('docs-fixture-') === true, userSafe: user?.id === 9301 && user?.session?.access_token === token }
})

const verifyOrdersQuery = (request, expectedStatuses, pageSize, page = 0) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()]).toEqual(['orderBy', 'page', 'page_size', 'where'])
  expect(url.searchParams.get('orderBy')).toBe('-id')
  expect(url.searchParams.get('page')).toBe(String(page))
  expect(url.searchParams.get('page_size')).toBe(String(pageSize))
  const where = JSON.parse(url.searchParams.get('where'))
  expect(where.conector).toBe('AND')
  expect(where.conditions[0]).toEqual({ attribute: 'status', value: expectedStatuses })
  expect(where.conditions[1]).toEqual({
    conector: 'OR',
    conditions: [
      { attribute: 'products', conditions: [{ attribute: 'type', value: { condition: '=', value: ['item', 'service'] } }] },
      { attribute: 'cloned_order_id', value: { condition: '!=', value: null } },
      { attribute: 'delivery_type', value: 9 }
    ]
  })
}

const setup = async (page, capture, options = {}) => {
  const fixture = await fixtureFor(options)
  const requestLog = createRequestLog()
  if (capture?.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const root = page.locator("[data-doc-section='order-history']")
  await expect(root).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/profile/orders`)
  await waitForDocumentationReady(page, manifest.readiness)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  const initial = requestLog.matched.filter(item => item.method === 'GET' && item.pattern.startsWith('^/v400/en/docsmarket/orders\\?') && item.url.includes('page=0'))
  expect(initial).toHaveLength(3)
  const parsedUrl = item => new URL(item.url, 'https://api.docs.invalid')
  verifyOrdersQuery(initial.find(item => parsedUrl(item).searchParams.get('page_size') === '30'), [0, 3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26], 30)
  const size10 = initial.filter(item => parsedUrl(item).searchParams.get('page_size') === '10')
  verifyOrdersQuery(size10.find(item => JSON.parse(parsedUrl(item).searchParams.get('where')).conditions[0].value.length === 1), [13], 10)
  verifyOrdersQuery(size10.find(item => JSON.parse(parsedUrl(item).searchParams.get('where')).conditions[0].value.length > 1), [1, 2, 5, 6, 10, 11, 12, 15, 16, 17], 10)
  if (options.empty) {
    await expect(root.locator("[data-doc-section='order-history-empty']")).toBeVisible()
    await expect(root.locator("[data-doc-section='order-history-card']")).toHaveCount(0)
  } else {
    await expect(root.locator("[data-doc-section='order-history-card']")).toHaveCount(3)
    await expect(root.getByText('Upcoming', { exact: true })).toBeVisible()
    await expect(root.getByText('Active', { exact: true })).toBeVisible()
    await expect(root.getByText('Past orders', { exact: true })).toBeVisible()
  }
  const baseline = await storageShape(page)
  await page.evaluate(() => { window.__DOC_ORDER_HISTORY_GUARD__.storage = []; window.__DOC_ORDER_HISTORY_GUARD__.nav = [] })
  return { fixture, requestLog, baseline }
}

const assertIsolation = async (page, runtime) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  await assertWebSocketIsolation(page, { expectedOrigins: ['https://sockets-v3.orderingplus.com'], requireAttempt: true })
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_ORDER_HISTORY_GUARD__)
  expect(guard).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [] })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}

test.describe('Order history documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture, { empty: capture.id.includes('empty') })
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }

  test('load more appends one past order without mutations @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const runtime = await setup(page, { project: 'desktop-chromium' }, { loadMore: true })
    await page.locator("[data-doc-control='order-history-load-more']").click()
    await expect(page.locator("[data-doc-section='order-history-card']")).toHaveCount(4)
    const pageTwo = runtime.requestLog.matched.filter(item => item.method === 'GET' && item.pattern.startsWith('^/v400/en/docsmarket/orders\\?') && new URL(item.url, 'https://api.docs.invalid').searchParams.get('page') === '2')
    expect(pageTwo).toHaveLength(1)
    verifyOrdersQuery(pageTwo[0], [1, 2, 5, 6, 10, 11, 12, 15, 16, 17], 10, 2)
    await expect(page.locator("[data-doc-control='order-history-load-more']")).toHaveCount(0)
    await assertIsolation(page, runtime)
  })

  test.skip('API error and malformed JSON remain private blockers', async () => {})
  test.skip('card, review, reorder, favorite, and empty-state actions remain excluded', async () => {})
})
