import { expect, test } from '@playwright/test'
import { APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertFixtureRequests, assertNoUnknownRequests, assertWebSocketIsolation, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('messages.manifest')
const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, fragment) => fixture.routes.find(route => route.method === method && route.pattern.includes(fragment))

const syntheticMessages = (orderId, lastId = 9802, driver = false, date = '2026-08-10', businessName = 'Synthetic Kitchen Team') => [
  {
    id: lastId - 1,
    order_id: orderId,
    type: 2,
    can_see: driver ? '0,3,4' : '0,2,3',
    author_id: 9301,
    author: { id: 9301, name: 'Synthetic Customer', lastname: '', level: 3 },
    comment: 'Synthetic order question.',
    created_at: `${date} 15:10:00`,
    read: true
  },
  {
    id: lastId,
    order_id: orderId,
    type: 2,
    can_see: driver ? '0,3,4' : '0,2,3',
    author_id: driver ? 9501 : 9401,
    author: { id: driver ? 9501 : 9401, name: driver ? 'Synthetic Driver' : businessName, lastname: '', level: driver ? 4 : 2 },
    comment: 'Synthetic order update.',
    created_at: `${date} 15:20:00`,
    read: false
  }
]

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const inbox = capture.route === undefined || capture.route === '/messages'
  const empty = capture.id === 'messages-empty-desktop'
  const ended = capture.id === 'messages-ended-desktop'
  const driver = capture.id === 'order-driver-chat-desktop'
  const orders = routeFor(fixture, 'GET', 'orderBy=last_direct_message_at')
  const inboxMessages = routeFor(fixture, 'GET', 'orders/8801/messages$')
  const endedMessages = routeFor(fixture, 'GET', 'orders/8802/messages$')
  const inboxRead = routeFor(fixture, 'GET', 'orders/8801/messages/9802/read')
  const endedRead = routeFor(fixture, 'GET', 'orders/8802/messages/9812/read')
  const detailRead = routeFor(fixture, 'GET', 'orders/8701/messages/9802/read')
  const detailOrder = routeFor(fixture, 'GET', 'orders/docs-order-active$')
  const detailBusiness = routeFor(fixture, 'GET', 'business/8101')
  const detailMessages = routeFor(fixture, 'GET', 'orders/8701/messages$')
  const messagesTwo = routeFor(fixture, 'GET', 'orders/8702/messages$')
  const messagesUndefined = routeFor(fixture, 'GET', 'orders/undefined/messages')
  const loyalty = routeFor(fixture, 'GET', 'loyalty_plans')
  const groupedOrders = routeFor(fixture, 'GET', 'orders\\?orderBy=-')

  orders.assert = { count: inbox ? 1 : 0 }
  inboxMessages.assert = { count: inbox && !empty && !ended ? 1 : 0 }
  endedMessages.assert = { count: ended ? 1 : 0 }
  inboxRead.assert = { count: inbox && !empty && !ended ? 1 : 0 }
  endedRead.assert = { count: ended ? 1 : 0 }
  detailRead.assert = { count: inbox ? 0 : 2 }
  detailOrder.assert = { count: inbox ? 0 : 1 }
  detailBusiness.assert = { count: inbox ? 0 : 1 }
  detailMessages.assert = { count: inbox ? 0 : 1 }
  messagesTwo.assert = { count: 0 }
  messagesUndefined.assert = { count: 0 }
  loyalty.assert = { count: empty ? 0 : 1 }
  groupedOrders.assert = { count: 0 }

  if (empty) {
    orders.response.result = []
    orders.response.pagination = { current_page: 1, page_size: 0, total_pages: 1, total: 0, from: 0, to: 0 }
  }
  if (ended) {
    const endedOrder = orders.response.result.find(order => order.id === 8802)
    orders.response.result = [endedOrder]
    orders.response.pagination = { current_page: 1, page_size: 10, total_pages: 1, total: 1, from: 1, to: 1 }
    endedMessages.response.result = syntheticMessages(8802, 9812, false, '2026-08-11', 'Fixture Bakery Team')
  }
  if (!inbox) {
    detailMessages.response.result = syntheticMessages(8701, 9802, driver, '2026-08-11')
    detailOrder.response.result.created_at = '2026-08-11 14:00:00'
    detailOrder.response.result.unread_count = 1
    detailOrder.response.result.customer_id = 9301
    detailOrder.response.result.paymethod_id = null
    if (driver) {
      detailOrder.response.result.driver_id = 9501
      detailOrder.response.result.driver = { id: 9501, name: 'Synthetic Driver', lastname: 'Synthetic', photo: '', location: null }
    }
  }

  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = page => page.addInitScript(() => {
  window.__DOC_MESSAGES_GUARD__ = { nav: [], open: [], storage: [], forms: [], messages: [], geo: [] }
  const safe = value => { const url = new URL(String(value || location.href), location.href); return { origin: url.origin, pathname: url.pathname } }
  window.open = value => { window.__DOC_MESSAGES_GUARD__.open.push(safe(value)); return null }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history)
    history[method] = (...args) => { window.__DOC_MESSAGES_GUARD__.nav.push({ method, ...safe(args[2]) }); return original(...args) }
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) { window.__DOC_MESSAGES_GUARD__.storage.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] == null ? null : String(args[0]) }); return Reflect.apply(original, this, args) }
  }
  for (const method of ['submit', 'requestSubmit']) {
    const original = HTMLFormElement.prototype[method]
    HTMLFormElement.prototype[method] = function (...args) { window.__DOC_MESSAGES_GUARD__.forms.push({ method, ...safe(this.action) }); if (method === 'requestSubmit') return Reflect.apply(original, this, args) }
  }
  const nativePost = window.postMessage
  window.postMessage = function (...args) { window.__DOC_MESSAGES_GUARD__.messages.push(String(args[1] ?? '')); return Reflect.apply(nativePost, window, args) }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_, error) => { window.__DOC_MESSAGES_GUARD__.geo.push(true); error?.({ code: 1 }) }
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
    hasLegacyCustomer: localStorage.getItem('user-customer') !== null,
    tokenSafe: token?.startsWith('docs-fixture-') === true,
    userSafe: user?.id === 9301 && user?.session?.access_token === token
  }
})

const verifyOrdersQuery = request => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect([...url.searchParams.keys()]).toEqual(['orderBy', 'page', 'page_size', 'where'])
  expect(url.searchParams.get('orderBy')).toBe('last_direct_message_at')
  expect(url.searchParams.get('page')).toBe('0')
  expect(url.searchParams.get('page_size')).toBe('10')
  const where = JSON.parse(url.searchParams.get('where'))
  expect(where.conector).toBe('AND')
  expect(where.conditions[0]).toEqual({ attribute: 'status', value: [...Array(27).keys()] })
  expect(where.conditions[1]).toEqual({
    conector: 'OR',
    conditions: [
      { attribute: 'products', conditions: [{ attribute: 'type', value: { condition: '=', value: ['item', 'service'] } }] },
      { attribute: 'cloned_order_id', value: { condition: '!=', value: null } },
      { attribute: 'delivery_type', value: 9 }
    ]
  })
}

const setup = async (page, capture) => {
  const fixture = await fixtureFor(capture)
  const requestLog = createRequestLog()
  const readMetadata = []
  const mobile = capture.project === 'mobile-chromium'
  if (mobile) await page.setViewportSize({ width: 390, height: 1100 })
  await page.clock.install({ time: new Date('2026-08-11T12:00:00-05:00') })
  await installBrowserGuards(page)
  let fileChooserCount = 0
  page.on('filechooser', () => { fileChooserCount += 1 })
  page.on('request', request => {
    const url = new URL(request.url())
    if (!/\/messages\/\d+\/read$/.test(url.pathname)) return
    const headers = request.headers()
    readMetadata.push({
      pathname: url.pathname,
      hasAuthorization: Boolean(headers.authorization),
      hasApp: Boolean(headers['x-app-x']),
      hasInternal: Boolean(headers['x-internal-product-x']),
      hasSocket: Boolean(headers['x-socket-id-x'])
    })
  })
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  const route = capture.route || manifest.route
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  if (route === '/messages') {
    const root = page.locator("[data-doc-section='messages-inbox']")
    await expect(root).toBeVisible({ timeout: 30_000 })
    if (capture.id === 'messages-empty-desktop') {
      await expect(root.locator("[data-doc-section='messages-empty']")).toBeVisible()
      await expect(root).toContainText('No conversations yet')
      await expect(root.getByRole('button', { name: 'Go to home' })).toBeVisible()
    } else {
      await expect(root.locator("[data-doc-item='messages-order'][data-doc-state='selected']")).toHaveCount(1)
      await expect(root.locator("[data-doc-section='order-messages'][data-doc-surface='inbox'][data-doc-participant='business']")).toBeVisible()
      await expect(root).toContainText('Synthetic order question.')
      await expect(root).toContainText('Synthetic order update.')
      if (capture.id === 'messages-ended-desktop') {
        await expect(root.locator("[data-doc-section='messages-ended-notice']")).toBeVisible()
        await expect(root.locator("[data-doc-section='messages-composer']")).toHaveCount(0)
      } else {
        await expect(root.locator("[data-doc-section='messages-composer']")).toBeVisible()
        await expect(root.locator("[data-doc-item='messages-order'][data-doc-state='selected'] [data-doc-section='messages-unread-count']")).toHaveCount(0)
      }
    }
    const ordersRequest = requestLog.matched.filter(item => item.pattern.includes('orderBy=last_direct_message_at'))
    expect(ordersRequest).toHaveLength(1)
    verifyOrdersQuery(ordersRequest[0])
    const messageReads = requestLog.matched.filter(item => /\/orders\/\d+\/messages$/.test(new URL(item.url, 'https://api.docs.invalid').pathname))
    expect(messageReads.every(item => new URL(item.url, 'https://api.docs.invalid').search === '')).toBe(true)
  } else {
    const control = page.locator(`[data-doc-control='order-message-${capture.id.includes('driver') ? 'driver' : 'business'}']`)
    await expect(control).toBeVisible({ timeout: 30_000 })
    await control.click()
    const conversation = page.locator("[data-doc-section='order-messages-pane'] [data-doc-section='order-messages']")
    await expect(conversation).toBeVisible()
    await expect(conversation).toHaveAttribute('data-doc-participant', capture.id.includes('driver') ? 'driver' : 'business')
    await expect(conversation).toContainText('Synthetic order question.')
    await expect(conversation).toContainText('Synthetic order update.')
    await expect(conversation.locator("[data-doc-section='messages-composer']")).toBeVisible()
    if (capture.id === 'order-driver-chat-desktop') {
      await page.evaluate(() => {
        window.scrollTo(0, 0)
        let node = document.querySelector("[data-doc-section='order-messages'][data-doc-participant='driver']")
        while (node) {
          if ('scrollTop' in node) node.scrollTop = 0
          node = node.parentElement
        }
      })
      await expect(conversation.getByRole('heading', { name: /^Synthetic Driver/ })).toBeVisible()
      await expect(conversation).toContainText('Synthetic Driver (Driver)')
    }
  }

  await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [capture.selector] }, capture.selector, { imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section' })
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  const baseline = await storageShape(page)
  expect(baseline.hasLegacyCustomer).toBe(false)
  await page.evaluate(() => { window.__DOC_MESSAGES_GUARD__.storage = []; window.__DOC_MESSAGES_GUARD__.nav = [] })
  return { fixture, requestLog, baseline, readMetadata, fileChooserCount: () => fileChooserCount }
}

const assertIsolation = async (page, runtime) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(attempt => attempt.origin === 'wss://sockets-v3.orderingplus.com' && attempt.pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(attempt => (
    (attempt.origin === APP_WS_ORIGIN && attempt.pathname === '/') ||
    (attempt.origin === 'wss://sockets-v3.orderingplus.com' && attempt.pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(attempt => attempt.origin === 'wss://sockets-v3.orderingplus.com').every(attempt => attempt.hasToken && attempt.queryKeys.includes('project') && attempt.queryKeys.includes('token'))).toBe(true)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET')).toEqual([])
  const readMarks = runtime.requestLog.matched.filter(item => /\/messages\/\d+\/read$/.test(new URL(item.url, 'https://api.docs.invalid').pathname))
  expect(readMarks.every(item => item.method === 'GET' && item.postData == null)).toBe(true)
  expect(runtime.readMetadata).toHaveLength(readMarks.length)
  expect(runtime.readMetadata.every(item => item.hasAuthorization && item.hasApp && item.hasInternal && item.hasSocket)).toBe(true)
  expect(runtime.requestLog.matched.filter(item => item.method !== 'GET' && /tracking_events|reorder|review|confirm|place|wallet|paymethod/.test(item.url))).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_MESSAGES_GUARD__)
  expect(guard).toEqual({ nav: [], open: [], storage: [], forms: [], messages: [], geo: [] })
  expect(runtime.fileChooserCount()).toBe(0)
  expect(await page.locator("input[type='file']").evaluateAll(inputs => inputs.every(input => input.files?.length === 0 && input.value === ''))).toBe(true)
  expect(await storageShape(page)).toEqual(runtime.baseline)
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
}

test.describe('Order messages documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertIsolation(page, runtime)
    })
  }

  test.skip('message text send remains intercepted-only until a redacted request observer is dedicated to this package', async () => {})
  test.skip('message image selection, preview, and upload remain source-only', async () => {})
  test.skip('cross-user order and message IDs are never probed', async () => {})
  test.skip('message-list and history errors remain private because list errors can look empty', async () => {})
})
