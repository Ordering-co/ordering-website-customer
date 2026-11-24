import { expect, test } from '@playwright/test'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('tracking-only.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))

const fixtureFor = async ({ terminal = false, notFound = false, home = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const order = routeFor(fixture, 'GET', 'orders/docs-order-active$')
  const business = routeFor(fixture, 'GET', 'business/8101')
  const loyalty = routeFor(fixture, 'GET', 'loyalty_plans')
  const group = routeFor(fixture, 'GET', 'orders\\?orderBy=-')
  for (const fragment of ['orders/8701/messages', 'orders/8702/messages', 'orders/undefined/messages', 'frontend/settings', 'paymethods', 'validation_field_order_types', 'users/9301']) {
    const route = routeFor(fixture, 'GET', fragment)
    if (route) route.assert = { count: 0 }
  }
  order.assert = { count: home ? 0 : 1 }
  business.assert = { count: home || notFound ? 0 : 1 }
  loyalty.assert = { count: 0 }
  group.assert = { count: 0 }
  if (terminal) {
    order.response.result.status = 11
    order.response.result.delivery_datetime = '2026-08-01 12:00:00'
    order.response.result.delivery_datetime_utc = '2026-08-01 17:00:00'
    order.response.result.reporting_data = { at: { 'status:11': '2026-08-01 17:05:00' } }
  }
  if (notFound) {
    order.response = { error: true, result: ['SYNTHETIC_NOT_FOUND'] }
  }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_TRACKING_GUARD__ = { open: [], forms: [], geo: [] }
  const safe = value => { const u = new URL(String(value || location.href), location.href); return { origin: u.origin, pathname: u.pathname } }
  window.open = value => { window.__DOC_TRACKING_GUARD__.open.push(safe(value)); return null }
  for (const method of ['submit', 'requestSubmit']) { const original = HTMLFormElement.prototype[method]; HTMLFormElement.prototype[method] = function (...args) { window.__DOC_TRACKING_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) } }
  if (navigator.geolocation) { navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_TRACKING_GUARD__.geo.push(true); error?.({ code: 1 }) }; navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition }
})

const setup = async (page, capture) => {
  const terminal = capture.id.includes('terminal')
  const notFound = capture.id.includes('not-found')
  const home = capture.id.includes('home')
  const orderTab = capture.id.includes('order-tab')
  const fixture = await fixtureFor({ terminal, notFound, home })
  const requestLog = createRequestLog()
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: false })
  await installNetworkGuard(page, fixture, requestLog)
  const route = capture.route || manifest.route
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const root = page.locator(capture.selector)
  await expect(root).toBeVisible({ timeout: 30_000 })
  await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [capture.selector] })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)

  const header = page.locator('#left-side')
  await expect(header).toBeVisible()
  await expect(page.getByText('Login', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Sign up', { exact: true })).toHaveCount(0)
  await expect(page.locator('#center-side')).toHaveCount(0)
  await expect(page.locator('#right-side')).toHaveCount(0)

  if (home) {
    await expect(root).toContainText('Follow your order')
    await expect(root).toContainText('open the link we sent you')
  } else if (notFound) {
    await expect(root).toContainText("Sorry, we couldn't find the requested order.")
    await expect(root.getByRole('button', { name: 'Go to home' })).toBeVisible()
    await expect(root).not.toContainText('SYNTHETIC_NOT_FOUND')
  } else if (terminal) {
    await expect(root).toContainText('We have delivered your order')
    await expect(root.locator("[data-doc-section='order-tracking-survey']")).toBeVisible()
    await expect(root).toContainText('Tell us how your delivery and order experience went.')
  } else {
    await expect(root).toContainText('We are preparing your order')
    await expect(root).toContainText('Estimated delivery:')
    await expect(root.locator("[data-doc-section='order-tracking-stages']")).toBeVisible()
    await expect(root.locator("[data-doc-section='order-tracking-tabs']")).toBeVisible()
    await expect(root).toContainText('Synthetic Orders Synthetic Customer')
    await expect(root).toContainText('100 Synthetic Customer Avenue')
    await root.locator("[data-doc-control='order-tracking-tab-order']").click()
    await expect(root).toContainText('Total cost')
    await expect(root).toContainText('Synthetic Bowl')
    if (!orderTab) await root.locator("[data-doc-control='order-tracking-tab-delivery']").click()
  }
  return { fixture, requestLog }
}

const assertIsolation = async (page, runtime) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  await assertWebSocketIsolation(page, { expectedOrigins: ['https://sockets-v3.orderingplus.com'], requireAttempt: false })
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(runtime.requestLog.matched.filter(item => /messages|reorder|review|tracking_events/.test(item.url))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_TRACKING_GUARD__)
  expect(guard).toEqual({ open: [], forms: [], geo: [] })
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}

test.describe('Tracking-only site documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }
})
