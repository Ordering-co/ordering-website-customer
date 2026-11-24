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

const manifest = await loadManifest('addresses.manifest')
const userGetPattern = '^/v400/en/docsmarket/users/9301(?:\\?.*)?$'
const addressesGetPattern = '^/v400/en/docsmarket/users/9301/addresses$'
const homePattern = '^/v400/en/docsmarket/users/9301/addresses/9401$'
const officePattern = '^/v400/en/docsmarket/users/9301/addresses/9402$'
const orderOptionsPutPattern = '^/v400/en/docsmarket/order_options$'

// The actions of an address: out of the radiogroup, on the item's row
// (data-doc-control='address-item-actions'); the item itself is matched too
const rowActions = isDefault => `:is([data-doc-control='address-item'], [data-doc-control='address-item-actions'])[data-doc-default='${isDefault}']`

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)
const addressesRoute = fixture => routeFor(fixture, 'GET', addressesGetPattern)

const addressById = (fixture, id) => clone(addressesRoute(fixture).response.result.find(address => address.id === id))

const fixtureFor = async ({ empty = false, mutation = null } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const home = addressById(fixture, 9401)
  const office = addressById(fixture, 9402)
  if (empty) addressesRoute(fixture).response.result = []
  if (mutation === 'select-office') {
    const route = routeFor(fixture, 'PUT', officePattern)
    route.assert = { count: 1 }
    route.response = { error: false, result: { ...office, default: true } }
    const options = routeFor(fixture, 'PUT', orderOptionsPutPattern)
    options.assert = { count: 1 }
    options.response = { error: false, result: { user_id: 9301, type: 1, address_id: 9402, address: { ...office, default: true }, carts: [] } }
  }
  if (mutation === 'edit-home' || mutation === 'edit-office') {
    const isHome = mutation === 'edit-home'
    const pattern = isHome ? homePattern : officePattern
    const selected = isHome ? home : office
    const route = routeFor(fixture, 'PUT', pattern)
    route.assert = { count: 1 }
    route.response = { error: false, result: { ...selected, address_notes: 'Synthetic updated note', default: true } }
    routeFor(fixture, 'GET', userGetPattern).assert = { count: 2 }
    const options = routeFor(fixture, 'PUT', orderOptionsPutPattern)
    options.assert = { count: isHome ? 1 : 0 }
    options.response = { error: false, result: { user_id: 9301, type: 1, address_id: 9401, address: { ...home, address_notes: 'Synthetic updated note' }, carts: [] } }
  }
  if (mutation === 'delete-office') routeFor(fixture, 'DELETE', officePattern).assert = { count: 1 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_ADDRESSES_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      geolocationAttempts: [],
      storageWrites: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = value => {
      window.__DOC_ADDRESSES_GUARD__.windowOpenAttempts.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_ADDRESSES_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_ADDRESSES_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_ADDRESSES_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_ADDRESSES_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const blockedGeolocation = method => (...args) => {
      window.__DOC_ADDRESSES_GUARD__.geolocationAttempts.push({ method, argumentCount: args.length })
      if (method === 'watchPosition') return 0
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = blockedGeolocation('getCurrentPosition')
      navigator.geolocation.watchPosition = blockedGeolocation('watchPosition')
      navigator.geolocation.clearWatch = blockedGeolocation('clearWatch')
    }
    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      const storage = this === window.localStorage ? 'local' : 'session'
      const event = { storage, key: String(key) }
      if (storage === 'local' && key === 'country-code') event.isSyntheticCountry = value === 'US'
      if (storage === 'local' && key === 'token') event.isReservedToken = typeof value === 'string' && value.startsWith('docs-fixture-')
      if (storage === 'local' && key === 'user') {
        try {
          const user = JSON.parse(value)
          event.userShape = {
            id: user?.id,
            syntheticName: typeof user?.name === 'string' && user.name.startsWith('Synthetic'),
            syntheticEmail: user?.email === 'docs@e.invalid',
            tokenConsistent: user?.session?.access_token === window.localStorage.getItem('token')
          }
        } catch {
          event.userShape = { parseable: false }
        }
      }
      window.__DOC_ADDRESSES_GUARD__.storageWrites.push(event)
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_ADDRESSES_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
      return Reflect.apply(nativeClear, this, [])
    }
  })
}

const storageShape = page => page.evaluate(() => {
  const user = JSON.parse(window.localStorage.getItem('user') || 'null')
  const token = window.localStorage.getItem('token')
  return {
    localKeys: Object.keys(window.localStorage).sort(),
    sessionKeys: Object.keys(window.sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(Boolean).sort(),
    countryCode: window.localStorage.getItem('country-code'),
    tokenReserved: typeof token === 'string' && token.startsWith('docs-fixture-'),
    userSafe: user?.id === 9301 && user?.email === 'docs@e.invalid' && user?.session?.access_token === token
  }
})

const actForCapture = async (page, capture) => {
  const list = page.locator("[data-doc-section='address-list']")
  if (capture.id.includes('addresses-add')) {
    await list.locator("[data-doc-control='address-add']").click()
    const form = page.locator("[data-doc-section='address-form']")
    await expect(form).toHaveAttribute('data-doc-mode', 'add')
    await expect(form).toHaveAttribute('data-doc-state', 'ready')
    await expect(form.locator("[data-doc-control='address-search'] input")).toHaveValue('')
    const save = form.locator("[data-doc-control='address-save']")
    await expect(save).toBeVisible()
    await expect(save).toBeDisabled()
  }
  if (capture.id === 'addresses-edit-desktop') {
    await list.locator(`${rowActions('false')} [data-doc-control='address-edit']`).click()
    const form = page.locator("[data-doc-section='address-form']")
    await expect(form).toHaveAttribute('data-doc-mode', 'edit')
    await expect(form.locator("[data-doc-control='address-search'] input")).toHaveValue('200 Synthetic Office Avenue')
  }
  if (capture.id === 'addresses-delete-confirm-desktop') {
    await list.locator(`${rowActions('false')} [data-doc-control='address-delete']`).click()
    await expect(page.locator("[data-doc-section='address-delete-confirmation']")).toContainText('Are you sure')
  }
}

const setup = async (page, capture, options = {}) => {
  const fixture = await fixtureFor({ ...options, empty: capture?.id === 'addresses-empty-desktop' })
  const requestLog = createRequestLog()
  const browserEvents = { pageErrors: [], failedRequests: [], attachedFrames: [], extraPages: [], orderOptionCountries: [] }
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
    if (request.method() === 'PUT' && target.pathname === '/v400/en/docsmarket/order_options') {
      browserEvents.orderOptionCountries.push(request.headers()['x-country-code-x'] ?? null)
    }
  })
  if (capture?.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const list = page.locator("[data-doc-section='address-list']")
  await expect(list).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/profile/addresses`)
  await expect(list).toHaveAttribute('data-doc-state', capture?.id === 'addresses-empty-desktop' ? 'empty' : 'ready')
  if (capture?.id !== 'addresses-empty-desktop') {
    await expect(list.locator("[data-doc-control='address-item']")).toHaveCount(2)
    await expect(list).toContainText('100 Synthetic Market Street')
    await expect(list).toContainText('200 Synthetic Office Avenue')
  }
  if (capture) await actForCapture(page, capture)
  const selector = capture?.selector || "[data-doc-section='address-list']"
  await waitForDocumentationReady(page, manifest.readiness, selector, {
    imageScope: capture?.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['country-code', 'local_phone_code', 'token', 'user'])
  expect(baseline.countryCode).toBe('US')
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.userSafe).toBe(true)
  return { fixture, requestLog, browserEvents, baseline, list }
}

const assertIsolation = async (page, runtime, { allowedWrites = [], countryWrites = 1, orderOptionCountries = [] } = {}) => {
  const { fixture, requestLog, browserEvents, baseline } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET').map(({ method, pattern }) => ({ method, pattern }))).toEqual(allowedWrites)
  expect(requestLog.matched.filter(request => request.method === 'GET' && request.pattern === addressesGetPattern)).toHaveLength(1)

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
  expect(browserEvents.orderOptionCountries).toEqual(orderOptionCountries)
  expect(browserEvents.failedRequests.filter(({ origin }) => ![
    'https://fonts.gstatic.com',
    'https://cdn.onesignal.com',
    'https://www.google-analytics.com'
  ].includes(origin))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_ADDRESSES_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.geolocationAttempts).toEqual([])
  expect(guard.storageClears).toEqual(['local', 'session'])
  const countryEvents = guard.storageWrites.filter(event => event.storage === 'local' && event.key === 'country-code')
  expect(countryEvents).toHaveLength(countryWrites)
  expect(countryEvents.every(event => event.isSyntheticCountry)).toBe(true)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  const after = await storageShape(page)
  expect(after).toEqual(baseline)
}

test.describe('Saved addresses documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }

  test('selecting the synthetic Office address persists default and order context exactly once @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private selection assertion runs on desktop only.')
    const runtime = await setup(page, manifest.captures[0], { mutation: 'select-office' })
    await runtime.list.locator("[data-doc-control='address-item'][data-doc-default='false']").click()
    await expect.poll(() => runtime.requestLog.matched.filter(request => request.method === 'PUT').length).toBe(2)
    const writes = runtime.requestLog.matched.filter(request => request.method === 'PUT')
    expect(writes.map(({ pattern, body }) => ({ pattern, body }))).toEqual([
      { pattern: officePattern, body: { default: true } },
      { pattern: orderOptionsPutPattern, body: { address_id: 9402, type: 1, user_id: 9301 } }
    ])
    await assertIsolation(page, runtime, {
      allowedWrites: [{ method: 'PUT', pattern: officePattern }, { method: 'PUT', pattern: orderOptionsPutPattern }],
      countryWrites: 2,
      orderOptionCountries: ['US']
    })
  })

  for (const mutation of ['edit-home', 'edit-office']) {
    test(`${mutation} saves one synthetic note and preserves the current-address boundary @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Private edit assertion runs on desktop only.')
      const runtime = await setup(page, manifest.captures[0], { mutation })
      const selector = mutation === 'edit-home'
        ? `${rowActions('true')} [data-doc-control='address-edit']`
        : `${rowActions('false')} [data-doc-control='address-edit']`
      await runtime.list.locator(selector).click()
      const form = page.locator("[data-doc-section='address-form']")
      await expect(form).toHaveAttribute('data-doc-mode', 'edit')
      await form.locator('textarea').fill('Synthetic updated note')
      await form.locator("[data-doc-control='address-save']").click()
      const pattern = mutation === 'edit-home' ? homePattern : officePattern
      await expect.poll(() => runtime.requestLog.matched.filter(request => request.method === 'PUT' && request.pattern === pattern).length).toBe(1)
      const addressWrite = runtime.requestLog.matched.find(request => request.method === 'PUT' && request.pattern === pattern)
      expect(addressWrite.body).toEqual({ address_notes: 'Synthetic updated note', default: true })
      const allowedWrites = [{ method: 'PUT', pattern }]
      let countryWrites = 1
      let orderOptionCountries = []
      if (mutation === 'edit-home') {
        await expect.poll(() => runtime.requestLog.matched.filter(request => request.method === 'PUT' && request.pattern === orderOptionsPutPattern).length).toBe(1)
        const orderWrite = runtime.requestLog.matched.find(request => request.method === 'PUT' && request.pattern === orderOptionsPutPattern)
        expect(orderWrite.body).toEqual({ address_id: 9401, type: 1, user_id: 9301 })
        allowedWrites.push({ method: 'PUT', pattern: orderOptionsPutPattern })
        countryWrites = 2
        orderOptionCountries = ['US']
      }
      await assertIsolation(page, runtime, { allowedWrites, countryWrites, orderOptionCountries })
    })
  }

  test('delete confirmation removes only the returned synthetic Office address @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private delete assertion runs on desktop only.')
    const runtime = await setup(page, manifest.captures[0], { mutation: 'delete-office' })
    await runtime.list.locator(`${rowActions('false')} [data-doc-control='address-delete']`).click()
    const confirmation = page.locator("[data-doc-section='address-delete-confirmation']")
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Accept' }).click()
    await expect(runtime.list.locator("[data-doc-control='address-item']")).toHaveCount(1)
    const remove = runtime.requestLog.matched.filter(request => request.method === 'DELETE' && request.pattern === officePattern)
    expect(remove).toHaveLength(1)
    expect(remove[0].body).toBeNull()
    await assertIsolation(page, runtime, { allowedWrites: [{ method: 'DELETE', pattern: officePattern }] })
  })

  test.skip('adding an address remains source-audited until provider query values can be structurally redacted from traces', async () => {})
})
