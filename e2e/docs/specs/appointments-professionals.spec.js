import { expect, test } from '@playwright/test'
import { APP_WS_ORIGIN } from '../lib/server.cjs'
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

const manifest = await loadManifest('appointments-professionals.manifest')
const listPattern = '^/v400/en/docsmarket/businesses(?:\\?.*)?$'
const typesPattern = '^/v400/en/docsmarket/business_types(?:\\?.*)?$'
const businessPattern = '^/v400/en/docsmarket/business/synthetic-appointments(?:\\?.*)?$'
const productPattern = '^/v400/en/docsmarket/business/9901/categories/services/products/synthetic-consultation\\?type=2&moment=null&version=v2$'
const userPattern = '^/v400/en/docsmarket/users/9301(?:\\?.*)?$'
const settingsPattern = '^/docsmarket/api/frontend/settings(?:\\?.*)?$'
const paymethodsPattern = '^/v400/en/docsmarket/paymethods(?:\\?.*)?$'
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const addressesPattern = '^/v400/en/docsmarket/users/9301/addresses(?:\\?.*)?$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)
const isListCapture = capture => capture.id.startsWith('appointments-list-')

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  routeFor(fixture, 'GET', listPattern).assert = { count: isListCapture(capture) ? 1 : 0 }
  routeFor(fixture, 'GET', typesPattern).assert = { count: isListCapture(capture) ? 1 : 0 }
  routeFor(fixture, 'GET', businessPattern).assert = { count: isListCapture(capture) ? 0 : 1 }
  routeFor(fixture, 'GET', productPattern).assert = { count: capture.id.includes('service') ? 1 : 0 }
  routeFor(fixture, 'GET', userPattern).assert = { count: 1 }
  const orderOptions = fixture.routes.find(route => route.method === 'GET' && route.pattern.startsWith('^/v400/en/docsmarket/order_options'))
  orderOptions.response.result = {
    user_id: 9301,
    type: 2,
    moment: null,
    address_id: 9401,
    address: {
      id: 9401,
      address: '100 Synthetic Appointment Avenue',
      country_code: 'US',
      location: { lat: 30.2672, lng: -97.7431 }
    },
    carts: []
  }
  const addresses = fixture.routes.find(route => route.method === 'GET' && route.pattern.startsWith('^/v400/en/docsmarket/users/9301/addresses'))
  addresses.response.result = [{
    id: 9401,
    user_id: 9301,
    default: true,
    address: '100 Synthetic Appointment Avenue',
    country_code: 'US',
    location: { lat: 30.2672, lng: -97.7431 }
  }]
  for (const route of fixture.routes.filter(route => route.method !== 'GET')) route.assert = { count: 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_APPOINTMENTS_GUARD__ = {
    geo: [], windows: [], forms: [], requests: [], messages: [], navigation: [], storage: [], clears: [], fileClicks: []
  }
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: () => window.__DOC_APPOINTMENTS_GUARD__.geo.push({ requested: true }),
      watchPosition: () => { window.__DOC_APPOINTMENTS_GUARD__.geo.push({ watch: true }); return 1 },
      clearWatch: () => {}
    }
  })
  const safeTarget = value => {
    const target = new URL(String(value || window.location.href), window.location.href)
    return { origin: target.origin, pathname: target.pathname, queryKeys: [...target.searchParams.keys()].sort() }
  }
  window.open = value => { window.__DOC_APPOINTMENTS_GUARD__.windows.push(safeTarget(value)); return null }
  window.HTMLFormElement.prototype.submit = function () { window.__DOC_APPOINTMENTS_GUARD__.forms.push(safeTarget(this.action)) }
  window.HTMLFormElement.prototype.requestSubmit = function () { window.__DOC_APPOINTMENTS_GUARD__.requests.push(safeTarget(this.action)) }
  const nativePostMessage = window.postMessage
  window.postMessage = function (...args) {
    window.__DOC_APPOINTMENTS_GUARD__.messages.push({ hasTargetOrigin: typeof args[1] === 'string' })
    return Reflect.apply(nativePostMessage, window, args)
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method].bind(window.history)
    window.history[method] = (...args) => {
      window.__DOC_APPOINTMENTS_GUARD__.navigation.push({ method, ...safeTarget(args[2]) })
      return original(...args)
    }
  }
  const nativeSetItem = window.Storage.prototype.setItem
  window.Storage.prototype.setItem = function (key, value) {
    window.__DOC_APPOINTMENTS_GUARD__.storage.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
    return Reflect.apply(nativeSetItem, this, [key, value])
  }
  const nativeClear = window.Storage.prototype.clear
  window.Storage.prototype.clear = function () {
    window.__DOC_APPOINTMENTS_GUARD__.clears.push(this === window.localStorage ? 'local' : 'session')
    return Reflect.apply(nativeClear, this, [])
  }
  const nativeClick = window.HTMLInputElement.prototype.click
  window.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') window.__DOC_APPOINTMENTS_GUARD__.fileClicks.push(true)
    return Reflect.apply(nativeClick, this, [])
  }
})

const storageShape = page => page.evaluate(() => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return {
    localKeys: Object.keys(localStorage).sort(),
    sessionKeys: Object.keys(sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(Boolean).sort(),
    tokenReserved: typeof token === 'string' && token.startsWith('docs-fixture-'),
    userId: user?.id,
    tokenConsistent: user?.session?.access_token === token,
    moment: JSON.parse(localStorage.getItem('options') || '{}')?.moment ?? null
  }
})

const clearEffects = page => page.evaluate(() => {
  const guard = window.__DOC_APPOINTMENTS_GUARD__
  for (const key of Object.keys(guard)) guard[key].length = 0
})

const setup = async (page, capture) => {
  const fixture = await fixtureFor(capture)
  const requestLog = createRequestLog()
  const browser = { errors: [], failed: [], frames: [], pages: [] }
  page.on('pageerror', error => browser.errors.push(error.name))
  page.on('requestfailed', request => {
    const target = new URL(request.url())
    browser.failed.push({ origin: target.origin, pathname: target.pathname })
  })
  page.on('frameattached', frame => {
    const target = new URL(frame.url() || 'about:blank')
    browser.frames.push({ origin: target.origin, pathname: target.pathname })
  })
  page.context().on('page', opened => { if (opened !== page) browser.pages.push(true) })
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  if (isListCapture(capture)) {
    const list = page.locator("[data-doc-section='appointments-list']")
    await expect(list).toHaveAttribute('data-doc-state', 'results', { timeout: 30_000 })
    await expect(list).toContainText('Synthetic Appointment Studio')
    await expect(list).toContainText('100 Synthetic Appointment Avenue')
  } else if (capture.id === 'professional-profile-desktop') {
    await expect(page.locator("[data-doc-section='business-professionals']")).toBeVisible({ timeout: 30_000 })
    await page.locator("[data-doc-section='favorite-professional-card']").first().click()
    await expect(page.locator("[data-doc-section='professional-profile-dialog']")).toBeVisible()
    await expect(page.locator("[data-doc-section='professional-profile-dialog'] [data-slot='dialog-title']")).toHaveText('Synthetic Fixture Professional')
    await expect(page.locator("[data-doc-control='professional-profile-book']")).toBeVisible()
  } else {
    const dialog = page.locator("[data-doc-section='product-customization-dialog']")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    const form = page.locator("[data-doc-section='appointment-service-form']")
    await expect(form).toHaveAttribute('data-doc-state', 'ready')
    await expect(form).toContainText('Synthetic Consultation')
    await form.locator("[data-doc-control='appointment-professional-select']").click()
    await form.getByText('Synthetic Fixture Professional', { exact: true }).last().click()
    await expect(form).toContainText('Available')
    await expect(form.locator("[data-doc-control='appointment-time']").first()).toBeVisible()
    if (capture.id === 'service-busy-desktop') {
      const busyTime = form.locator("[data-doc-control='appointment-time'][aria-describedby]").first()
      await expect(busyTime).toBeVisible()
      // The service form previews the slot on activation and blocks Book.
      await expect(busyTime).toHaveAccessibleDescription('Not available')
      await expect(busyTime).toBeEnabled()
      await busyTime.press('Enter')
      await expect(busyTime).toHaveAttribute('aria-pressed', 'true')
      await expect(form).toContainText('Busy on selected time')
      await expect(form.locator("[data-doc-control='appointment-book']")).toBeDisabled()
    }
  }

  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.userId).toBe(9301)
  expect(baseline.tokenConsistent).toBe(true)
  expect(baseline.moment).toBe(null)
  const initializationGeo = await page.evaluate(() => [...window.__DOC_APPOINTMENTS_GUARD__.geo])
  expect(initializationGeo).toEqual([])
  await clearEffects(page)
  return { fixture, requestLog, browser, baseline, initializationGeo }
}

const assertIsolation = async (page, runtime, capture) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  expect(runtime.requestLog.matched.filter(request => request.method !== 'GET')).toEqual([])
  expect(runtime.requestLog.matched.filter(request => request.pattern === userPattern)).toHaveLength(1)
  expect(runtime.requestLog.matched.filter(request => request.pattern === settingsPattern)).toHaveLength(0)
  expect(runtime.requestLog.matched.filter(request => request.pattern === paymethodsPattern)).toHaveLength(1)
  expect(runtime.requestLog.matched.filter(request => request.pattern === validationPattern)).toHaveLength(1)
  expect(runtime.requestLog.matched.filter(request => request.pattern === orderOptionsPattern)).toHaveLength(1)
  expect(runtime.requestLog.matched.filter(request => request.pattern === addressesPattern)).toHaveLength(0)
  const listRequests = runtime.requestLog.matched.filter(request => request.pattern === listPattern)
  const typeRequests = runtime.requestLog.matched.filter(request => request.pattern === typesPattern)
  const businessRequests = runtime.requestLog.matched.filter(request => request.pattern === businessPattern)
  const productRequests = runtime.requestLog.matched.filter(request => request.pattern === productPattern)
  expect(listRequests).toHaveLength(isListCapture(capture) ? 1 : 0)
  expect(typeRequests).toHaveLength(isListCapture(capture) ? 1 : 0)
  expect(businessRequests).toHaveLength(isListCapture(capture) ? 0 : 1)
  expect(productRequests).toHaveLength(capture.id.includes('service') ? 1 : 0)
  if (isListCapture(capture)) {
    const url = new URL(listRequests[0].url, 'https://api.docs.invalid')
    expect([...url.searchParams.keys()].sort()).toEqual([
      'location',
      'orderBy',
      'order_type_id',
      'page',
      'page_size',
      'params'
    ])
    expect(url.searchParams.get('location')).toBe(JSON.stringify({ lat: 30.2672, lng: -97.7431 }))
    expect(url.searchParams.get('order_type_id')).toBe('2')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('page_size')).toBe('10')
    expect(url.searchParams.get('orderBy')).toBe('distance')
    expect(url.searchParams.get('params')).toBe('id,name,description,header,logo,types,location,address,ribbon,timezone,schedule,open,delivery_price,distance,delivery_time,pickup_time,reviews,featured,offers,food,laundry,alcohol,groceries,slug,city,city_id,configs,today,enabled,disabled_reason,available_drivers_count,activated_orders')
  }

  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(({ origin }) => origin === 'wss://sockets-v3.orderingplus.com').every(({ queryKeys, hasToken }) => (
    queryKeys.includes('project') && queryKeys.includes('token') && hasToken === true
  ))).toBe(true)
  expect(runtime.browser.errors).toEqual([])
  expect(runtime.browser.frames).toEqual([])
  expect(runtime.browser.pages).toEqual([])
  expect(runtime.browser.failed.filter(({ origin }) => ![
    'https://fonts.gstatic.com', 'https://cdn.onesignal.com', 'https://www.google-analytics.com'
  ].includes(origin))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_APPOINTMENTS_GUARD__)
  expect(guard.geo).toEqual([])
  expect(guard.windows).toEqual([])
  expect(guard.forms).toEqual([])
  expect(guard.requests).toEqual([])
  expect(guard.messages).toEqual([])
  expect(guard.navigation).toEqual([])
  expect(guard.storage).toEqual([])
  expect(guard.clears).toEqual([])
  expect(guard.fileClicks).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(await storageShape(page)).toEqual(runtime.baseline)
}

test.describe('Appointments and professionals documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(75_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime, capture)
    })
  }
})
