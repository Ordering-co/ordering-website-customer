import { expect, test } from '@playwright/test'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('reset-password.manifest')
const forbiddenSessionKeys = ['token', 'user', 'user-customer', 'device_code', 'project_name']

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_PASSWORD_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: []
    }
    window.open = (...args) => {
      const target = new URL(String(args[0] ?? window.location.href), window.location.href)
      window.__DOC_PASSWORD_GUARD__.windowOpenAttempts.push({ origin: target.origin, pathname: target.pathname })
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      const target = new URL(String(this.action || window.location.href), window.location.href)
      window.__DOC_PASSWORD_GUARD__.formSubmitAttempts.push({ origin: target.origin, pathname: target.pathname })
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      const target = new URL(String(this.action || window.location.href), window.location.href)
      window.__DOC_PASSWORD_GUARD__.formRequestSubmitAttempts.push({ origin: target.origin, pathname: target.pathname })
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_PASSWORD_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        const target = new URL(String(args[2] ?? window.location.href), window.location.href)
        window.__DOC_PASSWORD_GUARD__.navigationAttempts.push({ method, origin: target.origin, pathname: target.pathname })
        return original(...args)
      }
    }
  })
}

const storageSnapshot = page => page.evaluate(() => ({
  local: Object.fromEntries(Object.keys(window.localStorage).sort().map(key => [key, window.localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(window.sessionStorage).sort().map(key => [key, window.sessionStorage.getItem(key)])),
  cookie: document.cookie
}))

const setup = async (page, capture) => {
  const fixture = await loadFixture(manifest.fixture)
  const requestLog = createRequestLog()
  const browserEvents = { popupAttempts: [], pageErrors: [], failedRequests: [], attachedFrames: [], extraPages: [] }
  page.on('popup', popup => {
    const target = new URL(popup.url() || 'about:blank')
    browserEvents.popupAttempts.push({ origin: target.origin, pathname: target.pathname })
    void popup.close()
  })
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
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  let target
  if (capture.id.includes('recovery-request')) {
    await expect(page).toHaveURL(`${APP_ORIGIN}/home`)
    if (capture.project === 'mobile-chromium') {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await page.locator('#sidebar_menu').getByRole('button', { name: 'Sign in', exact: true }).click()
    } else {
      await page.locator("[name='signin']").click()
    }
    const login = page.locator("[data-doc-section='authentication-login']")
    await expect(login).toBeVisible({ timeout: 30_000 })
    await login.getByText('Reset password', { exact: true }).click()
    target = page.locator("[data-doc-section='password-recovery-request']")
    await expect(target).toBeVisible()
    await expect(target).toHaveAttribute('data-doc-state', 'empty')
    await expect(target.locator("input[name='email']")).toHaveValue('')
    await expect(target.locator("[data-doc-control='password-recovery-submit']")).toContainText('Recover Password')
  } else {
    const safeQuery = await page.evaluate(() => ({
      pathname: window.location.pathname,
      keys: [...new URLSearchParams(window.location.search).keys()],
      reservedValuesOnly: new URLSearchParams(window.location.search).get('code') === 'DOCS-NOT-A-REAL-CODE' &&
        new URLSearchParams(window.location.search).get('random') === 'DOCS-NOT-A-REAL-RANDOM'
    }))
    expect(safeQuery).toEqual({ pathname: '/password/reset', keys: ['code', 'random'], reservedValuesOnly: true })
    target = page.locator("[data-doc-section='password-reset']")
    await expect(target).toBeVisible({ timeout: 30_000 })
    await expect(target).toHaveAttribute('data-doc-state', 'new-password')
    await expect(target.locator("input[name='password']")).toHaveValue('')
    await expect(target.locator("input[name='confirm-password']")).toHaveValue('')
    await expect(target.locator("[data-doc-control='password-reset-submit']")).toContainText('Change password')
    await expect(target.locator("input[name='code'], input[name='random']")).toHaveCount(0)
  }

  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageSnapshot(page)
  expect(baseline.local).toEqual({ local_phone_code: '+1' })
  expect(Object.keys(baseline.session).every(key => key.startsWith('retry-lazy-refreshed:'))).toBe(true)
  for (const key of forbiddenSessionKeys) expect(Object.hasOwn(baseline.local, key)).toBe(false)
  return { fixture, requestLog, browserEvents, baseline, target }
}

const assertIsolation = async (page, fixture, requestLog, browserEvents, baseline, isResetRoute) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])
  expect(requestLog.syntheticAssets).toEqual([])

  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => (
    origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/'
  ))).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(({ origin }) => origin === 'wss://sockets-v3.orderingplus.com').every(({ queryKeys, hasToken }) => (
    queryKeys.includes('project') && hasToken === false && !queryKeys.includes('token')
  ))).toBe(true)

  expect(browserEvents.popupAttempts).toEqual([])
  expect(browserEvents.pageErrors).toEqual([])
  expect(browserEvents.attachedFrames).toEqual([])
  expect(browserEvents.extraPages).toEqual([])
  expect(browserEvents.failedRequests.filter(({ origin }) => ![
    'https://fonts.gstatic.com',
    'https://cdn.onesignal.com',
    'https://www.google-analytics.com'
  ].includes(origin))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_PASSWORD_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])

  const after = await storageSnapshot(page)
  expect(after).toEqual(baseline)
  for (const key of forbiddenSessionKeys) expect(Object.hasOwn(after.local, key)).toBe(false)
  expect(after.local.local_phone_code).toBe('+1')
  if (isResetRoute) {
    const queryStillSafe = await page.evaluate(() => {
      const search = new URLSearchParams(window.location.search)
      return window.location.pathname === '/password/reset' &&
        [...search.keys()].join(',') === 'code,random' &&
        search.get('code') === 'DOCS-NOT-A-REAL-CODE' &&
        search.get('random') === 'DOCS-NOT-A-REAL-RANDOM'
    })
    expect(queryStillSafe).toBe(true)
  } else {
    await expect(page).toHaveURL(`${APP_ORIGIN}/home`)
  }
}

test.describe('Password recovery documentation', () => {
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
      await assertIsolation(
        page,
        runtime.fixture,
        runtime.requestLog,
        runtime.browserEvents,
        runtime.baseline,
        capture.id.includes('reset-form')
      )
    })
  }
})
