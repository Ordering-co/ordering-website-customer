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

const manifest = await loadManifest('wallets.manifest')
const loyaltyPattern = '^/v400/en/docsmarket/users/9301\\?params=loyalty_level$'
const walletsPattern = '^/v400/en/docsmarket/users/9301/wallets$'
const settingsPattern = '^/v400/en/docsmarket/users/9301\\?params=settings$'
const cashEventsPattern = '^/v400/en/docsmarket/users/9301/wallets/9701/events\\?orderBy=-id$'
const pointsEventsPattern = '^/v400/en/docsmarket/users/9301/wallets/9702/events\\?orderBy=-id$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)
const matches = (requestLog, method, pattern) => requestLog.matched.filter(request => request.method === method && request.pattern === pattern)

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const type = capture.id.includes('points') ? 'credit_point' : 'cash'
  const noActivity = capture.id.includes('no-activity')
  const token = `docs-fixture-wallets-${type}-${noActivity ? 'empty' : capture.project}-token`
  fixture.authSession.token = token
  fixture.authSession.user.session.access_token = token
  routeFor(fixture, 'GET', settingsPattern).response.result.session.access_token = token
  routeFor(fixture, 'GET', loyaltyPattern).assert = { count: 2 }
  routeFor(fixture, 'GET', walletsPattern).assert = { count: 2 }
  routeFor(fixture, 'GET', cashEventsPattern).assert = { count: type === 'cash' ? 1 : 0 }
  routeFor(fixture, 'GET', pointsEventsPattern).assert = { count: type === 'credit_point' ? 1 : 0 }
  if (noActivity) routeFor(fixture, 'GET', cashEventsPattern).response.result = []
  assertFixturePrivacy(fixture)
  return { fixture, type, noActivity }
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_WALLETS_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      geolocationAttempts: [],
      storageWrites: [],
      storageRemovals: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = value => {
      window.__DOC_WALLETS_GUARD__.windowOpenAttempts.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_WALLETS_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_WALLETS_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_WALLETS_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_WALLETS_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const blockedGeolocation = (success, error) => {
      window.__DOC_WALLETS_GUARD__.geolocationAttempts.push(true)
      error?.({ code: 1, message: 'Blocked by documentation capture.' })
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = blockedGeolocation
      navigator.geolocation.watchPosition = blockedGeolocation
    }
    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      window.__DOC_WALLETS_GUARD__.storageWrites.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeRemoveItem = window.Storage.prototype.removeItem
    window.Storage.prototype.removeItem = function (key) {
      window.__DOC_WALLETS_GUARD__.storageRemovals.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeRemoveItem, this, [key])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_WALLETS_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
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

const setup = async (page, capture) => {
  const { fixture, type, noActivity } = await fixtureFor(capture)
  const requestLog = createRequestLog()
  const browserEvents = { pageErrors: [], failedRequests: [], attachedFrames: [], extraPages: [] }
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
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const root = page.locator("[data-doc-section='wallets']")
  const selected = page.locator(type === 'cash' ? "[data-doc-section='cash-wallet']" : "[data-doc-section='credit-points-wallet']")
  await expect(root).toBeVisible({ timeout: 30_000 })
  await expect(root).toHaveAttribute('data-doc-wallet-type', type)
  await expect(root).toHaveAttribute('data-doc-state', 'results')
  await expect(selected).toHaveAttribute('data-doc-state', noActivity ? 'no-activity' : 'activity')
  await expect(page).toHaveURL(`${APP_ORIGIN}/wallets?wallet=${type}`)
  await expect(selected.locator("[data-doc-section='wallet-balance']")).toBeVisible()
  await expect(selected.locator("[data-doc-section='wallet-transaction']")).toHaveCount(noActivity ? 0 : 2)
  if (type === 'cash') {
    await expect(selected).toContainText('125')
    await expect(selected).toContainText('Wallet credits')
  } else {
    await expect(selected).toContainText('420')
    await expect(selected).toContainText('Synthetic Gold')
  }
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['local_phone_code', 'token', 'user'])
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.userSafe).toBe(true)
  await page.evaluate(() => {
    window.__DOC_WALLETS_GUARD__.storageWrites = []
    window.__DOC_WALLETS_GUARD__.storageRemovals = []
    window.__DOC_WALLETS_GUARD__.storageClears = []
    window.__DOC_WALLETS_GUARD__.navigationAttempts = []
  })
  return { fixture, requestLog, browserEvents, baseline, type, noActivity }
}

const assertIsolation = async (page, runtime) => {
  const { fixture, requestLog, browserEvents, baseline, type } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(matches(requestLog, 'GET', loyaltyPattern)).toHaveLength(2)
  expect(matches(requestLog, 'GET', walletsPattern)).toHaveLength(2)
  expect(matches(requestLog, 'GET', settingsPattern)).toHaveLength(1)
  expect(matches(requestLog, 'GET', type === 'cash' ? cashEventsPattern : pointsEventsPattern)).toHaveLength(1)
  expect(matches(requestLog, 'GET', type === 'cash' ? pointsEventsPattern : cashEventsPattern)).toHaveLength(0)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])
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
  const guard = await page.evaluate(() => window.__DOC_WALLETS_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.geolocationAttempts).toEqual([])
  expect(guard.storageWrites).toEqual([])
  expect(guard.storageRemovals).toEqual([])
  expect(guard.storageClears).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(await storageShape(page)).toEqual(baseline)
}

test.describe('Wallets documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }

  test.skip('wallet application at checkout remains owned by the checkout articles', async () => {})
  test.skip('gift card balance and redemption remain owned by the gift-card flow', async () => {})
  test.skip('invalid or disabled wallet-type query behavior remains a private blocker', async () => {})
})
