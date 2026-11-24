import { expect, test } from '@playwright/test'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import path from 'node:path'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('global-states.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))
const isLoading = capture => capture.id.startsWith('global-loading-')
const isOffline = capture => capture.id.startsWith('global-offline-')
const isNotFound = capture => capture.id.startsWith('global-page-not-found-')
const isConsent = capture => capture.id.startsWith('global-cookie-consent-')
const isOutOfService = capture => capture.id.startsWith('global-site-out-of-service-')

const installBrowserGuards = (page, capture) => page.addInitScript(({ offline }) => {
  const safe = value => {
    const url = new URL(String(value || location.href), location.href)
    return { origin: url.origin, pathname: url.pathname, queryKeys: [...new Set([...url.searchParams.keys()])].sort() }
  }
  window.__DOC_GLOBAL_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [], frames: [], unload: [] }
  if (offline) Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: () => false })
  window.open = value => { window.__DOC_GLOBAL_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => {
      window.__DOC_GLOBAL_GUARD__.nav.push({ method, ...safe(args[2]) })
      return original(...args)
    }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) {
      window.__DOC_GLOBAL_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) })
      return Reflect.apply(original, this, args)
    }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) {
      window.__DOC_GLOBAL_GUARD__.forms.push({ method, ...safe(this.action) })
      if (method === 'requestSubmit') return Reflect.apply(original, this, args)
    }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) {
    window.__DOC_GLOBAL_GUARD__.messages.push(String(args[1] ?? ''))
    return Reflect.apply(nativePost, window, args)
  }
  const nativeSet = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if ((this instanceof HTMLIFrameElement || this instanceof HTMLFrameElement) && name.toLowerCase() === 'src') {
      window.__DOC_GLOBAL_GUARD__.frames.push(safe(value))
    }
    return Reflect.apply(nativeSet, this, [name, value])
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_GLOBAL_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
  for (const eventName of ['beforeunload', 'pagehide']) {
    window.addEventListener(eventName, () => window.__DOC_GLOBAL_GUARD__.unload.push(eventName))
  }
}, { offline: isOffline(capture) })

const storageShape = page => page.evaluate(() => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
  cookies: document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(Boolean).sort()
}))

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const bootstrap = routeFor(fixture, 'GET', 'frontends/first_load')
  const languages = routeFor(fixture, 'GET', '/languages')
  const homeContent = routeFor(fixture, 'GET', 'pages/homeContent2')
  const pageIndex = routeFor(fixture, 'GET', 'docsmarket/pages(?:')
  const banner = routeFor(fixture, 'GET', '/banner')
  const normalHome = isLoading(capture) || isConsent(capture)

  fixture.firstLoad.theme.values.images = {
    ...fixture.firstLoad.theme.values.images,
    'empty.no_internet': new URL('/docs-assets/global-offline.svg', APP_ORIGIN).href
  }
  if (isOutOfService(capture)) {
    fixture.firstLoad.theme.values.images.logotype_inverse = new URL('/docs-assets/global-synthetic-logo.svg', APP_ORIGIN).href
  }
  fixture.runtimeConfig.isCancellation = isOutOfService(capture)
  fixture.runtimeConfig.cookie_consent_enabled = false
  fixture.firstLoad.configs.cookie_consent_enabled.value = isConsent(capture) ? '1' : '0'
  languages.assert = { count: isOutOfService(capture) ? 0 : 1 }
  homeContent.assert = { count: normalHome ? 2 : 0 }
  pageIndex.assert = { count: 0 }
  banner.assert = { count: normalHome ? 1 : 0 }
  bootstrap.assert = { count: isLoading(capture) ? 1 : 0 }

  if (isLoading(capture)) {
    const settledFirstLoad = clone(fixture.firstLoad)
    fixture.firstLoad = null
    bootstrap.response = { error: false, result: settledFirstLoad }
    bootstrap.transport = { delayMs: 2400 }
  }

  return fixture
}

const setup = async (page, capture, { trailingAction, themeValues } = {}) => {
  const fixture = await fixtureFor(capture)
  Object.assign(fixture.firstLoad?.theme?.values ?? {}, themeValues)
  if (trailingAction) {
    fixture.firstLoad.theme.values.components ??= {}
    fixture.firstLoad.theme.values.components.input ??= {}
    fixture.firstLoad.theme.values.components.input.slots = { trailing_action: trailingAction }
  }
  const requestLog = createRequestLog()
  const assets = []
  const browserEvents = { popups: 0, frames: 0, pageErrors: [], failed: [] }
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page, capture)
  await installFixtureGlobals(page, fixture, { authenticated: false })
  await installNetworkGuard(page, fixture, requestLog)
  await page.route('**/src/assets/images/business-hero.jpg*', async route => {
    const url = new URL(route.request().url())
    if (url.search) return route.fallback()
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', path: path.resolve('public/docs-assets/global-out-of-service-hero.svg') })
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.origin === APP_ORIGIN && (
      url.pathname.startsWith('/docs-assets/') ||
      (url.search === '' && url.pathname === '/src/assets/images/business-hero.jpg')
    )) assets.push(url.pathname)
  })
  page.on('popup', () => { browserEvents.popups += 1 })
  page.on('frameattached', () => { browserEvents.frames += 1 })
  page.on('pageerror', error => browserEvents.pageErrors.push(error.message))
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    // Chromium can cancel the desktop image when the mobile picture source takes over.
    if (capture.project === 'mobile-chromium' && url.origin === APP_ORIGIN &&
      url.pathname === '/src/assets/images/home-hero-wide.webp' && request.failure()?.errorText === 'net::ERR_ABORTED') return
    browserEvents.failed.push({ origin: url.origin, pathname: url.pathname })
  })
  const expectedUrl = new URL(capture.route || manifest.route, APP_ORIGIN).href
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  if (isLoading(capture)) {
    await page.clock.runFor(700)
    await expect(page.locator(capture.selector)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("[data-doc-section='website-home']")).toHaveCount(0)
    return { fixture, requestLog, assets, browserEvents, expectedUrl, baseline: null }
  }

  await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [capture.selector] }, capture.selector, { imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section' })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  await page.waitForTimeout(750)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)

  if (isOffline(capture)) {
    const root = page.locator(capture.selector)
    await expect(root).toHaveAttribute('data-doc-state', 'offline')
    await expect(root.getByRole('heading', { name: 'No internet connection' })).toBeVisible()
    await expect(root.getByRole('button', { name: 'Refresh' })).toBeVisible()
    await expect(root.locator('img#not-network')).toHaveJSProperty('complete', true)
    await expect(page.locator("[data-doc-section='website-home']")).toHaveCount(0)
  }
  if (isNotFound(capture)) {
    const root = page.locator(capture.selector)
    await expect(root).toContainText('PAGE NOT FOUND')
    await expect(root.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
    expect(page.url()).toBe(expectedUrl)
  }
  if (isConsent(capture)) {
    const root = page.locator(capture.selector)
    await expect(root).toHaveAttribute('role', 'dialog')
    await expect(root.getByRole('button', { name: 'Opt Out' })).toBeVisible()
    await expect(root.getByRole('button', { name: 'Got it' })).toBeVisible()
    await expect(root.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/pages/terms_of_use')
    await expect(root.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/pages/privacy_policy')
    expect(await page.evaluate(() => localStorage.getItem('cookie_consent'))).toBeNull()
  }
  if (isOutOfService(capture)) {
    const root = page.locator(capture.selector)
    await expect(root.getByRole('heading', { name: 'SITE OUT OF SERVICE' })).toBeVisible()
    await expect(root.getByPlaceholder('Email')).toHaveValue('')
    await expect(root.getByRole('button', { name: 'Contact us' })).toBeVisible()
    await expect(root.getByRole('button', { name: 'Send' })).toBeVisible()
    await expect(root.locator('form')).toHaveCount(0)
    await expect(page.locator("[data-doc-section='global-cookie-consent']")).toHaveCount(0)
    await expect(page.locator("[data-doc-section='global-offline']")).toHaveCount(0)
    const translatedMarkup = await root.locator('h4, p').evaluateAll(nodes => nodes.flatMap(node => [...node.children].map(child => child.tagName)))
    expect(translatedMarkup).toEqual([])
  }

  const baseline = await storageShape(page)
  await page.evaluate(() => { window.__DOC_GLOBAL_GUARD__.storage = []; window.__DOC_GLOBAL_GUARD__.nav = [] })
  return { fixture, requestLog, assets, browserEvents, expectedUrl, baseline }
}

const settleLoading = async (page, runtime) => {
  await expect(page.locator("[data-doc-section='website-home']")).toBeVisible({ timeout: 15_000 })
  await expect(page.locator("[data-doc-section='global-boot-loading']")).toHaveCount(0)
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  await page.waitForTimeout(750)
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  runtime.baseline = await storageShape(page)
  await page.evaluate(() => { window.__DOC_GLOBAL_GUARD__.storage = []; window.__DOC_GLOBAL_GUARD__.nav = [] })
}

const assertIsolation = async (page, runtime, capture) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  const sockets = await assertWebSocketIsolation(page)
  const orderingSockets = sockets.filter(attempt => attempt.origin === 'wss://sockets-v3.orderingplus.com')
  expect(orderingSockets.length).toBeGreaterThan(0)
  expect(sockets.every(attempt => (
    (attempt.origin === APP_WS_ORIGIN && attempt.pathname === '/') ||
    (attempt.origin === 'wss://sockets-v3.orderingplus.com' && attempt.pathname === '/socket.io/')
  ))).toBe(true)
  expect(orderingSockets.every(attempt => attempt.queryKeys.includes('project') && !attempt.hasToken && !attempt.queryKeys.includes('token'))).toBe(true)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(await page.evaluate(() => window.__DOC_GLOBAL_GUARD__)).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [], frames: [], unload: [] })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.url()).toBe(runtime.expectedUrl)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(runtime.browserEvents).toEqual({
    popups: 0,
    frames: 0,
    pageErrors: [],
    failed: [{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }]
  })

  const assetCount = path => runtime.assets.filter(asset => asset === path).length
  expect(assetCount('/docs-assets/global-offline.svg')).toBe(isOutOfService(capture) ? 0 : 1)
  expect(assetCount('/src/assets/images/business-hero.jpg')).toBe(isOutOfService(capture) ? 1 : 0)
  expect(assetCount('/docs-assets/global-synthetic-logo.svg')).toBe(isOutOfService(capture) ? 1 : 0)
  expect(new Set(runtime.assets).size).toBe(runtime.assets.length)
}

test.describe('Website global states documentation', () => {
  test.describe.configure({ timeout: 60_000 })
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      if (isLoading(capture)) await settleLoading(page, runtime)
      await assertIsolation(page, runtime, capture)
    })
  }
})

test('Z5 M6: suspended site field responds beyond its painted bounds at phone width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 390, height: 1100 })
  const capture = manifest.captures.find(capture => isOutOfService(capture) && capture.project === testInfo.project.name)
  await setup(page, capture)
  expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
  const field = page.locator(capture.selector).getByRole('textbox', { name: 'Email' })
  const box = await field.boundingBox()
  expect(box.height).toBe(40)
  const send = await page.locator(capture.selector).getByRole('button', { name: 'Send' }).boundingBox()
  expect(send.x).toBeGreaterThan(box.x + box.width)
  for (const y of [box.y - 1, box.y + box.height + 1]) {
    await field.evaluate(input => input.blur())
    await page.mouse.click(box.x + box.width - 1, y)
    await expect(field).toBeFocused()
  }
})

test('Z5 B4: suspended site uses theme pieces and keeps the configured Send slot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  const capture = manifest.captures.find(capture => isOutOfService(capture) && capture.project === testInfo.project.name)
  await setup(page, capture, { trailingAction: { component: 'button', size: 'lg', color: 'danger', appearance: 'outline' } })
  const root = page.locator(capture.selector)
  const input = root.getByRole('textbox', { name: 'Email' })
  await expect(input).toHaveAttribute('data-slot', 'input')
  await input.fill('fixture@example.com')
  await expect(input).toHaveValue('fixture@example.com')
  await expect(root.getByRole('button', { name: 'Contact us' })).toHaveAttribute('data-slot', 'button')
  const send = root.getByRole('button', { name: 'Send' })
  await expect(send).toHaveAttribute('data-slot', 'button')
  await expect(send).toHaveCSS('height', '48px')
  await expect(send).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(send).toHaveCSS('color', 'rgb(198, 36, 66)')
})

test('Z5 R2-M03: the compact Send target stays in its lane next to the email', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 390, height: 1100 })
  const capture = manifest.captures.find(capture => isOutOfService(capture) && capture.project === testInfo.project.name)
  await setup(page, capture, {
    themeValues: {
      tokens: { space: { sm: 4 } },
      components: { button: { sizes: { xs: { height: 28, padding_x: 0, text: { size: 10 } } } } }
    },
    trailingAction: { component: 'button', size: 'xs', color: 'primary', appearance: 'solid' }
  })
  const root = page.locator(capture.selector)
  const field = root.getByRole('textbox', { name: 'Email' })
  const send = root.getByRole('button', { name: 'Send' })
  await expect(send).toHaveCSS('height', '28px')
  for (const direction of ['ltr', 'rtl']) {
    await root.evaluate((screen, dir) => { screen.style.direction = dir }, direction)
    const fieldBox = await field.boundingBox()
    const sendBox = await send.boundingBox()
    expect(sendBox.width).toBeLessThan(36)
    expect(sendBox.x < fieldBox.x).toBe(direction === 'rtl')
    const fieldEdge = direction === 'rtl' ? fieldBox.x + 1 : fieldBox.x + fieldBox.width - 1
    const center = sendBox.x + sendBox.width / 2
    const y = sendBox.y + sendBox.height / 2
    await page.mouse.click(fieldEdge, y)
    await expect(field).toBeFocused()
    for (const x of [center - 21.5, center + 21.5]) {
      expect(await send.evaluate((button, [x, y]) => button.contains(document.elementFromPoint(x, y)), [x, y])).toBe(true)
    }
  }
})
