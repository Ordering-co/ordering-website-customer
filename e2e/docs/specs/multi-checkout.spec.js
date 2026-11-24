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

const manifest = await loadManifest('multi-checkout.manifest')
const groupPattern = '^/v400/en/docsmarket/cart_groups/synthetic-cart-group-4401(?:\\?.*)?$'
const preparePattern = '^/v400/en/docsmarket/cart_groups/synthetic-cart-group-4401/prepare(?:\\?.*)?$'
const placePattern = '^/v400/en/docsmarket/cart_groups/synthetic-cart-group-4401/place$'
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const deliveryOptionsPattern = '^/v400/en/docsmarket/delivery_options(?:\\?.*)?$'
const loyaltyPattern = '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$'
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'
const userWalletsPattern = '^/v400/en/docsmarket/users/9201/wallets(?:\\?.*)?$'

const fixtureRoute = (fixture, method, pattern) => fixture.routes.find(
  route => route.method === method && route.pattern === pattern
)

const matchingRequests = (log, method, pattern) => log.matched.filter(
  request => request.method === method && request.pattern === pattern
)

const product = ({ id, businessId, name, total, quantity = 1 }) => ({
  id,
  code: `DOCS-MULTI-CHECKOUT-LINE-${id}`,
  business_id: businessId,
  category_id: businessId + 10,
  name,
  price: total / quantity,
  total,
  quantity,
  balance: quantity,
  stock: 20,
  inventoried: false,
  images: '/e2e/docs/assets/synthetic-business-header.svg',
  comment: null,
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {},
  options: {}
})

const cart = ({ uuid, businessId, businessName, businessAddress, productId, productName, total, ...overrides }) => ({
  uuid,
  business_id: businessId,
  user_id: 9201,
  status: 0,
  type: 2,
  valid: true,
  valid_products: true,
  valid_schedule: true,
  valid_address: true,
  valid_preorder: true,
  valid_minimum: true,
  valid_maximum: true,
  minimum: 0,
  maximum: 100,
  subtotal: total,
  subtotal_with_discount: total,
  discount: 0,
  delivery_price_with_discount: 0,
  driver_tip: 0,
  tax: 0,
  taxes: [],
  fees: [],
  offers: [],
  metafields: [],
  wallets: [],
  total,
  balance: total,
  paymethod_id: null,
  paymethod_data: {},
  products: [product({ id: productId, businessId, name: productName, total })],
  business: {
    id: businessId,
    slug: `synthetic-business-${businessId}`,
    name: businessName,
    address: businessAddress,
    vertical: 'food',
    tax_type: 2,
    configs: []
  },
  ...overrides
})

const carts = () => [
  cart({
    uuid: 'synthetic-multi-cart-a',
    businessId: 8401,
    businessName: 'Synthetic North Kitchen',
    businessAddress: '400 Synthetic North Avenue',
    productId: 8411,
    productName: 'Synthetic North Bowl',
    total: 12
  }),
  cart({
    uuid: 'synthetic-multi-cart-b',
    businessId: 8501,
    businessName: 'Fixture South Kitchen',
    businessAddress: '500 Fixture South Street',
    productId: 8511,
    productName: 'Fixture South Wrap',
    total: 9
  })
]

const group = () => ({
  uuid: 'synthetic-cart-group-4401',
  status: 'pending',
  user_id: 9201,
  total: 21,
  balance: 21,
  carts: carts(),
  wallets: [],
  payment_events: []
})

const paymethods = () => [
  { id: 1, name: 'Cash', gateway: 'cash', enabled: true, sandbox: true, data: {} },
  { id: 2, name: 'Card on delivery', gateway: 'card_delivery', enabled: true, sandbox: true, data: {} }
]

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_MULTI_CHECKOUT_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: [],
      navigationAttempts: []
    }
    window.open = (...args) => {
      window.__DOC_MULTI_CHECKOUT_GUARD__.windowOpenAttempts.push(String(args[0] ?? ''))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_MULTI_CHECKOUT_GUARD__.formSubmitAttempts.push(String(this.action || ''))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_MULTI_CHECKOUT_GUARD__.formRequestSubmitAttempts.push(String(this.action || ''))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_MULTI_CHECKOUT_GUARD__.postMessageAttempts.push(String(args[1] ?? ''))
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        const target = new URL(String(args[2] ?? window.location.href), window.location.href)
        window.__DOC_MULTI_CHECKOUT_GUARD__.navigationAttempts.push({ method, pathname: target.pathname })
        return original(...args)
      }
    }
  })
}

const setup = async (page, { groupOverrides = {}, prepareResponse, expectCheckout = true } = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  const currentGroup = { ...group(), ...structuredClone(groupOverrides) }
  const groupRoute = fixtureRoute(fixture, 'GET', groupPattern)
  groupRoute.response = { error: false, result: structuredClone(currentGroup) }
  groupRoute.assert.maxCount = 1

  const prepareRoute = fixtureRoute(fixture, 'GET', preparePattern)
  prepareRoute.response = {
    error: false,
    result: { paymethods: paymethods(), wallets: [] }
  }
  if (prepareResponse !== undefined) prepareRoute.response = structuredClone(prepareResponse)
  prepareRoute.assert.maxCount = 1

  const orderOptions = fixtureRoute(fixture, 'GET', orderOptionsPattern)
  orderOptions.response.result = {
    user_id: 9201,
    type: 2,
    moment: null,
    address: {
      id: 9211,
      address: '100 Synthetic Market Street',
      location: { lat: 30.2672, lng: -97.7431 }
    },
    carts: structuredClone(currentGroup.carts)
  }
  orderOptions.assert.maxCount = 1
  fixtureRoute(fixture, 'GET', deliveryOptionsPattern).assert.maxCount = expectCheckout ? 1 : 2
  fixtureRoute(fixture, 'GET', loyaltyPattern).assert.maxCount = expectCheckout ? 2 : 3
  fixtureRoute(fixture, 'GET', validationPattern).assert.maxCount = expectCheckout ? 2 : 3
  fixtureRoute(fixture, 'GET', userWalletsPattern).assert.maxCount = 1

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
  if (page.viewportSize()?.width < 500) await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const checkout = page.locator("[data-doc-section='multi-checkout']")
  if (!expectCheckout) return { fixture, requestLog, browserEvents, checkout }
  await expect(checkout).toBeVisible({ timeout: 30_000 })
  await expect(checkout).toHaveAttribute('data-doc-state', currentGroup.status)
  await expect(checkout).toContainText('Synthetic Product Customer')
  await expect(checkout).toContainText('Synthetic North Kitchen')
  await expect(checkout).toContainText('Fixture South Kitchen')
  await expect(checkout.locator("[data-doc-section='multi-checkout-business-cart']")).toHaveCount(2)
  return { fixture, requestLog, browserEvents, checkout }
}

const assertZeroWrites = async (fixture, requestLog) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])
}

const assertBrowserIsolation = async (page, browserEvents) => {
  expect(browserEvents.popupAttempts).toEqual([])
  expect(browserEvents.pageErrors).toEqual([])
  expect(browserEvents.attachedFrames).toEqual([])
  expect(browserEvents.extraPages).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_MULTI_CHECKOUT_GUARD__)
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
  await expect(page).toHaveURL(`${APP_ORIGIN}/multi-checkout/synthetic-cart-group-4401`)
}

const assertSafeNetwork = async (page, fixture, requestLog, { allowPlace = false } = {}) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  assertFixtureRequests(fixture, requestLog)
  expect(matchingRequests(requestLog, 'GET', groupPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', preparePattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', orderOptionsPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', deliveryOptionsPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', loyaltyPattern)).toHaveLength(2)
  expect(matchingRequests(requestLog, 'GET', validationPattern)).toHaveLength(2)
  expect(matchingRequests(requestLog, 'GET', userWalletsPattern)).toHaveLength(1)

  const unexpectedWrites = requestLog.matched.filter(({ method, pattern }) => !(
    method === 'GET' || (allowPlace && method === 'POST' && pattern === placePattern)
  ))
  expect(unexpectedWrites).toEqual([])
  const placeRequests = matchingRequests(requestLog, 'POST', placePattern)
  expect(placeRequests).toHaveLength(allowPlace ? 1 : 0)
  if (allowPlace) {
    expect(placeRequests[0].body).toEqual({ amount: 21, paymethod_id: 1, user_id: 9201 })
    expect(fixtureRoute(fixture, 'POST', placePattern).response).toEqual({
      error: true,
      result: ['Synthetic multi-checkout stopped before order creation.']
    })
  }
}

test.describe('Complete a multi-business checkout documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const { fixture, requestLog, browserEvents, checkout } = await setup(page)
      const payment = checkout.locator("[data-doc-section='multi-checkout-payment']")
      const place = checkout.locator("[data-doc-control='multi-checkout-place-order']")
      await expect(payment).toHaveAttribute('data-doc-state', 'unselected')
      await expect(payment.locator("[data-doc-control='multi-checkout-payment-method']")).toHaveCount(2)
      await expect(payment).toContainText('Cash')
      await expect(payment).toContainText('Card on delivery')
      await expect(place).toBeDisabled()
      await expect(checkout).toContainText('Total for all Carts')
      await expect(checkout).toContainText('USD 21.00')
      if (capture.id === 'multi-checkout-review-desktop') {
        const accordions = checkout.locator("[data-doc-control='business-cart-accordion']")
        await expect(accordions).toHaveCount(2)
        await accordions.nth(0).click()
        await accordions.nth(1).click()
        await expect(accordions.nth(0)).toHaveAttribute('data-doc-state', 'expanded')
        await expect(accordions.nth(1)).toHaveAttribute('data-doc-state', 'expanded')
        await expect(checkout.locator("[data-doc-section='multi-checkout-order-summary']")).toContainText('Synthetic North Bowl')
        await expect(checkout.locator("[data-doc-section='multi-checkout-order-summary']")).toContainText('Fixture South Wrap')
      }
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
        imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
      })
      await captureSection({
        page,
        locator: page.locator(capture.selector),
        filename: capture.file,
        captureMode: capture.capture_mode
      })
      await assertBrowserIsolation(page, browserEvents)
      await assertSafeNetwork(page, fixture, requestLog)
    })
  }

  test('cash selection is local and controlled group submission stops before order creation @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Submission contract runs once on desktop.')
    test.setTimeout(60_000)
    const { fixture, requestLog, browserEvents, checkout } = await setup(page)
    const payment = checkout.locator("[data-doc-section='multi-checkout-payment']")
    const cash = payment.locator("[data-doc-payment-gateway='cash']")
    const place = checkout.locator("[data-doc-control='multi-checkout-place-order']")
    await expect(place).toBeDisabled()
    await cash.click()
    await expect(payment).toHaveAttribute('data-doc-state', 'selected')
    await expect(cash).toHaveAttribute('data-doc-state', 'selected')
    await expect(place).toBeEnabled()
    expect(requestLog.matched.filter(({ method }) => method !== 'GET')).toEqual([])
    await place.click()
    await expect.poll(() => matchingRequests(requestLog, 'POST', placePattern).length).toBe(1)
    await expect(place).toBeEnabled()
    await expect(payment).toHaveAttribute('data-doc-state', 'selected')
    await assertBrowserIsolation(page, browserEvents)
    await assertSafeNetwork(page, fixture, requestLog, { allowPlace: true })
  })

  test('payment failure remains retryable but requires a method before Place @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'State contract runs once on desktop.')
    const { fixture, requestLog, checkout } = await setup(page, { groupOverrides: { status: 'payment_failed' } })
    await expect(checkout).toContainText('The payment has not been successful, please try again')
    await expect(checkout.locator("[data-doc-control='multi-checkout-place-order']")).toBeDisabled()
    await assertZeroWrites(fixture, requestLog)
  })

  test('prepare failure exposes no invented payment fallback and keeps Place disabled @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'State contract runs once on desktop.')
    const { fixture, requestLog, checkout } = await setup(page, {
      prepareResponse: { error: true, result: ['Synthetic payment preparation failed.'] }
    })
    await expect(checkout.locator("[data-doc-control='multi-checkout-payment-method']")).toHaveCount(0)
    await expect(checkout.locator("[data-doc-control='multi-checkout-place-order']")).toBeDisabled()
    await assertZeroWrites(fixture, requestLog)
  })

  test('a zero-balance group enables Place without a method but capture never invokes it @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'State contract runs once on desktop.')
    const zeroCarts = carts().map(item => ({ ...item, subtotal: 0, subtotal_with_discount: 0, total: 0, balance: 0 }))
    const { fixture, requestLog, checkout } = await setup(page, {
      groupOverrides: { total: 0, balance: 0, carts: zeroCarts }
    })
    await expect(checkout.locator("[data-doc-section='multi-checkout-payment']")).toHaveAttribute('data-doc-state', 'unselected')
    await expect(checkout.locator("[data-doc-control='multi-checkout-place-order']")).toBeEnabled()
    await assertZeroWrites(fixture, requestLog)
  })

  test('one open cart leaves group checkout for the ordinary checkout route @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Redirect contract runs once on desktop.')
    const { fixture, requestLog } = await setup(page, {
      groupOverrides: { total: 12, balance: 12, carts: [carts()[0]] },
      expectCheckout: false
    })
    await expect(page).toHaveURL(`${APP_ORIGIN}/checkout/synthetic-multi-cart-a`)
    await assertZeroWrites(fixture, requestLog)
  })

  test('no valid open carts leave group checkout for business search @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Redirect contract runs once on desktop.')
    const invalidCarts = carts().map(item => ({ ...item, valid: false, valid_products: false }))
    const { fixture, requestLog } = await setup(page, {
      groupOverrides: { carts: invalidCarts },
      expectCheckout: false
    })
    await expect(page).toHaveURL(`${APP_ORIGIN}/search`)
    await assertZeroWrites(fixture, requestLog)
  })
})
