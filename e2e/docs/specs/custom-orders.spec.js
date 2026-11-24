import fs from 'node:fs/promises'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import { expect, test } from '@playwright/test'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { resolveProductPath } from '../lib/paths.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('custom-orders.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const isBanner = capture => capture.id.includes('banner')
const isDistance = capture => capture.id.includes('distance-exceeded')
const isStep2 = capture => capture.id.includes('step2')
const isReady = capture => capture.id.includes('ready') || capture.id === 'custom-order-step1-mobile' || capture.id === 'custom-order-step2-mobile'
const bannerUrl = 'https://cloud-assets.orderingplus.com/image/upload/projectcnew/iaex8mo4xlpuovii6asg/1774629480.jpg'
const pluginOrigin = 'https://custom-order.plugins.orderingplus.com'
const conversionOrigin = 'https://google-redirect.plugins.orderingplus.com'
const conversionSettingsPath = '/docsmarket/api/frontend/settings'
const configPath = '/docsmarket/api/config'
const placePath = '/docsmarket/api/orders/custom'
const addressPath = '/v400/en/docsmarket/users/9301/addresses'
const pickup = { name: 'Synthetic Pickup Shop', address: '100 Synthetic Pickup Way, Docs City', location: { lat: 30.2682, lng: -97.7441 } }
const delivery = { address: '200 Synthetic Delivery Way, Docs City', location: { lat: 30.2672, lng: -97.7431 } }
const alternateDelivery = { address: '300 Synthetic Alternate Delivery Way, Docs City', location: { lat: 30.2702, lng: -97.7461 } }

const googleStub = `(() => {
  const details = {
    pickup: ${JSON.stringify(pickup)},
    delivery: ${JSON.stringify(alternateDelivery)}
  };
  class LatLng {
    constructor(lat, lng) { this._lat = Number(lat); this._lng = Number(lng); }
    lat() { return this._lat; }
    lng() { return this._lng; }
  }
  class LatLngBounds {
    constructor() { this.points = []; }
    extend(point) { this.points.push(point); return this; }
    isEmpty() { return this.points.length === 0; }
    union() { return this; }
  }
  class Map {
    constructor(node, options) {
      this.node = node; this.options = options; this.zoom = options.zoom || 18;
      node.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ccfbf1,#dbeafe);color:#164e63;font:600 14px sans-serif;letter-spacing:.03em">Synthetic route preview</div>';
    }
    fitBounds() {}
    panTo() {}
    getZoom() { return this.zoom; }
    setZoom(value) { this.zoom = value; }
    getCenter() { return new LatLng(this.options.center.lat, this.options.center.lng); }
  }
  class Marker {
    constructor(options) { this.position = options.position; this.map = options.map; this.title = options.title; }
    addListener() {}
    setMap(value) { this.map = value; }
    getPosition() { return this.position; }
    setPosition(value) { this.position = value; }
  }
  class Autocomplete {
    constructor(input) { this.input = input; input.addEventListener('docs-place', () => this.callback && this.callback()); }
    addListener(name, callback) { if (name === 'place_changed') this.callback = callback; }
    getPlace() {
      const chosen = this.input.dataset.docControl === 'custom-order-pickup-address' ? details.pickup : details.delivery;
      return {
        formatted_address: chosen.address,
        name: chosen.name || 'Synthetic Delivery',
        types: ['establishment'],
        place_id: 'docs-fixture-place',
        utc_offset_minutes: -300,
        address_components: [],
        geometry: { location: { lat: () => chosen.location.lat, lng: () => chosen.location.lng } }
      };
    }
  }
  window.google = { maps: {
    places: { Autocomplete }, Map, Marker, LatLng, LatLngBounds,
    Size: class Size { constructor(width, height) { this.width = width; this.height = height; } },
    MapTypeControlStyle: { HORIZONTAL_BAR: 1 }, ControlPosition: { TOP_LEFT: 1 },
    event: { addListener() {}, addListenerOnce(target, name, callback) { callback && callback(); }, clearListeners() {}, clearInstanceListeners() {} },
    geometry: { spherical: { computeDistanceBetween() { return 0; } } }
  } };
  window.googleAsyncInit && window.googleAsyncInit();
})();`

const installBrowserGuards = page => page.addInitScript(() => {
  const safe = value => {
    const url = new URL(String(value || location.href), location.href)
    return { origin: url.origin, pathname: url.pathname, queryKeys: [...new Set([...url.searchParams.keys()])].sort() }
  }
  window.__DOC_CUSTOM_ORDER_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], frames: [], geo: [], unload: [] }
  window.open = value => { window.__DOC_CUSTOM_ORDER_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => {
      window.__DOC_CUSTOM_ORDER_GUARD__.nav.push({ method, ...safe(args[2]) })
      return original(...args)
    }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) {
      window.__DOC_CUSTOM_ORDER_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) })
      return Reflect.apply(original, this, args)
    }
  }
  for (const method of ['submit', 'requestSubmit']) {
    HTMLFormElement.prototype[method] = function () { window.__DOC_CUSTOM_ORDER_GUARD__.forms.push(method) }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) {
    window.__DOC_CUSTOM_ORDER_GUARD__.messages.push(String(args[1] ?? ''))
    return Reflect.apply(nativePost, window, args)
  }
  const nativeSet = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if ((this instanceof HTMLIFrameElement || this instanceof HTMLFrameElement) && name.toLowerCase() === 'src') window.__DOC_CUSTOM_ORDER_GUARD__.frames.push(safe(value))
    return Reflect.apply(nativeSet, this, [name, value])
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_CUSTOM_ORDER_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
  for (const name of ['beforeunload', 'pagehide']) window.addEventListener(name, () => window.__DOC_CUSTOM_ORDER_GUARD__.unload.push(name))
})

const installExternalFixtures = async (page, capture, external, requestLog, options = {}) => {
  const bannerBody = await fs.readFile(resolveProductPath('e2e', 'docs', 'assets', 'custom-order-banner.svg'), 'utf8')
  await page.route(bannerUrl, async route => {
    external.push({ method: 'GET', origin: 'https://cloud-assets.orderingplus.com', pathname: new URL(route.request().url()).pathname, queryKeys: [] })
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: bannerBody })
  })
  await page.route(`${conversionOrigin}/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = await request.allHeaders()
    if (request.method() === 'GET' && url.pathname === conversionSettingsPath && url.search === '') {
      const pattern = '^/docsmarket/api/frontend/settings(?:\\?.*)?$'
      requestLog.matched.push({ method: 'GET', url: url.pathname, pattern, body: null })
      external.push({
        method: 'GET',
        origin: url.origin,
        pathname: url.pathname,
        queryKeys: [],
        hasAuthorization: /^Bearer\s+/.test(headers.authorization || '')
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: false, result: { settings: {} } })
      })
      return
    }
    external.push({ method: request.method(), origin: url.origin, pathname: url.pathname, queryKeys: [...url.searchParams.keys()].sort(), unexpected: true })
    await route.fulfill({ status: 418, contentType: 'application/json', body: JSON.stringify({ error: true, result: ['Blocked conversion request.'] }) })
  })
  await page.route(`${pluginOrigin}/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = await request.allHeaders()
    if (request.method() === 'GET' && url.pathname === configPath && url.search === '') {
      external.push({ method: 'GET', origin: url.origin, pathname: url.pathname, queryKeys: [], hasNgrok: headers['ngrok-skip-browser-warning'] === 'true', hasAuthorization: Boolean(headers.authorization) })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: false, result: { max_distance: isDistance(capture) ? 0.05 : 10, max_weight: 12, delivery_fee_multiplier: 4 } }) })
      return
    }
    if (request.method() === 'POST' && url.pathname === placePath && options.placeError) {
      let bodyMatches = false
      try {
        const body = request.postDataJSON()
        bodyMatches = JSON.stringify(body) === JSON.stringify({
          paymethod_gateway: 'cash',
          address_id: 9701,
          pickup: { name: pickup.name, address: pickup.address, location: pickup.location },
          products: [{ name: 'Synthetic boxed item', quantity: 2 }],
          declared_value: 30
        })
      } catch {}
      external.push({ method: 'POST', origin: url.origin, pathname: url.pathname, queryKeys: [], hasAuthorization: /^Bearer\s+/.test(headers.authorization || ''), hasNgrok: headers['ngrok-skip-browser-warning'] === 'true', hasJson: headers['content-type']?.includes('application/json') === true, bodyMatches })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: true, result: ['Synthetic custom order was not placed.'] }) })
      return
    }
    external.push({ method: request.method(), origin: url.origin, pathname: url.pathname, queryKeys: [...url.searchParams.keys()].sort(), unexpected: true })
    await route.fulfill({ status: 418, contentType: 'application/json', body: JSON.stringify({ error: true, result: ['Blocked external request.'] }) })
  })
  await page.route('https://maps.googleapis.com/maps/api/js?**', async route => {
    const url = new URL(route.request().url())
    external.push({ method: 'GET', origin: url.origin, pathname: url.pathname, queryKeys: [...url.searchParams.keys()].sort(), hasReservedKey: url.searchParams.get('key') === 'docs-fixture-google-maps-key' })
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: googleStub })
  })
}

const installAddressErrorFixture = async (page, addressWrites) => {
  await page.route(`https://api.docs.invalid${addressPath}`, async route => {
    const request = route.request()
    const headers = await request.allHeaders()
    let bodyMatches = false
    try {
      const body = request.postDataJSON()
      bodyMatches = JSON.stringify(body) === JSON.stringify({ address: alternateDelivery.address, location: JSON.stringify(alternateDelivery.location) })
    } catch {}
    addressWrites.push({ method: request.method(), pathname: new URL(request.url()).pathname, hasAuthorization: /^Bearer\s+/.test(headers.authorization || ''), hasApp: Boolean(headers['x-app-x']), hasInternal: Boolean(headers['x-internal-product-x']), hasCountry: Boolean(headers['x-country-code-x']), hasSocket: Object.hasOwn(headers, 'x-socket-id-x'), bodyMatches })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: true, result: ['Synthetic address was not saved.'] }) })
  })
}

const credentialShape = page => page.evaluate(() => {
  let user = null
  try { user = JSON.parse(localStorage.getItem('user') || 'null') } catch {}
  return {
    keys: Object.keys(localStorage).sort(),
    sessionKeys: Object.keys(sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(value => value.split('=')[0].trim()).filter(Boolean).sort(),
    hasToken: typeof localStorage.getItem('token') === 'string',
    hasUser: Boolean(user && typeof user === 'object'),
    tokenConsistent: Boolean(user?.session?.access_token && user.session.access_token === localStorage.getItem('token'))
  }
})

const storeStorageBaseline = page => page.evaluate(() => {
  window.__DOC_CUSTOM_STORAGE_BASELINE__ = JSON.stringify({
    local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
    cookie: document.cookie
  })
})

const storageStayedStable = page => page.evaluate(() => window.__DOC_CUSTOM_STORAGE_BASELINE__ === JSON.stringify({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
  cookie: document.cookie
}))

const selectPlace = async (page, control) => {
  const input = page.locator(`[data-doc-control='${control}']`)
  await expect(input).toBeEnabled()
  await input.evaluate((node, value) => {
    node.value = value
    node.dispatchEvent(new Event('docs-place'))
  }, control === 'custom-order-pickup-address' ? pickup.address : alternateDelivery.address)
}

const openStep1 = async page => {
  await page.locator("[data-doc-control='custom-order-open']").click()
  const step = page.locator("[data-doc-section='custom-order-step1']")
  await expect(step).toBeVisible()
  await expect(step.locator("[data-doc-control='custom-order-delivery-address']")).toHaveValue(delivery.address)
  await expect(step.locator("[data-doc-control='custom-order-continue']")).toBeDisabled()
  return step
}

const makeStep1Ready = async page => {
  const step = await openStep1(page)
  await selectPlace(page, 'custom-order-pickup-address')
  await expect(step).toHaveAttribute('data-doc-state', /ready|distance-exceeded/)
  await expect(step.locator("[data-doc-control='custom-order-pickup-name']")).toHaveValue(pickup.name)
  return step
}

const enterStep2 = async page => {
  const step1 = await makeStep1Ready(page)
  await expect(step1.locator("[data-doc-control='custom-order-continue']")).toBeEnabled()
  await step1.locator("[data-doc-control='custom-order-continue']").click()
  const step2 = page.locator("[data-doc-section='custom-order-step2']")
  await expect(step2).toBeVisible()
  return step2
}

const makeStep2Ready = async page => {
  const step2 = await enterStep2(page)
  await step2.locator("[data-doc-control='custom-order-item-name']").fill('Synthetic boxed item')
  await step2.locator("[data-doc-control='custom-order-quantity-increase']").click()
  await expect(step2).toHaveAttribute('data-doc-state', 'ready')
  await expect(step2.locator('.qty-value')).toHaveText('2')
  return step2
}

const setup = async (page, capture, options = {}) => {
  if (capture.project === 'mobile-chromium') {
    await page.setViewportSize({ width: capture.id === 'custom-order-step2-mobile' ? 600 : 480, height: 1100 })
  }
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  const fixture = clone(await loadFixture(manifest.fixture))
  const requestLog = createRequestLog()
  const external = []
  const addressWrites = []
  const browserEvents = { popups: 0, frames: 0, pages: 0, pageErrors: [], failed: [] }
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await installExternalFixtures(page, capture, external, requestLog, options)
  if (options.addressError) await installAddressErrorFixture(page, addressWrites)
  page.on('popup', popup => { browserEvents.popups += 1; void popup.close() })
  page.on('frameattached', frame => { if (frame !== page.mainFrame()) browserEvents.frames += 1 })
  page.context().on('page', opened => { if (opened !== page) browserEvents.pages += 1 })
  page.on('pageerror', error => browserEvents.pageErrors.push(error.message))
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    if (url.origin !== APP_ORIGIN) browserEvents.failed.push({ origin: url.origin, pathname: url.pathname })
  })
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect(page.locator("[data-doc-section='custom-order-banner']")).toBeVisible({ timeout: 30_000 })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  await page.waitForTimeout(500)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  await storeStorageBaseline(page)
  await page.evaluate(() => { window.__DOC_CUSTOM_ORDER_GUARD__.storage = []; window.__DOC_CUSTOM_ORDER_GUARD__.nav = [] })
  return { fixture, requestLog, external, addressWrites, browserEvents, credentialShape: await credentialShape(page), expectedUrl: page.url() }
}

const assertIsolation = async (page, runtime, expected = {}) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  const externalPosts = runtime.external.filter(item => item.method !== 'GET')
  expect(externalPosts).toHaveLength(expected.placePosts || 0)
  expect(runtime.addressWrites).toHaveLength(expected.addressPosts || 0)
  expect(runtime.external.filter(item => item.unexpected)).toEqual([])
  expect(runtime.external.filter(item => item.origin === 'https://cloud-assets.orderingplus.com')).toHaveLength(1)
  expect(runtime.external.filter(item => item.origin === conversionOrigin)).toEqual([])
  expect(runtime.external.filter(item => item.pathname === configPath)).toHaveLength(expected.modalOpen ? 1 : 0)
  expect(runtime.external.filter(item => item.origin === 'https://maps.googleapis.com')).toHaveLength(expected.modalOpen ? 1 : 0)
  expect(runtime.external.filter(item => item.pathname === configPath).every(item => item.hasNgrok && !item.hasAuthorization)).toBe(true)
  expect(runtime.external.filter(item => item.origin === 'https://maps.googleapis.com').every(item => item.hasReservedKey && JSON.stringify(item.queryKeys) === JSON.stringify(['callback', 'key', 'libraries']))).toBe(true)
  expect(await page.evaluate(() => window.__DOC_CUSTOM_ORDER_GUARD__)).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], frames: [], geo: [], unload: [] })
  expect(await storageStayedStable(page)).toBe(true)
  expect(await credentialShape(page)).toEqual(runtime.credentialShape)
  expect(runtime.credentialShape.hasToken).toBe(true)
  expect(runtime.credentialShape.hasUser).toBe(true)
  expect(runtime.credentialShape.tokenConsistent).toBe(true)
  expect(runtime.credentialShape.keys.some(key => key.startsWith('google_rwg_'))).toBe(false)
  expect(runtime.credentialShape.sessionKeys.some(key => key.startsWith('google_rwg_'))).toBe(false)
  expect(page.url()).toBe(runtime.expectedUrl)
  expect(new URL(page.url()).searchParams.has('rwg_token')).toBe(false)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(runtime.browserEvents).toEqual({ popups: 0, frames: 0, pages: 0, pageErrors: [], failed: [{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }] })
  const sockets = await assertWebSocketIsolation(page)
  const ordering = sockets.filter(item => item.origin === 'wss://sockets-v3.orderingplus.com')
  expect(ordering.length).toBeGreaterThan(0)
  expect(ordering.every(item => item.pathname === '/socket.io/' && item.queryKeys.includes('project') && item.queryKeys.includes('token') && item.hasToken)).toBe(true)
  expect(sockets.every(item => (item.origin === APP_WS_ORIGIN && item.pathname === '/') || (item.origin === 'wss://sockets-v3.orderingplus.com' && item.pathname === '/socket.io/'))).toBe(true)
}

test.describe('Custom order documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(75_000)
      const runtime = await setup(page, capture)
      let target = page.locator(capture.selector)
      if (!isBanner(capture)) {
        if (isStep2(capture)) {
          const step = isReady(capture) ? await makeStep2Ready(page) : await enterStep2(page)
          if (!isReady(capture)) await expect(step.locator("[data-doc-control='custom-order-place']")).toBeDisabled()
        } else {
          const step = isReady(capture) || isDistance(capture) ? await makeStep1Ready(page) : await openStep1(page)
          if (isDistance(capture)) {
            await expect(step).toHaveAttribute('data-doc-state', 'distance-exceeded')
            await expect(step.getByText(/Distance exceeded/)).toBeVisible()
            await expect(step.locator("[data-doc-control='custom-order-continue']")).toBeDisabled()
          }
        }
        target = page.locator(capture.selector)
      }
      await waitForDocumentationReady(page, manifest.readiness, capture.selector)
      if (capture.project === 'mobile-chromium' && !isBanner(capture)) {
        await target.scrollIntoViewIfNeeded()
        await target.evaluate(node => {
          for (let current = node; current; current = current.parentElement) current.scrollLeft = 0
          document.documentElement.scrollLeft = 0
          document.body.scrollLeft = 0
          window.scrollTo(0, window.scrollY)
        })
      }
      await captureSection({ page, locator: target, filename: capture.file })
      await assertIsolation(page, runtime, { modalOpen: !isBanner(capture) })
    })
  }

  test('Back preserves populated values and normalizes an empty row/value @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const runtime = await setup(page, { id: 'custom-order-back-private' })
    let step2 = await makeStep2Ready(page)
    await step2.locator("[data-doc-control='custom-order-paymethod-card-delivery']").click()
    await step2.locator("[data-doc-control='custom-order-instructions']").fill('Synthetic handling note')
    await step2.locator("[data-doc-control='custom-order-declared-value']").fill('45')
    await step2.locator("[data-doc-control='custom-order-back']").click()
    await page.locator("[data-doc-control='custom-order-continue']").click()
    step2 = page.locator("[data-doc-section='custom-order-step2']")
    await expect(step2.locator("[data-doc-control='custom-order-item-name']")).toHaveValue('Synthetic boxed item')
    await expect(step2.locator('.qty-value')).toHaveText('2')
    await expect(step2.locator("[data-doc-control='custom-order-instructions']")).toHaveValue('Synthetic handling note')
    await expect(step2.locator("[data-doc-control='custom-order-declared-value']")).toHaveValue('45')
    await step2.locator("[data-doc-control='custom-order-quantity-decrease']").click()
    await step2.locator("[data-doc-control='custom-order-quantity-decrease']").click()
    await step2.locator("[data-doc-control='custom-order-declared-value']").fill('')
    await step2.locator("[data-doc-control='custom-order-back']").click()
    await page.locator("[data-doc-control='custom-order-continue']").click()
    step2 = page.locator("[data-doc-section='custom-order-step2']")
    await expect(step2.locator("[data-doc-control='custom-order-item-name']")).toHaveCount(1)
    await expect(step2.locator("[data-doc-control='custom-order-item-name']")).toHaveValue('')
    await expect(step2.locator('.qty-value')).toHaveText('1')
    await expect(step2.locator("[data-doc-control='custom-order-declared-value']")).toHaveValue('30')
    await assertIsolation(page, runtime, { modalOpen: true })
  })

  test('controlled address error is the sole intercepted write @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const runtime = await setup(page, { id: 'custom-order-address-error-private' }, { addressError: true })
    await makeStep1Ready(page)
    await selectPlace(page, 'custom-order-delivery-address')
    await page.locator("[data-doc-control='custom-order-continue']").click()
    await expect(page.locator("[data-doc-section='custom-order-step2']")).toBeVisible()
    expect(runtime.addressWrites).toEqual([{ method: 'POST', pathname: addressPath, hasAuthorization: true, hasApp: true, hasInternal: true, hasCountry: true, hasSocket: false, bodyMatches: true }])
    await assertIsolation(page, runtime, { modalOpen: true, addressPosts: 1 })
  })

  test('controlled Place error sends one exact request and keeps the modal @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const runtime = await setup(page, { id: 'custom-order-place-error-private' }, { placeError: true })
    const step2 = await makeStep2Ready(page)
    await step2.locator("[data-doc-control='custom-order-place']").click()
    await expect(step2.getByText('Synthetic custom order was not placed.')).toBeVisible()
    await expect(step2.locator("[data-doc-control='custom-order-place']")).toBeEnabled()
    const posts = runtime.external.filter(item => item.method === 'POST')
    expect(posts).toEqual([{ method: 'POST', origin: pluginOrigin, pathname: placePath, queryKeys: [], hasAuthorization: true, hasNgrok: true, hasJson: true, bodyMatches: true }])
    await assertIsolation(page, runtime, { modalOpen: true, placePosts: 1 })
  })
})
