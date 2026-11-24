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

const manifest = await loadManifest('verification-profile-completion.manifest')
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'
const userPattern = '^/v400/en/docsmarket/users/9301(?:\\?.*)?$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, pattern, method = 'GET') => fixture.routes.find(route => route.method === method && route.pattern === pattern)

const fixtureForCapture = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const user = fixture.authSession.user
  const userRoute = routeFor(fixture, userPattern)
  const validationRoute = routeFor(fixture, validationPattern)
  const isProfile = capture.id.includes('profile-completion')
  const isEmail = capture.id.includes('verification-email')

  if (isProfile) {
    user.name = ''
    user.lastname = ''
    user.email_verified = true
    user.phone_verified = true
    userRoute.response.result = clone(user)
    userRoute.assert = { count: 2 }
  } else {
    user.lastname = 'Synthetic Lastname'
    user.email_verified = !isEmail
    user.phone_verified = isEmail
    userRoute.response.result = clone(user)
    userRoute.assert = { count: 1 }
    validationRoute.response = { error: false, result: [] }
    fixture.firstLoad.configs.verification_email_required.value = isEmail ? '1' : '0'
    fixture.firstLoad.configs.verification_phone_required.value = isEmail ? '0' : '1'
  }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_PROFILE_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      storageWrites: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = (...args) => {
      window.__DOC_PROFILE_GUARD__.windowOpenAttempts.push(safeTarget(args[0]))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_PROFILE_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_PROFILE_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_PROFILE_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_PROFILE_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }

    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      const storage = this === window.localStorage ? 'local' : 'session'
      const event = { storage, key: String(key) }
      if (storage === 'local' && key === 'token') {
        event.isReservedToken = typeof value === 'string' && value.startsWith('docs-fixture-')
      }
      if (storage === 'local' && key === 'user') {
        try {
          const user = JSON.parse(value)
          event.userShape = {
            id: user?.id,
            syntheticNameOrMissing: user?.name === '' || (typeof user?.name === 'string' && user.name.startsWith('Synthetic')),
            syntheticEmail: user?.email === 'docs@e.invalid',
            syntheticPhone: user?.cellphone === '2025550199',
            emailVerified: user?.email_verified,
            phoneVerified: user?.phone_verified,
            tokenConsistent: user?.session?.access_token === window.localStorage.getItem('token')
          }
        } catch {
          event.userShape = { parseable: false }
        }
      }
      window.__DOC_PROFILE_GUARD__.storageWrites.push(event)
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_PROFILE_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
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
    tokenReserved: typeof token === 'string' && token.startsWith('docs-fixture-'),
    user: {
      id: user?.id,
      syntheticNameOrMissing: user?.name === '' || (typeof user?.name === 'string' && user.name.startsWith('Synthetic')),
      syntheticEmail: user?.email === 'docs@e.invalid',
      syntheticPhone: user?.cellphone === '2025550199',
      emailVerified: user?.email_verified,
      phoneVerified: user?.phone_verified,
      tokenConsistent: user?.session?.access_token === token
    }
  }
})

const setup = async (page, capture) => {
  const fixture = await fixtureForCapture(capture)
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
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const isProfile = capture.id.includes('profile-completion')
  const target = page.locator(isProfile
    ? "[data-doc-section='profile-completion']"
    : "[data-doc-section='user-verification']")
  await expect(target).toBeVisible({ timeout: 30_000 })
  if (isProfile) {
    await expect(page).toHaveURL(`${APP_ORIGIN}/home`)
    await expect(target).toHaveAttribute('data-doc-state', 'required')
    await expect(target).toContainText('Complete your profile')
    await expect(target.locator("input[name='name']")).toHaveValue('')
    await expect(target.locator("input[name='lastname']")).toHaveValue('')
    await expect(target).toContainText('Logout')
  } else if (capture.id.includes('verification-email')) {
    await expect(page).toHaveURL(`${APP_ORIGIN}/verify`)
    await expect(target).toHaveAttribute('data-doc-state', 'email-pre-send')
    await expect(target.locator("[data-doc-control='verification-send-email']")).toContainText('Send code')
    const reservedEmail = await target.locator("input[name='email']").evaluate(input => (
      input.readOnly && input.placeholder === 'docs@e.invalid' && input.value === ''
    ))
    expect(reservedEmail).toBe(true)
  } else {
    await expect(page).toHaveURL(`${APP_ORIGIN}/verify`)
    await expect(target).toHaveAttribute('data-doc-state', 'phone-pre-send')
    await expect(target.locator("[data-doc-control='verification-send-phone']")).toContainText('Send code')
    const reservedPhone = await target.locator("input[type='tel']").evaluate(input => (
      input.value.replace(/\D/g, '') === '2025550199' && input.disabled
    ))
    expect(reservedPhone).toBe(true)
  }

  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['local_phone_code', 'token', 'user'])
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.user.id).toBe(9301)
  expect(baseline.user.syntheticNameOrMissing).toBe(true)
  expect(baseline.user.syntheticEmail).toBe(true)
  expect(baseline.user.syntheticPhone).toBe(true)
  expect(baseline.user.tokenConsistent).toBe(true)
  return { fixture, requestLog, browserEvents, baseline, target, isProfile }
}

const assertIsolation = async (page, runtime) => {
  const { fixture, requestLog, browserEvents, baseline, isProfile } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])

  const userReads = requestLog.matched.filter(request => request.method === 'GET' && request.pattern === userPattern)
  expect(userReads).toHaveLength(isProfile ? 2 : 1)
  const validationReads = requestLog.matched.filter(request => request.method === 'GET' && request.pattern === validationPattern)
  expect(validationReads).toHaveLength(1)

  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(({ origin }) => origin === 'wss://sockets-v3.orderingplus.com').every(({ queryKeys, hasToken }) => (
    queryKeys.includes('project') && queryKeys.includes('token') && hasToken === true
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
  const guard = await page.evaluate(() => window.__DOC_PROFILE_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.storageClears).toEqual(['local', 'session'])
  const userWrites = guard.storageWrites.filter(event => event.storage === 'local' && event.key === 'user')
  expect(userWrites).toHaveLength(isProfile ? 2 : 1)
  expect(userWrites.every(event => event.userShape?.id === 9301 && event.userShape?.tokenConsistent)).toBe(true)
  expect(guard.storageWrites.filter(event => event.storage === 'local' && event.key === 'token')).toHaveLength(1)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])

  const after = await storageShape(page)
  expect(after).toEqual(baseline)
}

test.describe('Profile completion and verification documentation', () => {
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
})
