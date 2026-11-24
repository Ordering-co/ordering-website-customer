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

const manifest = await loadManifest('sign-in-create-account.manifest')
const authPattern = '^/v400/en/docsmarket/auth$'
const signupPattern = '^/v400/en/docsmarket/users$'
const forbiddenSessionKeys = ['token', 'user', 'user-customer', 'device_code', 'project_name']

const matchingRequests = (log, method, pattern) => log.matched.filter(
  request => request.method === method && request.pattern === pattern
)

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_AUTH_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: []
    }
    window.open = (...args) => {
      window.__DOC_AUTH_GUARD__.windowOpenAttempts.push(String(args[0] ?? ''))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_AUTH_GUARD__.formSubmitAttempts.push(String(this.action || ''))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_AUTH_GUARD__.formRequestSubmitAttempts.push(String(this.action || ''))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_AUTH_GUARD__.postMessageAttempts.push(String(args[1] ?? ''))
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        const target = new URL(String(args[2] ?? window.location.href), window.location.href)
        window.__DOC_AUTH_GUARD__.navigationAttempts.push({ method, pathname: target.pathname })
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

const setup = async (page, { mobile = false } = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  const requestLog = createRequestLog()
  const browserEvents = { popupAttempts: [], pageErrors: [], failedRequests: [], attachedFrames: [], extraPages: [] }
  page.on('popup', popup => {
    browserEvents.popupAttempts.push(popup.url())
    void popup.close()
  })
  page.on('pageerror', error => browserEvents.pageErrors.push(error.message))
  page.on('requestfailed', request => browserEvents.failedRequests.push(request.url()))
  page.on('frameattached', frame => browserEvents.attachedFrames.push(frame))
  page.context().on('page', openedPage => {
    if (openedPage !== page) browserEvents.extraPages.push(openedPage)
  })
  if (mobile) await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect(page).toHaveURL(`${APP_ORIGIN}/home`)
  const initialStorage = await storageSnapshot(page)
  expect(initialStorage.local.local_phone_code).toBe('+1')
  for (const key of forbiddenSessionKeys) expect(Object.hasOwn(initialStorage.local, key)).toBe(false)

  if (mobile) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await page.locator('#sidebar_menu').getByRole('button', { name: 'Sign in', exact: true }).click()
  } else {
    await page.locator("[name='signin']").click()
  }
  const login = page.locator("[data-doc-section='authentication-login']")
  await expect(login).toBeVisible({ timeout: 30_000 })
  await expect(login).toHaveAttribute('data-doc-state', 'email')
  await expect(login).toHaveAttribute('data-doc-flow', 'password')
  return { fixture, requestLog, browserEvents, login }
}

const assertEmptySensitiveInputs = async container => {
  const sensitiveInputs = container.locator("input[type='email'], input[type='password'], input[type='tel'], input[name='cellphone'], input[name='name'], input[name='lastname']")
  const count = await sensitiveInputs.count()
  for (let index = 0; index < count; index += 1) {
    await expect(sensitiveInputs.nth(index)).toHaveValue('')
  }
}

const assertIsolation = async (page, fixture, requestLog, browserEvents, baseline) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])
  expect(matchingRequests(requestLog, 'POST', authPattern)).toHaveLength(0)
  expect(matchingRequests(requestLog, 'POST', signupPattern)).toHaveLength(0)
  expect(requestLog.syntheticAssets).toEqual(requestLog.syntheticAssets.length === 0
    ? []
    : [{
        method: 'GET',
        origin: 'https://purecatamphetamine.github.io',
        pathname: '/country-flag-icons/3x2/US.svg'
      }])

  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname, queryKeys, hasToken }) => (
    origin === 'wss://sockets-v3.orderingplus.com' &&
    pathname === '/socket.io/' &&
    queryKeys.includes('project') &&
    hasToken === false
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
  const guard = await page.evaluate(() => window.__DOC_AUTH_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  const unexpectedFailures = browserEvents.failedRequests.filter(url => !(
    url.startsWith('https://fonts.gstatic.com/') ||
    url.startsWith('https://cdn.onesignal.com/') ||
    url.startsWith('https://www.google-analytics.com/')
  ))
  expect(unexpectedFailures).toEqual([])

  const after = await storageSnapshot(page)
  expect(after).toEqual(baseline)
  for (const key of forbiddenSessionKeys) expect(Object.hasOwn(after.local, key)).toBe(false)
  expect(after.local.local_phone_code).toBe('+1')
  await expect(page).toHaveURL(`${APP_ORIGIN}/home`)
}

test.describe('Authentication entry documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const mobile = capture.project === 'mobile-chromium'
      const runtime = await setup(page, { mobile })
      const { fixture, requestLog, browserEvents, login } = runtime
      let target = login

      if (capture.id === 'authentication-phone-desktop' || capture.id === 'authentication-sms-desktop') {
        await login.locator("[data-doc-control='authentication-phone-tab']").click()
        await expect(login).toHaveAttribute('data-doc-state', 'cellphone')
        await expect(login).toHaveAttribute('data-doc-flow', 'password')
        await expect(login.locator("[data-doc-control='authentication-sms-entry']")).toBeVisible()
      }
      if (capture.id === 'authentication-sms-desktop') {
        await login.locator("[data-doc-control='authentication-sms-entry']").click()
        await expect(login).toHaveAttribute('data-doc-flow', 'sms-pre-send')
        await expect(login.locator("[data-doc-control='authentication-submit']")).toContainText('Get verify code')
      }
      if (capture.id === 'authentication-signup-desktop') {
        await login.getByText('Create account', { exact: true }).click()
        target = page.locator("[data-doc-section='authentication-signup']")
        await expect(target).toBeVisible()
        await expect(target).toHaveAttribute('data-doc-state', 'default')
        await expect(target.locator("[data-doc-control='authentication-signup-submit']")).toContainText('Create an account')
        await expect(target).toContainText('Receive newsletters and exclusive promotions')
      }

      await assertEmptySensitiveInputs(target)
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
        imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
      })
      const baseline = await storageSnapshot(page)
      expect(baseline.local).toEqual({ local_phone_code: '+1' })
      expect(Object.keys(baseline.session).every(key => key.startsWith('retry-lazy-refreshed:'))).toBe(true)
      for (const key of forbiddenSessionKeys) expect(Object.hasOwn(baseline.local, key)).toBe(false)
      await captureSection({
        page,
        locator: page.locator(capture.selector),
        filename: capture.file,
        captureMode: capture.capture_mode
      })
      await assertIsolation(page, fixture, requestLog, browserEvents, baseline)
    })
  }
})
