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

test.use({ trace: 'off' })

const manifest = await loadManifest('integration-login.manifest')
const reservedHandoff = 'DOCS-NOT-A-REAL-INTEGRATION-CREDENTIAL'
const reservedSession = 'docs-fixture-integration-session-token'
const sensitivePath = '/v400/en/docsmarket/auth/spoonity'
const sensitiveUrl = `https://api.docs.invalid${sensitivePath}`
const genericSensitivePattern = '^/v400/en/docsmarket/auth/spoonity$'

const clone = value => JSON.parse(JSON.stringify(value))
const successfulUser = {
  id: 9301,
  name: 'Synthetic Integration Customer',
  lastname: 'Fixture Customer',
  email: 'docs-integration@example.invalid',
  cellphone: '2025550199',
  country_phone_code: '1',
  birthdate: '2000-01-01',
  session_strategy: 'jwt_session',
  enabled: true,
  email_verified: true,
  phone_verified: true,
  session: { access_token: reservedSession }
}

const fixtureFor = async ({ authenticated = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  if (authenticated) fixture.authSession = { token: reservedSession, user: successfulUser }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(({ expectedSession }) => {
  const safeTarget = value => {
    const target = new URL(String(value || window.location.href), window.location.href)
    return { origin: target.origin, pathname: target.pathname, queryKeys: [...target.searchParams.keys()].sort() }
  }
  window.__DOC_INTEGRATION_GUARD__ = {
    storage: [], navigation: [], windows: [], forms: [], requestSubmits: [], messages: [], geo: [], clipboard: []
  }
  const guard = window.__DOC_INTEGRATION_GUARD__
  const nativeSetItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    let userShape = false
    if (key === 'user') {
      try {
        const parsed = JSON.parse(value)
        userShape = parsed?.id === 9301 && parsed?.session?.access_token === expectedSession
      } catch {}
    }
    guard.storage.push({ storage: this === window.localStorage ? 'local' : 'session', key, reservedSession: key === 'token' && value === expectedSession, userShape })
    return nativeSetItem.call(this, key, value)
  }
  const nativeRemoveItem = Storage.prototype.removeItem
  Storage.prototype.removeItem = function (key) {
    guard.storage.push({ storage: this === window.localStorage ? 'local' : 'session', key, removed: true })
    return nativeRemoveItem.call(this, key)
  }
  const nativePushState = history.pushState.bind(history)
  history.pushState = function (state, title, value) {
    guard.navigation.push({ method: 'push', ...safeTarget(value) })
    return nativePushState(state, title, value)
  }
  const nativeReplaceState = history.replaceState.bind(history)
  history.replaceState = function (state, title, value) {
    guard.navigation.push({ method: 'replace', ...safeTarget(value) })
    return nativeReplaceState(state, title, value)
  }
  window.open = value => { guard.windows.push(safeTarget(value)); return null }
  window.HTMLFormElement.prototype.submit = function () { guard.forms.push(safeTarget(this.action)) }
  window.HTMLFormElement.prototype.requestSubmit = function () { guard.requestSubmits.push(safeTarget(this.action)) }
  window.postMessage = function (_message, targetOrigin) { guard.messages.push({ targetOrigin: String(targetOrigin || '') }) }
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: () => guard.geo.push({ kind: 'get' }),
      watchPosition: () => { guard.geo.push({ kind: 'watch' }); return 1 },
      clearWatch: () => {}
    }
  })
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async () => { guard.clipboard.push({ kind: 'writeText' }) },
      readText: async () => { guard.clipboard.push({ kind: 'readText' }); return '' }
    }
  })
}, { expectedSession: reservedSession })

const installSensitiveHandler = async (page, behavior) => {
  const metadata = []
  let releaseHeld
  await page.route(sensitiveUrl, async route => {
    const request = route.request()
    let parsed = null
    try { parsed = JSON.parse(request.postData() || 'null') } catch {}
    const headers = request.headers()
    metadata.push({
      method: request.method(),
      pathname: new URL(request.url()).pathname,
      bodyKeys: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).sort() : [],
      reservedMatch: parsed?.spoonity_token === reservedHandoff,
      hasContentType: headers['content-type'] === 'application/json',
      hasAuthorization: Object.hasOwn(headers, 'authorization'),
      hasApp: Object.hasOwn(headers, 'x-app-x'),
      hasInternal: Object.hasOwn(headers, 'x-internal-product-x'),
      hasCountry: Object.hasOwn(headers, 'x-country-code-x'),
      hasSocket: Object.hasOwn(headers, 'x-socket-id-x')
    })
    if (behavior === 'pending') {
      await new Promise(resolve => {
        releaseHeld = async () => {
          await route.abort('aborted')
          resolve()
        }
      })
      return
    }
    if (behavior === 'failure') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: true, result: ['Synthetic handoff could not continue.'] }) })
      return
    }
    if (behavior === 'malformed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{synthetic-invalid-json' })
      return
    }
    if (behavior === 'rejected') {
      await route.abort('failed')
      return
    }
    if (behavior === 'success') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: false, result: successfulUser }) })
      return
    }
    await route.fulfill({ status: 418, contentType: 'application/json', body: JSON.stringify({ error: true, result: [] }) })
  })
  return {
    metadata,
    release: async () => {
      if (releaseHeld) await releaseHeld()
    }
  }
}

const safeLocation = page => page.evaluate(() => ({
  origin: window.location.origin,
  pathname: window.location.pathname,
  queryKeys: [...new URLSearchParams(window.location.search).keys()].sort(),
  hash: window.location.hash,
  historyLength: window.history.length
}))

const storageShape = page => page.evaluate(({ expectedSession }) => {
  let user = null
  try { user = JSON.parse(localStorage.getItem('user') || 'null') } catch {}
  return {
    localKeys: Object.keys(localStorage).sort(),
    sessionKeys: Object.keys(sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(Boolean).sort(),
    tokenReserved: localStorage.getItem('token') === expectedSession,
    userId: user?.id ?? null,
    userTokenConsistent: user?.session?.access_token === expectedSession
  }
}, { expectedSession: reservedSession })

const handoffQuery = (code = 'spoonity', includeToken = true, token = reservedHandoff) => {
  const query = new URLSearchParams({ integration_code: code })
  if (includeToken) query.set('integration_token', token)
  return query.toString()
}

const expectedSensitiveMetadata = [{
  method: 'POST',
  pathname: sensitivePath,
  bodyKeys: ['spoonity_token'],
  reservedMatch: true,
  hasContentType: true,
  hasAuthorization: false,
  hasApp: false,
  hasInternal: false,
  hasCountry: false,
  hasSocket: false
}]

const setup = async (page, {
  path = '/',
  code = 'spoonity',
  includeToken = true,
  token = reservedHandoff,
  behavior = 'pending',
  authenticated = false,
  mobile = false
} = {}) => {
  const fixture = await fixtureFor({ authenticated })
  const requestLog = createRequestLog()
  const browser = { errors: [], frames: [], pages: [], downloads: [], failures: [], providerResponses: [], conversionAuthorization: [] }
  if (mobile) await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated })
  await installNetworkGuard(page, fixture, requestLog)
  const sensitive = await installSensitiveHandler(page, behavior)
  page.on('pageerror', error => browser.errors.push(error.name))
  page.on('frameattached', frame => browser.frames.push(frame === page.mainFrame() ? 'main' : 'child'))
  page.context().on('page', opened => { if (opened !== page) browser.pages.push(true) })
  page.on('download', () => browser.downloads.push(true))
  page.on('request', request => {
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.origin === 'https://google-redirect.plugins.orderingplus.com' && url.pathname === '/docsmarket/api/frontend/settings' && url.search === '') {
      browser.conversionAuthorization.push(Object.hasOwn(request.headers(), 'authorization'))
    }
  })
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    browser.failures.push({ origin: url.origin, pathname: url.pathname })
  })
  page.on('response', response => {
    const url = new URL(response.url())
    if (/spoonity|segment|facebook|google-analytics|googletagmanager|sentry|forter|intercom/i.test(url.hostname)) {
      browser.providerResponses.push({ origin: url.origin, pathname: url.pathname })
    }
  })
  const query = handoffQuery(code, includeToken, token)
  await page.goto(`${path}?${query}`, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  return { fixture, requestLog, browser, sensitive }
}

const assertGenericIsolation = async (page, runtime, { sensitiveFailureCount = 0, geoCount = 0, conversionAuthorization = [] } = {}) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  expect(runtime.requestLog.matched.filter(request => request.pattern === genericSensitivePattern)).toEqual([])
  expect(runtime.requestLog.matched.filter(request => request.method !== 'GET')).toEqual([])
  expect(runtime.browser.errors).toEqual([])
  expect(runtime.browser.frames).toEqual([])
  expect(runtime.browser.pages).toEqual([])
  expect(runtime.browser.downloads).toEqual([])
  expect(runtime.browser.providerResponses).toEqual([])
  expect(runtime.browser.conversionAuthorization).toEqual(conversionAuthorization)
  const nonStaticFailures = runtime.browser.failures.filter(item => item.origin !== 'https://cdn.onesignal.com')
  expect(nonStaticFailures).toEqual(Array.from({ length: sensitiveFailureCount }, () => ({
    origin: 'https://api.docs.invalid',
    pathname: sensitivePath
  })))
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  const guard = await page.evaluate(() => window.__DOC_INTEGRATION_GUARD__)
  expect(guard.windows).toEqual([])
  expect(guard.forms).toEqual([])
  expect(guard.requestSubmits).toEqual([])
  expect(guard.messages).toEqual([])
  expect(guard.geo).toEqual(Array.from({ length: geoCount }, () => ({ kind: 'get' })))
  expect(guard.clipboard).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  return guard
}

test.describe('Supported integration login documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      const runtime = await setup(page, { behavior: 'pending', mobile: capture.project === 'mobile-chromium' })
      const handoff = page.locator(capture.selector)
      await expect(handoff).toHaveAttribute('data-doc-state', 'loading', { timeout: 30_000 })
      await expect(handoff).toHaveText('Loading')
      await expect.poll(() => runtime.sensitive.metadata.length).toBe(1)
      expect(runtime.sensitive.metadata).toEqual(expectedSensitiveMetadata)
      const location = await safeLocation(page)
      expect(location).toMatchObject({ origin: APP_ORIGIN, pathname: '/', queryKeys: ['integration_code', 'integration_token'], hash: '' })
      const baseline = await storageShape(page)
      expect(baseline.tokenReserved).toBe(false)
      expect(baseline.userId).toBeNull()
      const historyLength = location.historyLength
      await page.evaluate(() => { window.__DOC_INTEGRATION_GUARD__.storage = []; window.__DOC_INTEGRATION_GUARD__.navigation = [] })
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, { imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section' })
      await captureSection({ page, locator: handoff, filename: capture.file, captureMode: capture.capture_mode })
      const guard = await assertGenericIsolation(page, runtime)
      const publicCount = pattern => runtime.requestLog.matched.filter(request => request.pattern === pattern).length
      expect(publicCount('^/v400/en/docsmarket/languages(?:\\?.*)?$')).toBe(1)
      expect(publicCount('^/v400/en/docsmarket/pages(?:\\?.*)?$')).toBe(1)
      for (const pattern of [
        '^/docsmarket/api/frontend/settings(?:\\?.*)?$',
        '^/v400/en/docsmarket/users/9301(?:\\?.*)?$',
        '^/v400/en/docsmarket/paymethods(?:\\?.*)?$',
        '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$',
        '^/v400/en/docsmarket/order_options(?:\\?.*)?$',
        '^/v400/en/docsmarket/users/9301/addresses(?:\\?.*)?$',
        '^/v400/en/docsmarket/businesses(?:\\?.*)?$',
        '^/v400/en/docsmarket/business_types(?:\\?.*)?$'
      ]) expect(publicCount(pattern)).toBe(0)
      expect(runtime.requestLog.matched.filter(request => request.url.startsWith('/v400/en/docsmarket/orders')).length).toBe(0)
      expect(runtime.requestLog.syntheticAssets).toEqual([])
      expect(runtime.browser.failures).toEqual([{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }])
      expect(await assertWebSocketIsolation(page)).toEqual([
        { origin: APP_WS_ORIGIN, pathname: '/', protocolCount: 1, queryKeys: ['token'], hasToken: true },
        { origin: 'wss://sockets-v3.orderingplus.com', pathname: '/socket.io/', protocolCount: 0, queryKeys: ['EIO', 'project', 'transport'], hasToken: false }
      ])
      expect(guard.storage).toEqual([])
      expect(guard.navigation).toEqual([])
      expect(await storageShape(page)).toEqual(baseline)
      expect((await safeLocation(page)).historyLength).toBe(historyLength)
      await runtime.sensitive.release()
    })
  }

  for (const behavior of ['failure', 'malformed', 'rejected']) {
    test(`integration-login-${behavior}-private @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium')
      const runtime = await setup(page, { behavior })
      const handoff = page.locator("[data-doc-section='integration-login']")
      await expect(handoff).toHaveAttribute('data-doc-state', 'fallback', { timeout: 30_000 })
      await expect(page.locator("[data-doc-section='authentication-login']")).toHaveCount(1)
      await expect(page.locator("[data-doc-section='authentication-login']")).toBeVisible()
      await expect(handoff).not.toContainText('Synthetic handoff could not continue.')
      expect(runtime.sensitive.metadata).toEqual(expectedSensitiveMetadata)
      const location = await safeLocation(page)
      expect(location).toMatchObject({ pathname: '/', queryKeys: ['integration_code', 'integration_token'] })
      const storage = await storageShape(page)
      expect(storage.tokenReserved).toBe(false)
      expect(storage.userId).toBeNull()
      const guard = await assertGenericIsolation(page, runtime, { sensitiveFailureCount: behavior === 'rejected' ? 1 : 0 })
      expect(guard.navigation).toEqual([])
      expect(guard.storage.filter(item => ['token', 'user'].includes(item.key))).toEqual([])
    })
  }

  for (const variant of [
    {
      id: 'root',
      path: '/',
      expectedPath: '/',
      queryRetained: false,
      geoCount: 0,
      navigation: [
        { method: 'push', origin: APP_ORIGIN, pathname: '/search', queryKeys: [] },
        { method: 'replace', origin: APP_ORIGIN, pathname: '/', queryKeys: [] }
      ]
    },
    {
      id: 'business',
      path: '/synthetic-integration-store',
      expectedPath: '/store/synthetic-integration-store',
      queryRetained: false,
      geoCount: 0,
      navigation: [{ method: 'push', origin: APP_ORIGIN, pathname: '/store/synthetic-integration-store', queryKeys: [] }]
    },
    { id: 'profile-orders', path: '/profile/orders', expectedPath: '/profile/orders', queryRetained: true, geoCount: 0, navigation: [] }
  ]) {
    test(`integration-login-success-${variant.id}-private @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium')
      const runtime = await setup(page, { path: variant.path, behavior: 'success' })
      await expect.poll(async () => (await storageShape(page)).tokenReserved).toBe(true)
      await expect.poll(async () => (await safeLocation(page)).pathname).toBe(variant.expectedPath)
      await expect(page.locator("[data-doc-section='integration-login']")).toHaveCount(0)
      expect(runtime.sensitive.metadata).toEqual(expectedSensitiveMetadata)
      const storage = await storageShape(page)
      expect(storage).toMatchObject({ tokenReserved: true, userId: 9301, userTokenConsistent: true })
      const location = await safeLocation(page)
      expect(location.queryKeys).toEqual(variant.queryRetained ? ['integration_code', 'integration_token'] : [])
      const guard = await assertGenericIsolation(page, runtime, { geoCount: variant.geoCount, conversionAuthorization: [] })
      const credentialWrites = guard.storage.filter(item => item.storage === 'local' && ['token', 'user'].includes(item.key))
      expect(credentialWrites).toEqual([
        { storage: 'local', key: 'token', reservedSession: true, userShape: false },
        { storage: 'local', key: 'user', reservedSession: false, userShape: true }
      ])
      expect(guard.navigation).toEqual(variant.navigation)
      if (variant.navigation.length > 0) {
        expect(location.historyLength).toBeGreaterThan(1)
      }
      if (variant.id === 'profile-orders') {
        const count = pattern => runtime.requestLog.matched.filter(request => request.pattern === pattern).length
        expect(count('^/v400/en/docsmarket/users/9301(?:\\?.*)?$')).toBe(1)
        expect(count('^/docsmarket/api/frontend/settings(?:\\?.*)?$')).toBe(0)
        expect(count('^/v400/en/docsmarket/paymethods(?:\\?.*)?$')).toBe(1)
        expect(count('^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$')).toBe(1)
        expect(count('^/v400/en/docsmarket/order_options(?:\\?.*)?$')).toBe(1)
        expect(count('^/v400/en/docsmarket/users/9301/addresses(?:\\?.*)?$')).toBe(0)
        expect(count('^/v400/en/docsmarket/businesses(?:\\?.*)?$')).toBe(0)
        expect(count('^/v400/en/docsmarket/business_types(?:\\?.*)?$')).toBe(0)
        expect(runtime.requestLog.matched.filter(request => request.url.startsWith('/v400/en/docsmarket/orders')).length).toBe(3)
        expect(runtime.requestLog.matched.filter(request => request.url.startsWith('/docsmarket/api/frontend/') && request.url !== '/docsmarket/api/frontend/settings').length).toBe(0)
      }
    })
  }

  test('integration-login-wrong-and-missing-private @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const wrong = await setup(page, { code: 'Spoonity', behavior: 'none' })
    await expect.poll(() => wrong.sensitive.metadata.length).toBe(0)
    expect((await safeLocation(page)).queryKeys).toEqual(['integration_code', 'integration_token'])
    expect((await storageShape(page)).tokenReserved).toBe(false)
    await assertGenericIsolation(page, wrong)
    await page.goto(`/?${handoffQuery('spoonity', false)}`, { waitUntil: 'domcontentloaded' })
    await expect.poll(() => wrong.sensitive.metadata.length).toBe(0)
    expect((await safeLocation(page)).queryKeys).toEqual(['integration_code'])
    expect((await storageShape(page)).tokenReserved).toBe(false)
  })

  test('integration-login-existing-auth-private @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const runtime = await setup(page, { behavior: 'none', authenticated: true })
    await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
    await page.waitForTimeout(1_000)
    await expect.poll(async () => (await safeLocation(page)).pathname).toBe('/')
    await expect(page.locator("[data-doc-section='integration-login']")).toHaveCount(0)
    expect(runtime.sensitive.metadata).toEqual([])
    const storage = await storageShape(page)
    expect(storage).toMatchObject({ tokenReserved: true, userId: 9301, userTokenConsistent: true })
    const location = await safeLocation(page)
    expect(location).toMatchObject({ pathname: '/', queryKeys: [], hash: '', historyLength: 3 })
    const guard = await assertGenericIsolation(page, runtime, { geoCount: 0, conversionAuthorization: [] })
    expect(guard.storage.filter(item => item.storage === 'local' && ['token', 'user'].includes(item.key))).toEqual([
      { storage: 'local', key: 'token', reservedSession: true, userShape: false },
      { storage: 'local', key: 'user', reservedSession: false, userShape: true }
    ])
    expect(guard.navigation).toEqual([
      { method: 'push', origin: APP_ORIGIN, pathname: '/search', queryKeys: [] },
      { method: 'replace', origin: APP_ORIGIN, pathname: '/', queryKeys: [] }
    ])
  })
})
