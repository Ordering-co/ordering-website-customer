import { expect, test } from '@playwright/test'
import { APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('help-content-pages.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))
const allowedMarkup = new Set(['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM'])

const assertInertMarkupSource = body => {
  expect(body).not.toMatch(/<!--|&(?:#\d+|#x[0-9a-f]+|[a-z]+);|(?:https?:|data:|javascript:|\/\/)/i)
  for (const match of body.matchAll(/<\/?\s*([a-z0-9]+)([^>]*)>/gi)) {
    expect(allowedMarkup.has(match[1].toUpperCase())).toBe(true)
    expect(match[2].trim()).toBe('')
  }
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_HELP_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [], frames: [] }
  const safe = value => { const url = new URL(String(value || location.href), location.href); return { origin: url.origin, pathname: url.pathname } }
  window.open = value => { window.__DOC_HELP_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => { window.__DOC_HELP_GUARD__.nav.push({ method, ...safe(args[2]) }); return original(...args) }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) { window.__DOC_HELP_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) }); return Reflect.apply(original, this, args) }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) { window.__DOC_HELP_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) { window.__DOC_HELP_GUARD__.messages.push(String(args[1] ?? '')); return Reflect.apply(nativePost, window, args) }
  const nativeSet = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if ((this instanceof HTMLIFrameElement || this instanceof HTMLFrameElement) && name.toLowerCase() === 'src') window.__DOC_HELP_GUARD__.frames.push(safe(value))
    return Reflect.apply(nativeSet, this, [name, value])
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_HELP_GUARD__.geo.push(true); error?.({ code: 1 }) }
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  }
})

const storageShape = page => page.evaluate(() => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return {
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
    cookies: document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(Boolean).sort(),
    hasToken: token !== null,
    authSafe: token === null || (token.startsWith('docs-fixture-') && user?.session?.access_token === token)
  }
})

const verifyNoGift = condition => expect(condition).toEqual({
  conector: 'OR',
  conditions: [
    { attribute: 'products', conditions: [{ attribute: 'type', value: { condition: '=', value: ['item', 'service'] } }] },
    { attribute: 'cloned_order_id', value: { condition: '!=', value: null } },
    { attribute: 'delivery_type', value: 9 }
  ]
})

const verifyHelpOrdersQuery = request => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()]).toEqual(['orderBy', 'page', 'page_size', 'where'])
  expect(url.searchParams.get('orderBy')).toBe('-id')
  expect(url.searchParams.get('page')).toBe('0')
  expect(url.searchParams.get('page_size')).toBe('1')
  const where = JSON.parse(url.searchParams.get('where'))
  expect(where.conector).toBe('AND')
  expect(where.conditions[0]).toEqual({ attribute: 'status', value: [1, 11, 15] })
  verifyNoGift(where.conditions[1])
}

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const help = capture.id.startsWith('help-')
  const pagesList = capture.id.startsWith('pages-list-')
  const cms = capture.id.startsWith('content-page-')
  const missing = capture.id === 'content-page-not-found-desktop'
  const footer = capture.id === 'localized-footer-desktop'
  const helpOrders = routeFor(fixture, 'GET', 'orderBy=-id&page=0&page_size=1')
  const topics = [
    routeFor(fixture, 'GET', 'pages/helpOrder$'),
    routeFor(fixture, 'GET', 'pages/helpAccountAndPayment$'),
    routeFor(fixture, 'GET', 'pages/helpOrderingGuide$')
  ]
  const pages = routeFor(fixture, 'GET', 'pages$')
  const topicPage = routeFor(fixture, 'GET', 'pages/docs-help-topic$')
  const missingPage = routeFor(fixture, 'GET', 'pages/docs-missing-topic$')
  const exactFooter = fixture.routes.find(route => route.pattern.endsWith('pages/footer$'))
  const user = routeFor(fixture, 'GET', 'users/9301')
  const settings = routeFor(fixture, 'GET', 'api/frontend/settings')
  const paymethods = routeFor(fixture, 'GET', 'paymethods')
  const validation = routeFor(fixture, 'GET', 'validation_field_order_types')
  const languages = routeFor(fixture, 'GET', 'languages')
  const orderOptions = routeFor(fixture, 'GET', 'order_options')
  const addresses = routeFor(fixture, 'GET', 'users/9301/addresses')
  const banner = routeFor(fixture, 'GET', 'banner')
  const homeContent = routeFor(fixture, 'GET', 'homeContent2')
  const orderDetail = routeFor(fixture, 'GET', 'orders/docs-order-active$')
  const business = routeFor(fixture, 'GET', 'business/8101')
  const messages = routeFor(fixture, 'GET', 'orders/8701/messages$')
  const loyalty = routeFor(fixture, 'GET', 'loyalty_plans')
  const grouped = routeFor(fixture, 'GET', 'orderBy=-&where')

  helpOrders.assert = { count: help ? 1 : 0 }
  topics.forEach((route, index) => { route.assert = { count: capture.id.includes(['order-desktop', 'account-desktop', 'ordering-mobile'][index]) ? 1 : 0 } })
  pages.assert = { count: pagesList || footer ? 1 : 0 }
  topicPage.assert = { count: cms && !missing ? 1 : 0 }
  missingPage.assert = { count: missing ? 1 : 0 }
  exactFooter.assert = { count: 0 }
  if (footer) {
    pages.response.result = [{ id: 9902, name: 'Synthetic English Footer', slug: 'footer_en', enabled: true, public: true, body: '<p><strong>Synthetic project help</strong></p><p>Review the configured Website pages for more guidance.</p>' }]
    assertInertMarkupSource(pages.response.result[0].body)
  }
  fixture.firstLoad.theme.values.visibility.footer = footer

  user.assert = { count: help ? 1 : 0 }
  settings.assert = { count: 0 }
  paymethods.assert = { count: help ? 1 : 0 }
  validation.assert = { count: help ? 1 : 0 }
  languages.assert = { count: 1 }
  orderOptions.assert = { count: help ? 1 : 0 }
  addresses.assert = { count: 0 }
  banner.assert = { count: footer ? 1 : 0 }
  homeContent.assert = { count: footer ? 2 : 0 }
  for (const route of [orderDetail, business, messages, loyalty, grouped]) route.assert = { count: 0 }
  for (const bodyRoute of [...topics, topicPage]) {
    const body = bodyRoute.response?.result?.body
    if (body) assertInertMarkupSource(body)
  }
  assertFixturePrivacy(fixture)
  return fixture
}

const assertInertDom = async locator => {
  const audit = await locator.evaluate(root => {
    const forbiddenNodes = []
    const attributes = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.nodeType === Node.COMMENT_NODE) forbiddenNodes.push('#comment')
      else {
        if (!['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM'].includes(node.tagName)) forbiddenNodes.push(node.tagName)
        attributes.push(...[...node.attributes].map(attribute => `${node.tagName}:${attribute.name}`))
      }
    }
    return { forbiddenNodes, attributes, text: root.textContent }
  })
  expect(audit.forbiddenNodes).toEqual([])
  expect(audit.attributes).toEqual([])
  expect(audit.text).not.toMatch(/(?:https?:|data:|javascript:|\/\/)/i)
}

const setup = async (page, capture) => {
  const fixture = await fixtureFor(capture)
  const requestLog = createRequestLog()
  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: capture.id.startsWith('help-') })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  if (capture.id.startsWith('help-topic-')) {
    const controlId = capture.id.includes('account') ? 2 : capture.id.includes('ordering') ? 3 : 1
    await page.locator(`[data-doc-control='help-topic-${controlId}']`).click()
    const body = page.locator("[data-doc-section='help-topic-body']")
    await expect(body).toBeVisible({ timeout: 30_000 })
    await assertInertDom(body)
    if (capture.id === 'help-topic-account-desktop') {
      await expect(body).toContainText('Review the account and payment choices returned by this Website.')
      await page.evaluate(() => {
        window.scrollTo(0, 0)
        let node = document.querySelector("[data-doc-section='help']")
        while (node) {
          if ('scrollLeft' in node) node.scrollLeft = 0
          node = node.parentElement
        }
      })
    }
  } else if (capture.id.startsWith('help-')) {
    await expect(page.locator("[data-doc-section='help-last-order']")).toBeVisible({ timeout: 30_000 })
  } else if (capture.id.startsWith('pages-list-')) {
    const root = page.locator("[data-doc-section='pages-list']")
    await expect(root.locator("[data-doc-item='configured-page']")).toHaveCount(1)
    await expect(root.locator("[data-doc-item='standard-page']")).toHaveCount(10)
    const href = await root.locator("[data-doc-item='configured-page']").getAttribute('href')
    expect(new URL(href, page.url()).origin).toBe(new URL(page.url()).origin)
    expect(new URL(href, page.url()).pathname).toBe('/pages/docs-help-topic')
  } else if (capture.id.startsWith('content-page-') && !capture.id.includes('not-found')) {
    const body = page.locator("[data-doc-section='content-page-body']")
    await expect(body).toBeVisible({ timeout: 30_000 })
    await assertInertDom(body)
  } else if (capture.id.includes('not-found')) {
    const root = page.locator("[data-doc-section='content-page']")
    await expect(root).toContainText('Sorry, the selected page was not found.')
    await expect(root.getByRole('button', { name: 'Go to pages list' })).toBeVisible()
    await expect(root).not.toContainText('Synthetic page not found.')
  } else {
    const body = page.locator("[data-doc-section='localized-footer-content']")
    await expect(body).toBeVisible({ timeout: 30_000 })
    await assertInertDom(body)
    await body.scrollIntoViewIfNeeded()
  }

  await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [capture.selector] }, capture.selector, { imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section' })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  if (!capture.id.startsWith('help-')) {
    await page.waitForTimeout(750)
    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  }
  const helpRequests = requestLog.matched.filter(item => item.pattern.includes('orderBy=-id&page=0&page_size=1'))
  if (capture.id.startsWith('help-')) {
    expect(helpRequests).toHaveLength(1)
    verifyHelpOrdersQuery(helpRequests[0])
  } else expect(helpRequests).toEqual([])
  const baseline = await storageShape(page)
  expect(baseline.authSafe).toBe(true)
  expect(baseline.hasToken).toBe(capture.id.startsWith('help-'))
  await page.evaluate(() => { window.__DOC_HELP_GUARD__.storage = []; window.__DOC_HELP_GUARD__.nav = [] })
  return { fixture, requestLog, baseline }
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
  expect(orderingSockets.every(attempt => attempt.queryKeys.includes('project') && attempt.hasToken === capture.id.startsWith('help-'))).toBe(true)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  expect(await page.evaluate(() => window.__DOC_HELP_GUARD__)).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [], frames: [] })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}

test.describe('Help and configured content documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime, capture)
    })
  }

  test.skip('unsafe CMS markup and active links remain rejected by fixture and DOM contracts', async () => {})
  test.skip('footer language fallback remains assertion-only because it requires a bounded failed read before fallback', async () => {})
  test.skip('help-card and not-found redirect actions remain untouched', async () => {})
  test.skip('production page GET plugin actions are never exercised', async () => {})
})
