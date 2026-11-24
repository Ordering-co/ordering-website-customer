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

const manifest = await loadManifest('profile.manifest')
const userGetPattern = '^/v400/en/docsmarket/users/9301(?:\\?.*)?$'
const userSavePattern = '^/v400/en/docsmarket/users/9301$'
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)

const fixtureFor = async ({ update = false } = {}) => {
  const fixture = clone(await loadFixture(manifest.fixture))
  routeFor(fixture, 'POST', userSavePattern).assert = update ? { count: 1 } : { count: 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_ACCOUNT_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: [],
      fileInputAttempts: [],
      storageWrites: [],
      storageClears: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname }
    }
    window.open = value => {
      window.__DOC_ACCOUNT_GUARD__.windowOpenAttempts.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_ACCOUNT_GUARD__.formSubmitAttempts.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_ACCOUNT_GUARD__.formRequestSubmitAttempts.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_ACCOUNT_GUARD__.postMessageAttempts.push({ targetOrigin: String(args[1] ?? '') })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_ACCOUNT_GUARD__.navigationAttempts.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const nativeClick = window.HTMLInputElement.prototype.click
    window.HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') window.__DOC_ACCOUNT_GUARD__.fileInputAttempts.push({ type: 'file' })
      return Reflect.apply(nativeClick, this, [])
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
            syntheticName: typeof user?.name === 'string' && user.name.startsWith('Synthetic'),
            syntheticEmail: user?.email === 'docs@e.invalid',
            syntheticPhone: user?.cellphone === '2025550199',
            tokenConsistent: user?.session?.access_token === window.localStorage.getItem('token')
          }
        } catch {
          event.userShape = { parseable: false }
        }
      }
      window.__DOC_ACCOUNT_GUARD__.storageWrites.push(event)
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_ACCOUNT_GUARD__.storageClears.push(this === window.localStorage ? 'local' : 'session')
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
      syntheticName: typeof user?.name === 'string' && user.name.startsWith('Synthetic'),
      syntheticEmail: user?.email === 'docs@e.invalid',
      syntheticPhone: user?.cellphone === '2025550199',
      tokenConsistent: user?.session?.access_token === token
    }
  }
})

const setup = async (page, capture, options = {}) => {
  const fixture = await fixtureFor(options)
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
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const target = page.locator("[data-doc-section='user-profile']")
  await expect(target).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/profile?view=account`)
  await expect(target).toHaveAttribute('data-doc-state', 'editable')
  await expect(target.locator("input[name='name']")).toBeEnabled()
  await expect(target.locator("input[name='name']")).toHaveValue('Synthetic Profile')
  await expect(target.locator("input[name='lastname']")).toHaveValue('Synthetic Customer')
  await expect(target.locator("input[name='email']")).toHaveValue('docs@e.invalid')
  await expect(target.locator("input[name='password']")).toHaveValue('')
  await expect(target.locator("[data-doc-control='profile-save']")).toHaveCount(0)
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline.localKeys).toEqual(['local_phone_code', 'token', 'user'])
  expect(baseline.tokenReserved).toBe(true)
  expect(baseline.user).toEqual({
    id: 9301,
    syntheticName: true,
    syntheticEmail: true,
    syntheticPhone: true,
    tokenConsistent: true
  })
  return { fixture, requestLog, browserEvents, baseline, target }
}

const assertIsolation = async (page, runtime, { allowedWrites = [] } = {}) => {
  const { fixture, requestLog, browserEvents, baseline } = runtime
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET').map(({ method, pattern }) => ({ method, pattern }))).toEqual(allowedWrites)
  expect(requestLog.matched.filter(request => request.method === 'GET' && request.pattern === userGetPattern)).toHaveLength(2)
  expect(requestLog.matched.filter(request => request.method === 'GET' && request.pattern === validationPattern)).toHaveLength(1)

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
  expect(browserEvents.failedRequests.filter(({ origin }) => ![
    'https://fonts.gstatic.com',
    'https://cdn.onesignal.com',
    'https://www.google-analytics.com'
  ].includes(origin))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_ACCOUNT_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(guard.navigationAttempts).toEqual([])
  expect(guard.fileInputAttempts).toEqual([])
  expect(guard.storageClears).toEqual(['local', 'session'])
  expect(guard.storageWrites.filter(event => event.storage === 'local' && event.key === 'token')).toHaveLength(1)
  expect(guard.storageWrites.filter(event => event.storage === 'local' && event.key === 'user').every(event => (
    event.userShape?.id === 9301 && event.userShape?.syntheticName && event.userShape?.tokenConsistent
  ))).toBe(true)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  const after = await storageShape(page)
  expect(after.localKeys).toEqual(baseline.localKeys)
  expect(after.sessionKeys).toEqual(baseline.sessionKeys)
  expect(after.cookieKeys).toEqual(baseline.cookieKeys)
  expect(after.tokenReserved).toBe(true)
  expect(after.user.tokenConsistent).toBe(true)
}

test.describe('Profile documentation', () => {
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

  test('name-only update uses one exact synthetic user write and refreshes the profile state @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Private update assertion runs on desktop only.')
    test.setTimeout(60_000)
    const runtime = await setup(page, manifest.captures[0], { update: true })
    const name = runtime.target.locator("input[name='name']")
    await name.fill('Synthetic Updated Name')
    const save = runtime.target.locator("[data-doc-control='profile-save']")
    await expect(save).toBeVisible()
    await save.click()
    await expect.poll(() => runtime.requestLog.matched.filter(request => request.method === 'POST' && request.pattern === userSavePattern).length).toBe(1)
    const writes = runtime.requestLog.matched.filter(request => request.method === 'POST' && request.pattern === userSavePattern)
    expect(writes[0].body).toEqual({ name: 'Synthetic Updated Name' })
    await expect(name).toHaveValue('Synthetic Updated Name')
    await expect(save).toHaveCount(0)
    await assertIsolation(page, runtime, { allowedWrites: [{ method: 'POST', pattern: userSavePattern }] })
    const userShape = await storageShape(page)
    expect(userShape.user).toEqual({
      id: 9301,
      syntheticName: true,
      syntheticEmail: true,
      syntheticPhone: true,
      tokenConsistent: true
    })
  })
})
