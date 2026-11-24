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

const manifest = await loadManifest('saved-cards.manifest')
const paymethodsPattern = '^/v400/en/docsmarket/paymethods(?:\\?.*)?$'
const cardsPattern = '^/v400/en/docsmarket/users/9301/paymethods/61/paymethods$'
const deletePattern = '^/v400/en/docsmarket/users/9301/paymethods/61/paymethods/9502$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)

const fixtureFor = async ({ state = 'ready', deleteCard = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const token = `docs-fixture-saved-cards-${deleteCard ? 'delete' : state}-token`
  fixture.authSession.token = token
  fixture.authSession.user.session.access_token = token
  const userRoute = fixture.routes.find(route => route.method === 'GET' && /users\/9301/.test(route.pattern) && !/addresses|paymethods/.test(route.pattern))
  userRoute.response.result.session.access_token = token

  const cards = routeFor(fixture, 'GET', cardsPattern)
  if (state === 'unavailable') {
    routeFor(fixture, 'GET', paymethodsPattern).response.result = []
    cards.assert = { count: 0 }
  }
  if (state === 'empty') cards.response.result = []
  if (state === 'error') cards.response = { error: true, result: ['Synthetic saved-card list unavailable.'] }
  routeFor(fixture, 'DELETE', deletePattern).assert = { count: deleteCard ? 1 : 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_SAVED_CARDS_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      storageWrites: [],
      storageRemovals: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = value => {
      window.__DOC_SAVED_CARDS_GUARD__.windowOpenAttempts.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_SAVED_CARDS_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_SAVED_CARDS_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_SAVED_CARDS_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_SAVED_CARDS_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      const storage = this === window.localStorage ? 'local' : 'session'
      const event = { storage, key: String(key) }
      if (storage === 'local' && key === 'token') event.isReservedToken = typeof value === 'string' && value.startsWith('docs-fixture-')
      if (storage === 'local' && key === 'user') {
        try {
          const user = JSON.parse(value)
          event.userShape = {
            id: user?.id,
            syntheticName: typeof user?.name === 'string' && user.name.startsWith('Synthetic'),
            tokenConsistent: user?.session?.access_token === window.localStorage.getItem('token')
          }
        } catch {
          event.userShape = { parseable: false }
        }
      }
      window.__DOC_SAVED_CARDS_GUARD__.storageWrites.push(event)
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeRemoveItem = window.Storage.prototype.removeItem
    window.Storage.prototype.removeItem = function (key) {
      window.__DOC_SAVED_CARDS_GUARD__.storageRemovals.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeRemoveItem, this, [key])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_SAVED_CARDS_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
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

const stateForCapture = capture => {
  if (capture.id.includes('unavailable')) return 'unavailable'
  if (capture.id.includes('empty')) return 'empty'
  if (capture.id.includes('error')) return 'error'
  return 'ready'
}

const setup = async (page, capture, options = {}) => {
  const state = options.state || stateForCapture(capture)
  const fixture = await fixtureFor({ ...options, state })
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
    if (request.method() === 'DELETE' && target.pathname.endsWith('/users/9301/paymethods/61/paymethods/9502')) {
      const headers = request.headers()
      browserEvents.deleteHeaders.push({
        hasAuthorization: typeof headers.authorization === 'string' && headers.authorization.startsWith('Bearer docs-fixture-'),
        app: headers['x-app-x'],
        internal: headers['x-internal-product-x'],
        hasSocket: Object.hasOwn(headers, 'x-socket-id-x')
      })
    }
  })
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const target = page.locator("[data-doc-section='saved-cards']")
  await expect(target).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/profile/cards`)
  await expect(target).toHaveAttribute('data-doc-state', state)
  if (state === 'ready') {
    await expect(target.locator("[data-doc-control='saved-card-item']")).toHaveCount(2)
    await expect(target).toContainText('visa')
    await expect(target).toContainText('0000')
    await expect(target).toContainText('mastercard')
    await expect(target).toContainText('0011')
    await expect(target).not.toContainText('docs-fixture-card-reference')
  }
  if (capture.id === 'saved-card-delete-confirm-desktop') {
    await target.locator("[data-doc-control='saved-card-delete']").nth(1).click()
    await expect(page.locator("[data-doc-section='saved-card-delete-confirmation']")).toContainText('Are you sure')
  }
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['local_phone_code', 'token', 'user'])
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.userSafe).toBe(true)
  await page.evaluate(() => {
    window.__DOC_SAVED_CARDS_GUARD__.storageWrites = []
    window.__DOC_SAVED_CARDS_GUARD__.storageRemovals = []
    window.__DOC_SAVED_CARDS_GUARD__.storageClears = []
  })
  return { fixture, requestLog, browserEvents, baseline, target }
}

const assertIsolation = async (page, runtime, { allowedWrites = [], deleteHeaders = [] } = {}) => {
  const { fixture, requestLog, browserEvents, baseline } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
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
  const guard = await page.evaluate(() => window.__DOC_SAVED_CARDS_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.storageWrites).toEqual([])
  expect(guard.storageRemovals).toEqual([])
  expect(guard.storageClears).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(await storageShape(page)).toEqual(baseline)
}

test.describe('Saved cards documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({
        page,
        locator: page.locator(capture.selector),
        filename: capture.file,
        captureMode: capture.capture_mode
      })
      await assertIsolation(page, runtime)
    })
  }

  test('deleting a returned synthetic card removes only that row @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private deletion assertion runs on desktop only.')
    const runtime = await setup(page, manifest.captures[0], { state: 'ready', deleteCard: true })
    await runtime.target.locator("[data-doc-control='saved-card-delete']").nth(1).click()
    const confirmation = page.locator("[data-doc-section='saved-card-delete-confirmation']")
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Accept' }).click()
    await expect(runtime.target.locator("[data-doc-control='saved-card-item']")).toHaveCount(1)
    await expect(runtime.target).toContainText('0000')
    await expect(runtime.target).not.toContainText('0011')
    const remove = runtime.requestLog.matched.filter(request => request.method === 'DELETE' && request.pattern === deletePattern)
    expect(remove).toHaveLength(1)
    expect(remove[0].body).toBeNull()
    await assertIsolation(page, runtime, {
      allowedWrites: [{ method: 'DELETE', pattern: deletePattern }],
      deleteHeaders: [{ hasAuthorization: true, app: 'docs-fixture-website-app', internal: 'website', hasSocket: true }]
    })
  })

  test('a card-list error shows the bounded fallback and sends no write @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private error assertion runs on desktop only.')
    const runtime = await setup(page, manifest.captures[0], { state: 'error' })
    await expect(runtime.target).toContainText('We could not load your cards')
    await assertIsolation(page, runtime)
  })

  test.skip('adding a card remains source-audited because the Braintree iframe URL carries the session token', async () => {})
})
