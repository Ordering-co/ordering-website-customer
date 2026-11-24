import { expect, test } from '@playwright/test'
import { APP_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture, setSharedReadLimit } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('website-modes.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const businessListPattern = '^/v400/en/docsmarket/businesses(?:\\?.*)?$'
const franchisePattern = '^/v400/en/docsmarket/franchises/9901(?:\\?.*)?$'
const businessPattern = '^/v400/en/docsmarket/business/(?:synthetic-single-store|synthetic-franchise-store|synthetic-kiosk-store|synthetic-alias)(?:\\?.*)?$'
const businessTypesPattern = '^/v400/en/docsmarket/business_types(?:\\?.*)?$'
const isMarketplace = capture => capture.id.includes('marketplace')
const isSingleStore = capture => capture.id.includes('single-store')
const isFranchise = capture => capture.id.includes('franchise')
const isKiosk = capture => capture.id.includes('kiosk')
const matched = (log, method, pattern) => log.matched.filter(item => item.method === method && item.pattern === pattern)
const expectedPath = capture => isMarketplace(capture)
  ? '/search'
  : isSingleStore(capture)
    ? '/store/synthetic-single-store'
    : isFranchise(capture)
      ? '/store/synthetic-franchise-store'
      : '/'
const localOp = (method, key = null) => ({ method, storage: 'local', key })
const sessionOp = (method, key = null) => ({ method, storage: 'session', key })
const lazyOp = modulePath => sessionOp('setItem', `retry-lazy-refreshed:() => import("${modulePath}")`)
const sortedStorageOperations = operations => [...operations].sort((left, right) => (
  `${left.storage}:${left.method}:${left.key ?? ''}`.localeCompare(`${right.storage}:${right.method}:${right.key ?? ''}`)
))
const expectedInitializationStorage = capture => {
  const common = [
    localOp('clear'),
    sessionOp('clear'),
    localOp('setItem', 'options'),
    localOp('removeItem', 'debug'),
    lazyOp('/src/components/ScrollToTop/index.js'),
    lazyOp('/src/components/ListenPageChanges/index.js'),
    lazyOp('/src/components/HelmetTags/index.js')
  ]
  if (isMarketplace(capture)) {
    const mode = [lazyOp('/src/pages/BusinessesList/index.js'), localOp('removeItem', 'single_business')]
    return capture.project === 'desktop-chromium'
      ? [...common, localOp('removeItem', 'project_name'), ...mode]
      : [...common, ...mode, localOp('removeItem', 'project_name')]
  }
  if (isSingleStore(capture)) {
    return [
      ...common,
      lazyOp('/src/pages/BusinessProductsList/index.js'),
      localOp('removeItem', 'project_name'),
      localOp('removeItem', 'header_store_logo:synthetic-single-store')
    ]
  }
  if (isFranchise(capture)) {
    return [
      ...common,
      lazyOp('/src/pages/BusinessesList/index.js'),
      localOp('setItem', 'single_business'),
      lazyOp('/src/pages/BusinessProductsList/index.js'),
      localOp('removeItem', 'project_name')
    ]
  }
  return [...common, lazyOp('/src/pages/Home/index.js'), localOp('removeItem', 'project_name')]
}

const configureFixture = (base, capture) => {
  const fixture = clone(base)
  setSharedReadLimit(fixture, 'languages', 2)
  const websiteSite = fixture.firstLoad.theme.values.site
  fixture.firstLoad.theme.values.images = {
    ...fixture.firstLoad.theme.values.images,
    'empty.no_internet': new URL('/docs-assets/global-offline.svg', APP_ORIGIN).href
  }
  Object.assign(fixture.runtimeConfig, { use_marketplace: false, use_kiosk: false, businessSlug: '', franchiseSlug: '' })
  Object.assign(websiteSite, { mode: 'marketplace', business_slug: '', franchise_slug: '' })
  if (isSingleStore(capture)) Object.assign(websiteSite, { mode: 'single_store', business_slug: 'synthetic-single-store' })
  if (isFranchise(capture)) fixture.runtimeConfig.franchiseSlug = '9901'
  if (isKiosk(capture)) Object.assign(fixture.runtimeConfig, { use_kiosk: true, businessSlug: 'synthetic-kiosk-store' })
  const listRoute = fixture.routes.find(route => route.pattern === businessListPattern)
  const menuRoute = fixture.routes.find(route => route.pattern === businessPattern)
  if (isFranchise(capture)) listRoute.response.result.reverse()
  const target = isFranchise(capture)
    ? { id: 9802, slug: 'synthetic-franchise-store', name: 'Synthetic Franchise Kitchen', address: '200 Synthetic Mode Avenue' }
    : isKiosk(capture)
      ? { id: 9803, slug: 'synthetic-kiosk-store', name: 'Synthetic Kiosk Kitchen', address: '300 Synthetic Mode Road' }
      : { id: 9801, slug: 'synthetic-single-store', name: 'Synthetic Mode Kitchen', address: '100 Synthetic Mode Street' }
  Object.assign(menuRoute.response.result, target)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  const safe = value => {
    const url = new URL(String(value || location.href), location.href)
    return { origin: url.origin, pathname: url.pathname, queryKeys: [...new Set([...url.searchParams.keys()])].sort() }
  }
  window.__DOC_MODE_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [], frames: [], unload: [] }
  window.open = value => { window.__DOC_MODE_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => {
      window.__DOC_MODE_GUARD__.nav.push({ method, ...safe(args[2]) })
      return original(...args)
    }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) {
      window.__DOC_MODE_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) })
      return Reflect.apply(original, this, args)
    }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) {
      window.__DOC_MODE_GUARD__.forms.push({ method, ...safe(this.action) })
      if (method === 'requestSubmit') return Reflect.apply(original, this, args)
    }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) {
    window.__DOC_MODE_GUARD__.messages.push(String(args[1] ?? ''))
    return Reflect.apply(nativePost, window, args)
  }
  const nativeSet = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if ((this instanceof HTMLIFrameElement || this instanceof HTMLFrameElement) && name.toLowerCase() === 'src') window.__DOC_MODE_GUARD__.frames.push(safe(value))
    return Reflect.apply(nativeSet, this, [name, value])
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_MODE_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
  for (const eventName of ['beforeunload', 'pagehide']) window.addEventListener(eventName, () => window.__DOC_MODE_GUARD__.unload.push(eventName))
})

const storageShape = page => page.evaluate(() => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
  cookies: document.cookie.split(';').map(value => value.trim()).filter(Boolean).sort()
}))

const verifyListQuery = (request, franchise = false) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()]).toEqual(franchise
    ? ['order_type_id', 'location', 'page', 'page_size', 'orderBy', 'params', 'where']
    : ['order_type_id', 'location', 'page', 'page_size', 'orderBy', 'params'])
  expect(url.searchParams.get('order_type_id')).toBe('2')
  expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 30.2672, lng: -97.7431 })
  expect(url.searchParams.get('page')).toBe('1')
  expect(url.searchParams.get('page_size')).toBe('25')
  expect(url.searchParams.get('orderBy')).toBe('distance')
  expect(url.searchParams.get('params')).toContain('id,name')
  if (franchise) {
    expect(JSON.parse(url.searchParams.get('where'))).toEqual({
      conector: 'AND',
      conditions: [{ attribute: 'franchise_id', value: '9901' }]
    })
  } else expect(url.searchParams.has('where')).toBe(false)
}

const verifyBusinessTypesQuery = request => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()]).toEqual(['where', 'location', 'order_type_id'])
  expect(JSON.parse(url.searchParams.get('where'))).toEqual([{ attribute: 'enabled', value: true }])
  expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 30.2672, lng: -97.7431 })
  expect(url.searchParams.get('order_type_id')).toBe('2')
}

const verifyBusinessQuery = request => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect(url.searchParams.get('version')).toBe('v2')
  expect(url.searchParams.get('type')).toBe('2')
  expect(url.searchParams.get('location')).toBe('30.2672,-97.7431')
  const fields = (url.searchParams.get('params') || '').split(',')
  expect(fields).toContain('id')
  expect(fields).toContain('name')
}

const setup = async (page, capture) => {
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  const fixture = configureFixture(await loadFixture(manifest.fixture), capture)
  const requestLog = createRequestLog()
  const browserEvents = { popups: 0, frames: 0, pageErrors: [], failed: [] }
  const assets = []
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, requestLog)
  page.on('popup', () => { browserEvents.popups += 1 })
  page.on('frameattached', frame => { if (frame !== page.mainFrame()) browserEvents.frames += 1 })
  page.on('pageerror', error => browserEvents.pageErrors.push(error.message))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.origin === APP_ORIGIN && url.pathname === '/docs-assets/global-offline.svg') assets.push(url.pathname)
  })
  const { api, project } = fixture.runtimeConfig
  const languagePath = `/${api.version}/${api.language}/${project}/languages`
  const languageRead = fixture.routes.find(route => route.sharedFallback && new RegExp(route.pattern).test(languagePath))
  const languageQuery = Object.entries(languageRead.query)
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    const cancelledLanguageRead = request.method() === 'GET' &&
      url.origin === new URL(api.url).origin &&
      url.pathname === languagePath &&
      url.searchParams.size === languageQuery.length &&
      languageQuery.every(([key, value]) => url.searchParams.get(key) === value) &&
      request.failure()?.errorText === 'net::ERR_ABORTED'
    if (url.origin !== APP_ORIGIN && !cancelledLanguageRead) {
      browserEvents.failed.push({ origin: url.origin, pathname: url.pathname })
    }
  })
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await waitForDocumentationReady(page, manifest.readiness, capture.selector)

  if (isMarketplace(capture)) {
    const root = page.locator(capture.selector)
    await expect(root).toHaveAttribute('data-doc-state', 'results', { timeout: 15_000 })
    await expect(root.getByText('Synthetic Single Store')).toBeVisible()
    await expect(root.getByText('Synthetic Franchise Store')).toBeVisible()
    await expect(page).toHaveURL(/\/search$/)
  } else if (isKiosk(capture)) {
    const root = page.locator(capture.selector)
    await expect(root.getByRole('heading', { name: 'Shop easily, quickly, and securely.' })).toBeVisible()
    await expect(root.getByText('100 Synthetic Market Street')).toBeVisible()
    await expect(root.getByRole('button', { name: 'Search' })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  } else {
    const root = page.locator("[data-doc-section='business-menu'][data-doc-state]")
    await expect(root).toHaveAttribute('data-doc-state', 'results')
    await expect(root.getByRole('heading', { name: /Synthetic .*Kitchen|Synthetic Mode Kitchen/, level: 1 })).toBeVisible()
    await expect(root.getByRole('heading', { name: 'Mode favorites', level: 2 })).toBeVisible()
    if (isFranchise(capture)) await expect(page.getByText(/change store/i).first()).toBeVisible()
  }

  const settledUrl = new URL(page.url())
  expect(settledUrl.pathname).toBe(expectedPath(capture))
  expect(settledUrl.search).toBe('')
  expect(settledUrl.hash).toBe('')

  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  await page.waitForTimeout(750)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  const initialization = await page.evaluate(() => JSON.parse(JSON.stringify(window.__DOC_MODE_GUARD__)))
  const baseline = await storageShape(page)
  await page.evaluate(() => { window.__DOC_MODE_GUARD__.storage = []; window.__DOC_MODE_GUARD__.nav = [] })
  return { fixture, requestLog, browserEvents, assets, initialization, baseline, expectedUrl: page.url() }
}

const assertIsolation = async (page, runtime, capture) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  const sockets = await assertWebSocketIsolation(page)
  const ordering = sockets.filter(item => item.origin === 'wss://sockets-v3.orderingplus.com')
  expect(ordering.length).toBeGreaterThan(0)
  expect(ordering.every(item => item.queryKeys.includes('project') && !item.hasToken && !item.queryKeys.includes('token'))).toBe(true)
  expect(await page.evaluate(() => window.__DOC_MODE_GUARD__)).toEqual({
    nav: [],
    open: [],
    storage: [],
    forms: [],
    messages: [],
    geo: [],
    frames: [],
    unload: []
  })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.url()).toBe(runtime.expectedUrl)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  expect(runtime.browserEvents).toEqual({ popups: 0, frames: 0, pageErrors: [], failed: [{ origin: 'https://cdn.onesignal.com', pathname: '/sdks/OneSignalSDK.js' }] })
  expect(runtime.assets).toEqual(['/docs-assets/global-offline.svg'])

  const list = matched(runtime.requestLog, 'GET', businessListPattern)
  const franchise = matched(runtime.requestLog, 'GET', franchisePattern)
  const business = matched(runtime.requestLog, 'GET', businessPattern)
  const businessTypes = matched(runtime.requestLog, 'GET', businessTypesPattern)
  const expectedInitializationNav = isSingleStore(capture)
    ? [{ method: 'replaceState', origin: APP_ORIGIN, pathname: '/store/synthetic-single-store', queryKeys: [] }]
    : isFranchise(capture)
      ? [{ method: 'pushState', origin: APP_ORIGIN, pathname: '/store/synthetic-franchise-store', queryKeys: [] }]
      : []
  expect(runtime.initialization.nav).toEqual(expectedInitializationNav)
  expect(sortedStorageOperations(runtime.initialization.storage)).toEqual(sortedStorageOperations(expectedInitializationStorage(capture)))
  if (isMarketplace(capture)) {
    expect(list).toHaveLength(1); verifyListQuery(list[0]); expect(franchise).toHaveLength(0); expect(business).toHaveLength(0)
    expect(businessTypes).toHaveLength(1); verifyBusinessTypesQuery(businessTypes[0])
    expect(runtime.initialization.storage.filter(item => item.key === 'single_business')).toEqual([{ method: 'removeItem', storage: 'local', key: 'single_business' }])
  } else if (isFranchise(capture)) {
    expect(list).toHaveLength(1); verifyListQuery(list[0], true); expect(franchise).toHaveLength(1); expect(business).toHaveLength(1); verifyBusinessQuery(business[0])
    expect(businessTypes).toHaveLength(1); verifyBusinessTypesQuery(businessTypes[0])
    expect(runtime.initialization.storage.filter(item => item.key === 'single_business')).toEqual([{ method: 'setItem', storage: 'local', key: 'single_business' }])
  } else if (isKiosk(capture)) {
    expect(list).toHaveLength(0); expect(franchise).toHaveLength(0); expect(business).toHaveLength(0); expect(businessTypes).toHaveLength(0)
  } else {
    expect(list).toHaveLength(0); expect(franchise).toHaveLength(0); expect(business).toHaveLength(1); verifyBusinessQuery(business[0])
    expect(businessTypes).toHaveLength(0)
  }
  expect(runtime.initialization.storage.filter(item => item.key === 'business_schedule')).toEqual([])
  expect(runtime.initialization.storage.filter(item => item.key === 'google_rwg_redirect_business_id')).toEqual([])
  expect(runtime.initialization.storage.filter(item => item.key === 'table_number')).toEqual([])
}

test.describe('Website presentation modes documentation', () => {
  test.describe.configure({ timeout: 60_000 })
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime, capture)
    })
  }
})
