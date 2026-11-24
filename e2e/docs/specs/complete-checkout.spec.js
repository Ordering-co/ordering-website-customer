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

const manifest = await loadManifest('complete-checkout.manifest')
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const businessPattern = '^/v400/en/docsmarket/business/8301(?:\\?.*)?$'
const placePattern = '^/v400/en/docsmarket/carts/synthetic-cart-checkout/place$'
const changePaymethodPattern = '^/v400/en/docsmarket/carts/change_paymethod$'
const deliveryOptionsPattern = '^/v400/en/docsmarket/delivery_options(?:\\?.*)?$'
const loyaltyPattern = '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$'
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'

const fixtureRoute = (fixture, method, pattern) => fixture.routes.find(
  route => route.method === method && route.pattern === pattern
)

const matchingRequests = (log, method, pattern) => log.matched.filter(
  request => request.method === method && request.pattern === pattern
)

const callbackData = () => ({
  success_url: `${APP_ORIGIN}/checkout/synthetic-cart-checkout`,
  cancel_url: `${APP_ORIGIN}/checkout/synthetic-cart-checkout`
})

const paymentMethods = () => [
  {
    paymethod_id: 1,
    sandbox: true,
    data: {},
    paymethod: { id: 1, name: 'Cash', gateway: 'cash', enabled: true }
  },
  {
    paymethod_id: 2,
    sandbox: true,
    data: {},
    paymethod: { id: 2, name: 'Card on delivery', gateway: 'card_delivery', enabled: true }
  }
]

const popupPaymentMethods = () => [
  {
    paymethod_id: 3,
    sandbox: true,
    data: {},
    paymethod: { id: 3, name: 'Square', gateway: 'square', enabled: true }
  },
  {
    paymethod_id: 4,
    sandbox: true,
    data: {},
    paymethod: { id: 4, name: 'Stripe redirect', gateway: 'stripe_redirect', enabled: true }
  }
]

const product = (overrides = {}) => ({
  id: 8521,
  code: 'DOCS-CHECKOUT-LINE-8521',
  business_id: 8301,
  category_id: 8311,
  name: 'Synthetic Checkout Bowl',
  price: 13,
  total: 13,
  quantity: 1,
  balance: 1,
  stock: 20,
  inventoried: false,
  images: '/e2e/docs/assets/synthetic-business-header.svg',
  comment: 'No fixture utensils',
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {},
  options: {},
  ...overrides
})

const cart = (overrides = {}) => ({
  uuid: 'synthetic-cart-checkout',
  business_id: 8301,
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
  subtotal: 21,
  subtotal_with_discount: 19,
  discount: 2,
  discount_type: 2,
  discount_rate: 0,
  delivery_price_with_discount: 0,
  driver_tip: 0,
  tax: 1,
  taxes: [{
    id: 8531,
    name: 'Synthetic sales tax',
    type: 2,
    target: 'product',
    rate: 5,
    summary: { tax: 1 }
  }],
  fees: [{
    id: 8541,
    name: 'Fixture service fee',
    fixed: 0,
    percentage: 0,
    rate: 1,
    summary: { amount: 1 }
  }],
  offers: [],
  metafields: [],
  total: 21,
  balance: 21,
  paymethod_id: null,
  paymethod_data: {},
  products: [
    product(),
    product({
      id: 8522,
      code: 'DOCS-CHECKOUT-LINE-8522',
      name: 'Fixture Citrus Drink',
      price: 4,
      total: 8,
      quantity: 2,
      balance: 2,
      comment: null
    })
  ],
  business: {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    address: '200 Synthetic Checkout Avenue',
    location: { lat: 30.2672, lng: -97.7431 },
    vertical: 'food',
    tax_type: 2,
    pickup_time: '00:15',
    configs: []
  },
  ...overrides
})

const selectedCashCart = () => cart({
  paymethod_id: 1,
  paymethod_data: callbackData()
})

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_CHECKOUT_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      formRequestSubmitAttempts: [],
      postMessageAttempts: []
    }
    window.open = (...args) => {
      window.__DOC_CHECKOUT_GUARD__.windowOpenAttempts.push(String(args[0] ?? ''))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_CHECKOUT_GUARD__.formSubmitAttempts.push(String(this.action || ''))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_CHECKOUT_GUARD__.formRequestSubmitAttempts.push(String(this.action || ''))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_CHECKOUT_GUARD__.postMessageAttempts.push(String(args[1] ?? ''))
      return Reflect.apply(nativePostMessage, window, args)
    }
  })
}

const setup = async (page, { selectedCash = false } = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  const currentCart = selectedCash ? selectedCashCart() : cart()
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
    carts: [structuredClone(currentCart)]
  }
  orderOptions.assert.maxCount = selectedCash ? 2 : 1

  const business = fixtureRoute(fixture, 'GET', businessPattern)
  business.assert.maxCount = 2
  business.response.result = {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    description: 'Synthetic business used only for checkout documentation.',
    address: '200 Synthetic Checkout Avenue',
    paymethods: selectedCash ? paymentMethods() : popupPaymentMethods(),
    configs: [],
    schedule: [],
    today: null,
    vertical: 'food'
  }

  fixtureRoute(fixture, 'POST', changePaymethodPattern).response.result = structuredClone(currentCart)
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$').assert.maxCount = 2

  const requestLog = createRequestLog()
  const browserEvents = {
    popupAttempts: [],
    pageErrors: [],
    failedRequests: [],
    attachedFrames: [],
    extraPages: []
  }
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
  if (page.viewportSize()?.width < 500) {
    await page.setViewportSize({ width: 390, height: 1100 })
  }
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(1)
  const checkout = page.locator("[data-doc-section='checkout']")
  await expect(checkout).toBeVisible({ timeout: 30_000 })
  await expect(checkout.locator("[data-doc-section='checkout-customer-details']")).toContainText('Synthetic Product Customer')
  await expect(checkout.locator("[data-doc-section='checkout-context']")).toContainText('200 Synthetic Checkout Avenue')
  await expect(checkout.locator("[data-doc-section='checkout-order-summary']")).toBeVisible()
  await expect(checkout.locator("[data-doc-section='checkout-totals']")).toBeVisible()
  return { fixture, requestLog, browserEvents, checkout }
}

const assertBrowserIsolation = async (page, browserEvents) => {
  expect(browserEvents.popupAttempts).toEqual([])
  expect(browserEvents.pageErrors).toEqual([])
  expect(browserEvents.attachedFrames).toEqual([])
  expect(browserEvents.extraPages).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_CHECKOUT_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.formRequestSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  const unexpectedFailures = browserEvents.failedRequests.filter(url => !(
    url.startsWith('https://fonts.gstatic.com/') ||
    url.startsWith('https://cdn.onesignal.com/') ||
    url.startsWith('https://www.google-analytics.com/')
  ))
  expect(unexpectedFailures).toEqual([])
  await expect(page).toHaveURL(`${APP_ORIGIN}/checkout/synthetic-cart-checkout`)
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
  expect(matchingRequests(requestLog, 'GET', orderOptionsPattern)).toHaveLength(allowPlace ? 2 : 1)
  expect(matchingRequests(requestLog, 'GET', deliveryOptionsPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', loyaltyPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', validationPattern)).toHaveLength(2)
  const businessReads = matchingRequests(requestLog, 'GET', businessPattern)
  expect(businessReads.map(({ url }) => url)).toEqual([
    '/v400/en/docsmarket/business/8301?type=2&version=v2&params=id,slug,name,description,email,cellphone,address,address_notes,paymethods,logo,location,configs,schedule,today,vertical'
  ])

  const unexpectedWrites = requestLog.matched.filter(({ method, pattern }) => !(
    method === 'GET' ||
    (allowPlace && method === 'POST' && pattern === placePattern)
  ))
  expect(unexpectedWrites).toEqual([])
  const placeRequests = matchingRequests(requestLog, 'POST', placePattern)
  expect(placeRequests).toHaveLength(allowPlace ? 1 : 0)
  if (allowPlace) {
    const selectionRequests = matchingRequests(requestLog, 'POST', changePaymethodPattern)
    expect(selectionRequests).toHaveLength(0)
    expect(placeRequests[0].body).toEqual({
      amount: 21,
      paymethod_id: 1,
      paymethod_data: JSON.stringify(callbackData()),
      user_id: 9201
    })
    expect(JSON.parse(placeRequests[0].body.paymethod_data)).toEqual(callbackData())
    expect(fixtureRoute(fixture, 'POST', placePattern).response).toEqual({
      error: true,
      result: ['Synthetic checkout stopped before order creation.']
    })
  } else {
    expect(matchingRequests(requestLog, 'POST', changePaymethodPattern)).toHaveLength(0)
  }
}

test.describe('Complete checkout documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, { selectedCash: true })
      const { fixture, requestLog, browserEvents, checkout } = runtime
      const payment = checkout.locator("[data-doc-section='checkout-payment-section']")
      const placeOrder = checkout.locator("[data-doc-control='checkout-place-order']")
      await expect(payment).toHaveAttribute('data-doc-state', 'selected')
      await expect(payment.getByRole('button', { name: 'Cash', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(placeOrder).toBeEnabled()
      await expect(checkout.locator("[data-doc-section='cart-summary']").last()).toContainText('Order total')
      await expect(checkout.locator("[data-doc-section='cart-summary']").last()).toContainText('USD 21.00')
      if (capture.id === 'checkout-review-desktop') {
        const totals = checkout.locator("[data-doc-section='checkout-totals']")
        await totals.getByRole('button', { name: 'Taxes and fees', exact: true }).click()
        await expect(totals).toContainText('Synthetic sales tax')
        await expect(totals).toContainText('Fixture service fee')
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

  test('popup-only payment is required and Place Order cannot submit', async ({ page }) => {
    test.setTimeout(60_000)
    const { fixture, requestLog, browserEvents, checkout } = await setup(page)
    const payment = checkout.locator("[data-doc-section='checkout-payment-section']")
    const placeOrder = checkout.locator("[data-doc-control='checkout-place-order']")
    const paymentToggle = payment.locator("button[aria-controls='checkout-payment-content']").filter({ hasText: 'Required' })
    const warning = checkout.getByText('Please, select a payment method to place order.', { exact: true })
    await expect(payment.locator("[data-doc-control='payment-method']")).toHaveCount(2)
    await expect(payment.locator("[data-doc-payment-gateway='square']")).toBeVisible()
    await expect(payment.locator("[data-doc-payment-gateway='stripe_redirect']")).toBeVisible()
    await expect(payment.locator("[data-doc-control='payment-method'][aria-pressed='true']")).toHaveCount(0)
    await expect(payment).toHaveAttribute('data-doc-state', 'unselected')
    await expect(paymentToggle.getByText('Required', { exact: true })).toBeVisible()
    await expect(warning).toBeVisible()
    await expect(placeOrder).toHaveText(/Place order/i)
    await placeOrder.click()
    await expect(paymentToggle).toBeFocused()
    await expect(payment).toHaveAttribute('data-doc-state', 'unselected')
    await assertSafeNetwork(page, fixture, requestLog)
    await assertBrowserIsolation(page, browserEvents)
  })

  test('safe cash submission sends one exact place request and stops before order creation @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Submission contract runs once on desktop.')
    test.setTimeout(60_000)
    const runtime = await setup(page, { selectedCash: true })
    const { fixture, requestLog, browserEvents, checkout } = runtime
    const payment = checkout.locator("[data-doc-section='checkout-payment-section']")
    const placeOrder = checkout.locator("[data-doc-control='checkout-place-order']")
    await expect(payment).toHaveAttribute('data-doc-state', 'selected')
    await expect(payment.getByText('Change', { exact: true })).toBeVisible()
    await expect(payment.locator("[data-doc-payment-gateway='cash']")).toHaveClass(/active/)
    await expect(placeOrder).toBeEnabled()
    await placeOrder.click()
    await expect.poll(() => matchingRequests(requestLog, 'POST', placePattern).length).toBe(1)
    await expect(placeOrder).toBeEnabled()
    await expect(payment).toHaveAttribute('data-doc-state', 'selected')
    await expect(payment.getByText('Change', { exact: true })).toBeVisible()
    await assertBrowserIsolation(page, browserEvents)
    await assertSafeNetwork(page, fixture, requestLog, { allowPlace: true })
  })
})
