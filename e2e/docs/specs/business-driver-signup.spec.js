import { expect, test } from '@playwright/test'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import fs from 'node:fs/promises'
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

const manifest = await loadManifest('business-driver-signup.manifest')
const businessLocalizedPattern = '^/v400/en/docsmarket/pages/signup_business_en(?:\\?.*)?$'
const businessBasePattern = '^/v400/en/docsmarket/pages/signup_business(?:\\?.*)?$'
const driverLocalizedPattern = '^/v400/en/docsmarket/pages/signup-driver-en(?:\\?.*)?$'
const driverBasePattern = '^/v400/en/docsmarket/pages/signup-driver(?:\\?.*)?$'
const usersPattern = '^/v400/en/docsmarket/users$'
const forbiddenStorageKeys = ['token', 'user', 'user-customer', 'device_code', 'project_name', 'front_version']
const matching = (log, method, pattern) => log.matched.filter(item => item.method === method && item.pattern === pattern)
const syntheticStoreSlug = 'synthetic-application-store'
const addBoundedBusinessRoute = fixture => {
  fixture.routes.push({
    method: 'GET',
    pattern: `^/v400/en/docsmarket/business/${syntheticStoreSlug}(?:\\?.*)?$`,
    assert: { minCount: 0, maxCount: 2 },
    response: { error: true, result: ['Synthetic business route is intentionally bounded.'] }
  })
}

const installBrowserGuards = page => page.addInitScript(() => {
  const safe = value => {
    const url = new URL(String(value || location.href), location.href)
    return { origin: url.origin, pathname: url.pathname, queryKeys: [...new Set([...url.searchParams.keys()])].sort() }
  }
  window.__DOC_APPLICATION_GUARD__ = {
    navigation: [], open: [], storage: [], forms: [], inputs: [], messages: [], frames: [], geo: [], unload: []
  }
  window.open = value => { window.__DOC_APPLICATION_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => {
      window.__DOC_APPLICATION_GUARD__.navigation.push({ method, ...safe(args[2]) })
      return original(...args)
    }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) {
      window.__DOC_APPLICATION_GUARD__.storage.push({
        method,
        storage: this === localStorage ? 'local' : 'session',
        key: args[0] == null ? null : String(args[0])
      })
      return Reflect.apply(original, this, args)
    }
  }
  for (const method of ['submit', 'requestSubmit']) {
    HTMLFormElement.prototype[method] = function (...args) {
      window.__DOC_APPLICATION_GUARD__.forms.push({ method, ...safe(this.action) })
      return undefined
    }
  }
  document.addEventListener('submit', event => {
    window.__DOC_APPLICATION_GUARD__.forms.push({ method: 'event', ...safe(event.target?.action) })
  }, true)
  for (const eventName of ['input', 'change']) {
    document.addEventListener(eventName, event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        window.__DOC_APPLICATION_GUARD__.inputs.push({ event: eventName, name: String(event.target.name || '') })
      }
    }, true)
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) {
    window.__DOC_APPLICATION_GUARD__.messages.push(String(args[1] ?? ''))
    return Reflect.apply(nativePost, window, args)
  }
  const nativeSet = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if ((this instanceof HTMLIFrameElement || this instanceof HTMLFrameElement) && name.toLowerCase() === 'src') {
      window.__DOC_APPLICATION_GUARD__.frames.push(safe(value))
    }
    return Reflect.apply(nativeSet, this, [name, value])
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => {
      window.__DOC_APPLICATION_GUARD__.geo.push(true)
      error?.({ code: 1 })
    }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
  for (const eventName of ['beforeunload', 'pagehide']) {
    window.addEventListener(eventName, () => window.__DOC_APPLICATION_GUARD__.unload.push(eventName))
  }
})

const storageSnapshot = page => page.evaluate(() => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
  cookies: document.cookie.split(';').map(value => value.trim()).filter(Boolean).sort()
}))

const setup = async (page, capture, { authenticated = false, configureFixture, expectedPath, waitForNative = true } = {}) => {
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  const fixture = await loadFixture(manifest.fixture)
  configureFixture?.(fixture)
  const requestLog = createRequestLog()
  const conversionHeaders = []
  const browserEvents = { popups: 0, frames: 0, extraPages: 0, pageErrors: [], failed: [] }
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated })
  await installNetworkGuard(page, fixture, requestLog)
  const background = capture.id.includes('business') ? 'application-business-background.svg' : 'application-driver-background.svg'
  const sourceAsset = capture.id.includes('business') ? 'business-signup-background.jpg' : 'driver-signup-background.jpg'
  const backgroundBody = await fs.readFile(resolveProductPath('e2e', 'docs', 'assets', background), 'utf8')
  await page.route(`**/src/assets/images/${sourceAsset}`, route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: backgroundBody }))
  page.on('popup', popup => { browserEvents.popups += 1; void popup.close() })
  page.on('frameattached', frame => { if (frame !== page.mainFrame()) browserEvents.frames += 1 })
  page.context().on('page', opened => { if (opened !== page) browserEvents.extraPages += 1 })
  page.on('pageerror', error => browserEvents.pageErrors.push(error.message))
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    if (url.origin !== APP_ORIGIN) browserEvents.failed.push({ origin: url.origin, pathname: url.pathname })
  })
  page.on('request', async request => {
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.origin !== 'https://google-redirect.plugins.orderingplus.com' || url.pathname !== '/docsmarket/api/frontend/settings' || url.search !== '') return
    const headers = await request.allHeaders()
    conversionHeaders.push({ hasAuthorization: /^Bearer\s+/.test(headers.authorization || '') })
  })
  await page.goto(capture.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const root = page.locator(capture.selector)
  if (waitForNative) {
    await expect(root).toBeVisible({ timeout: 30_000 })
    await expect(root).toHaveAttribute('data-doc-state', 'native-form')
    await waitForDocumentationReady(page, manifest.readiness, capture.selector)
  } else {
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(expectedPath)
  }
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  await page.waitForTimeout(1_000)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  const baseline = await storageSnapshot(page)
  await page.evaluate(() => {
    window.__DOC_APPLICATION_GUARD__.navigation = []
    window.__DOC_APPLICATION_GUARD__.storage = []
  })
  return { fixture, requestLog, browserEvents, conversionHeaders, baseline, expectedUrl: page.url(), root }
}

const assertPassiveGate = async (page, runtime, { authenticated = false, expectedPath }) => {
  const { fixture, requestLog, browserEvents, baseline } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(matching(requestLog, 'GET', businessLocalizedPattern)).toHaveLength(0)
  expect(matching(requestLog, 'GET', businessBasePattern)).toHaveLength(0)
  expect(matching(requestLog, 'GET', driverLocalizedPattern)).toHaveLength(0)
  expect(matching(requestLog, 'GET', driverBasePattern)).toHaveLength(0)
  expect(runtime.conversionHeaders).toEqual([])
  expect(new URL(page.url()).pathname).toBe(expectedPath)
  expect(new URL(page.url()).search).toBe('')
  expect(new URL(page.url()).hash).toBe('')
  const sockets = await assertWebSocketIsolation(page)
  const ordering = sockets.filter(item => item.origin === 'wss://sockets-v3.orderingplus.com')
  expect(ordering.length).toBeGreaterThan(0)
  expect(ordering.every(item => item.pathname === '/socket.io/' && item.queryKeys.includes('project') && item.hasToken === authenticated && item.queryKeys.includes('token') === authenticated)).toBe(true)
  expect(await storageSnapshot(page)).toEqual(baseline)
  expect(await page.evaluate(() => window.__DOC_APPLICATION_GUARD__.storage)).toEqual([])
  expect(browserEvents).toEqual({
    popups: 0,
    frames: 0,
    extraPages: 0,
    pageErrors: [],
    failed: [{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }]
  })
}

const assertNativeBlankForm = async (root, kind) => {
  await expect(root.getByText(kind === 'business' ? 'Start Selling with us.' : 'Join our fleet today', { exact: true })).toBeVisible()
  await expect(root.getByText('Sign up now', { exact: true })).toBeVisible()
  const expected = ['name', 'lastname', 'email', 'password']
  for (const name of expected) {
    const input = root.locator(`input[name='${name}']`)
    await expect(input).toHaveCount(1)
    await expect(input).toHaveValue('')
  }
  await expect(root.locator("input[name='password']")).toHaveAttribute('type', 'password')
  await expect(root.locator("input[name='middle_name'], input[name='second_lastname'], input[name='telefono']")).toHaveCount(0)
  await expect(root.locator("[data-doc-control='application-submit']")).toContainText('Submit')
  await expect(root.locator('iframe, frame')).toHaveCount(0)
  await expect(root).not.toContainText('Terms & Conditions')
}

const assertIsolation = async (page, capture, runtime) => {
  const { fixture, requestLog, browserEvents, baseline } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(matching(requestLog, 'POST', usersPattern)).toHaveLength(0)
  const isBusiness = capture.id.includes('business')
  expect(matching(requestLog, 'GET', businessLocalizedPattern)).toHaveLength(isBusiness ? 1 : 0)
  expect(matching(requestLog, 'GET', businessBasePattern)).toHaveLength(isBusiness ? 1 : 0)
  expect(matching(requestLog, 'GET', driverLocalizedPattern)).toHaveLength(isBusiness ? 0 : 1)
  expect(matching(requestLog, 'GET', driverBasePattern)).toHaveLength(isBusiness ? 0 : 1)
  expect(requestLog.syntheticAssets).toEqual([])
  expect(runtime.conversionHeaders).toEqual([])

  const sockets = await assertWebSocketIsolation(page)
  const ordering = sockets.filter(item => item.origin === 'wss://sockets-v3.orderingplus.com')
  expect(ordering.length).toBeGreaterThan(0)
  expect(ordering.every(item => item.pathname === '/socket.io/' && item.queryKeys.includes('project') && !item.queryKeys.includes('token') && !item.hasToken)).toBe(true)
  expect(sockets.every(item => (
    (item.origin === APP_WS_ORIGIN && item.pathname === '/') ||
    (item.origin === 'wss://sockets-v3.orderingplus.com' && item.pathname === '/socket.io/')
  ))).toBe(true)

  expect(await page.evaluate(() => window.__DOC_APPLICATION_GUARD__)).toEqual({
    navigation: [], open: [], storage: [], forms: [], inputs: [], messages: [], frames: [], geo: [], unload: []
  })
  expect(await storageSnapshot(page)).toEqual(baseline)
  for (const key of forbiddenStorageKeys) expect(Object.hasOwn(baseline.local, key)).toBe(false)
  expect(page.url()).toBe(runtime.expectedUrl)
  expect(new URL(page.url()).pathname).toBe(capture.route)
  expect(new URL(page.url()).search).toBe('')
  expect(new URL(page.url()).hash).toBe('')
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(browserEvents).toEqual({
    popups: 0,
    frames: 0,
    extraPages: 0,
    pageErrors: [],
    failed: [{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }]
  })
}

test.describe('Business and driver application documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await assertNativeBlankForm(runtime.root, capture.id.includes('business') ? 'business' : 'driver')
      await captureSection({ page, locator: runtime.root, filename: capture.file })
      await assertIsolation(page, capture, runtime)
    })
  }

  for (const kind of ['business', 'driver']) {
    test(`direct ${kind} route remains passive when discovery is disabled @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Private route assertion runs once on desktop.')
      test.setTimeout(60_000)
      const isBusiness = kind === 'business'
      const capture = {
        id: `applications-${kind}-allow-off-private`,
        route: isBusiness ? '/signup_business' : '/signup-driver',
        selector: `[data-doc-section='application-${kind}']`
      }
      const runtime = await setup(page, capture, {
        configureFixture: fixture => {
          const key = isBusiness ? 'business_signup_allow' : 'driver_signup_allow'
          fixture.firstLoad.configs[key].value = '0'
        }
      })
      await assertNativeBlankForm(runtime.root, kind)
      await assertIsolation(page, capture, runtime)
    })
  }

  for (const kind of ['business', 'driver']) {
    test(`kiosk redirects the ${kind} application route without loading application CMS @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Private route assertion runs once on desktop.')
      const capture = {
        id: `applications-${kind}-kiosk-private`,
        route: kind === 'business' ? '/signup_business' : '/signup-driver',
        selector: `[data-doc-section='application-${kind}']`
      }
      const runtime = await setup(page, capture, {
        expectedPath: `/${syntheticStoreSlug}`,
        waitForNative: false,
        configureFixture: fixture => {
          fixture.runtimeConfig.use_kiosk = true
          fixture.runtimeConfig.businessSlug = syntheticStoreSlug
          addBoundedBusinessRoute(fixture)
        }
      })
      await assertPassiveGate(page, runtime, { expectedPath: `/${syntheticStoreSlug}` })
    })
  }

  test('business single-store redirects to the configured business and does not load application CMS @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private route assertion runs once on desktop.')
    const slug = syntheticStoreSlug
    const capture = { id: 'applications-business-single-private', route: '/signup_business', selector: "[data-doc-section='application-business']" }
    const runtime = await setup(page, capture, {
      expectedPath: `/store/${slug}`,
      waitForNative: false,
      configureFixture: fixture => {
        Object.assign(fixture.firstLoad.theme.values.site, { mode: 'single_store', business_slug: slug })
        addBoundedBusinessRoute(fixture)
      }
    })
    await assertPassiveGate(page, runtime, { expectedPath: `/store/${slug}` })
  })

  test('driver single-store remains the passive native application form @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private route assertion runs once on desktop.')
    const capture = { id: 'applications-driver-single-private', route: '/signup-driver', selector: "[data-doc-section='application-driver']" }
    const runtime = await setup(page, capture, {
      configureFixture: fixture => {
        Object.assign(fixture.firstLoad.theme.values.site, { mode: 'single_store', business_slug: 'synthetic-application-store' })
      }
    })
    await assertNativeBlankForm(runtime.root, 'driver')
    await assertIsolation(page, capture, runtime)
  })

  for (const kind of ['business', 'driver']) {
    test(`authenticated session redirects the ${kind} application route without loading application CMS @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Private route assertion runs once on desktop.')
      const capture = {
        id: `applications-${kind}-auth-private`,
        route: kind === 'business' ? '/signup_business' : '/signup-driver',
        selector: `[data-doc-section='application-${kind}']`
      }
      const runtime = await setup(page, capture, {
        authenticated: true,
        expectedPath: '/',
        waitForNative: false,
        configureFixture: fixture => {
          const token = 'docs-fixture-application-session-token'
          const user = {
            id: 9301,
            name: 'Synthetic',
            lastname: 'Applicant',
            email: 'applicant@docs.invalid',
            cellphone: '5550101',
            email_verified: true,
            phone_verified: true,
            level: 3,
            guest: false,
            session: { access_token: token }
          }
          fixture.authSession = { token, user }
          fixture.apiOrigins = [...new Set([...(fixture.apiOrigins || []), 'https://google-redirect.plugins.orderingplus.com'])]
          fixture.routes.push(
            {
              method: 'GET',
              pattern: '^/docsmarket/api/frontend/settings$',
              assert: { count: 0 },
              response: { error: false, result: { settings: {} } }
            },
            {
              method: 'GET',
              pattern: '^/v400/en/docsmarket/users/9301(?:\\?.*)?$',
              assert: { minCount: 0, maxCount: 2 },
              response: { error: false, result: user }
            },
            {
              method: 'GET',
              pattern: '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$',
              assert: { minCount: 0, maxCount: 1 },
              response: { error: false, result: [] }
            },
            {
              method: 'GET',
              pattern: '^/v400/en/docsmarket/order_options(?:\\?.*)?$',
              assert: { count: 1 },
              response: { error: false, result: { user_id: 9301, type: 1, carts: [] } }
            },
            {
              method: 'GET',
              pattern: '^/v400/en/docsmarket/paymethods(?:\\?.*)?$',
              assert: { count: 1 },
              response: { error: false, result: [] }
            }
          )
        }
      })
      await assertPassiveGate(page, runtime, { authenticated: true, expectedPath: '/' })
    })
  }
})
