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

const manifest = await loadManifest('payment-methods.manifest')
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const businessPattern = '^/v400/en/docsmarket/business/8301(?:\\?.*)?$'
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
  success_url: `${APP_ORIGIN}/checkout/synthetic-cart-payment`,
  cancel_url: `${APP_ORIGIN}/checkout/synthetic-cart-payment`
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

const product = () => ({
  id: 8421,
  code: 'DOCS-PAYMENT-LINE-8421',
  business_id: 8301,
  category_id: 8311,
  name: 'Synthetic Checkout Bowl',
  price: 19,
  total: 19,
  quantity: 1,
  balance: 1,
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

const cart = (overrides = {}) => ({
  uuid: 'synthetic-cart-payment',
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
  subtotal: 19,
  subtotal_with_discount: 19,
  discount: 0,
  delivery_price_with_discount: 0,
  driver_tip: 0,
  tax: 0,
  taxes: [],
  fees: [],
  offers: [],
  metafields: [],
  total: 19,
  balance: 19,
  paymethod_id: null,
  paymethod_data: {},
  products: [product()],
  business: {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    vertical: 'food',
    tax_type: 2,
    delivery_time: '00:25',
    pickup_time: '00:15',
    configs: []
  },
  ...overrides
})

const installProviderGuards = async (page) => {
  await page.addInitScript(() => {
    window.__DOC_PAYMENT_PROVIDER_GUARD__ = {
      windowOpenAttempts: [],
      formSubmitAttempts: [],
      postMessageAttempts: []
    }
    window.open = (...args) => {
      window.__DOC_PAYMENT_PROVIDER_GUARD__.windowOpenAttempts.push(String(args[0] ?? ''))
      return null
    }
    const nativeSubmit = window.HTMLFormElement.prototype.submit
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_PAYMENT_PROVIDER_GUARD__.formSubmitAttempts.push(String(this.action || ''))
      return undefined
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_PAYMENT_PROVIDER_GUARD__.postMessageAttempts.push(String(args[1] ?? ''))
      return Reflect.apply(nativePostMessage, window, args)
    }
    window.__DOC_PAYMENT_PROVIDER_GUARD__.nativeSubmitName = nativeSubmit.name
  })
}

const setup = async (page, { initialPaymethodId = 1, targetPaymethodId } = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  const initialCart = initialPaymethodId === null
    ? cart()
    : cart({ paymethod_id: initialPaymethodId, paymethod_data: callbackData() })
  fixtureRoute(fixture, 'GET', orderOptionsPattern).response.result.carts = [structuredClone(initialCart)]
  const business = fixtureRoute(fixture, 'GET', businessPattern)
  business.assert.maxCount = 2
  business.response.result = {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    description: 'Synthetic business used only for payment documentation.',
    paymethods: paymentMethods(),
    configs: [],
    schedule: [],
    today: null,
    vertical: 'food'
  }
  if (targetPaymethodId !== undefined) {
    fixtureRoute(fixture, 'POST', changePaymethodPattern).response.result = cart({
      paymethod_id: targetPaymethodId,
      paymethod_data: callbackData()
    })
  }
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$').assert.maxCount = 2

  const requestLog = createRequestLog()
  const popupAttempts = []
  const pageErrors = []
  const failedRequests = []
  const attachedFrames = []
  page.on('popup', popup => {
    popupAttempts.push(popup.url())
    void popup.close()
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('requestfailed', request => failedRequests.push(request.url()))
  page.on('frameattached', frame => attachedFrames.push(frame))
  if (page.viewportSize()?.width < 500) {
    await page.setViewportSize({ width: 390, height: 1100 })
  }
  await installProviderGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(1)
  const section = page.locator("[data-doc-section='checkout-payment-section']")
  await expect(section).toBeVisible({ timeout: 30_000 })
  const options = section.locator("[data-doc-section='payment-method-options']")
  await expect(options).toBeVisible()
  return {
    fixture,
    requestLog,
    section,
    options,
    popupAttempts,
    pageErrors,
    failedRequests,
    attachedFrames
  }
}

const openMethodList = async ({ section, options }, selected = 'Cash') => {
  await expect(section).toHaveAttribute('data-doc-state', 'selected')
  await expect(options.getByRole('radio', { name: selected, exact: true })).toBeChecked()
  const change = section.getByRole('button', { name: 'Change', exact: true })
  await expect(change).toBeVisible()
  if (await change.getAttribute('aria-expanded') === 'false') await change.click()
  await expect(options.locator("[data-doc-control='payment-method']")).toHaveCount(2)
}

const assertProviderIsolation = async (page, { popupAttempts, pageErrors, failedRequests, attachedFrames }) => {
  expect(popupAttempts).toEqual([])
  expect(pageErrors).toEqual([])
  expect(attachedFrames).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_PAYMENT_PROVIDER_GUARD__)
  expect(guard.windowOpenAttempts).toEqual([])
  expect(guard.formSubmitAttempts).toEqual([])
  expect(guard.postMessageAttempts).toEqual([])
  const providerFrames = page.frames().filter(frame => frame !== page.mainFrame())
  expect(providerFrames).toEqual([])
  const unexpectedFailures = failedRequests.filter(url => !(
    url.startsWith('https://fonts.gstatic.com/') ||
    url.startsWith('https://cdn.onesignal.com/') ||
    url.startsWith('https://www.google-analytics.com/')
  ))
  expect(unexpectedFailures).toEqual([])
  await expect(page).toHaveURL(`${APP_ORIGIN}/checkout/synthetic-cart-payment`)
}

const assertSafeNetwork = async (page, fixture, requestLog, { allowedPaymethodId = null } = {}) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  assertFixtureRequests(fixture, requestLog)
  expect(matchingRequests(requestLog, 'GET', orderOptionsPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', deliveryOptionsPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', loyaltyPattern)).toHaveLength(1)
  expect(matchingRequests(requestLog, 'GET', validationPattern)).toHaveLength(2)
  const businessReads = matchingRequests(requestLog, 'GET', businessPattern)
  expect(businessReads.map(({ url }) => url)).toEqual([
    '/v400/en/docsmarket/business/8301?type=2&version=v2&params=id,slug,name,description,email,cellphone,address,address_notes,paymethods,logo,location,configs,schedule,today,vertical'
  ])

  const allowedWrites = allowedPaymethodId === null ? [] : matchingRequests(requestLog, 'POST', changePaymethodPattern)
  const unexpectedWrites = requestLog.matched.filter(({ method, pattern }) => !(
    method === 'GET' ||
    (allowedPaymethodId !== null && method === 'POST' && pattern === changePaymethodPattern)
  ))
  expect(unexpectedWrites).toEqual([])
  if (allowedPaymethodId === null) {
    expect(matchingRequests(requestLog, 'POST', changePaymethodPattern)).toHaveLength(0)
  } else {
    expect(allowedWrites).toHaveLength(1)
    expect(allowedWrites[0].body).toEqual({
      business_id: 8301,
      paymethod_id: allowedPaymethodId,
      paymethod_data: JSON.stringify(callbackData()),
      user_id: 9201
    })
    const refreshedCart = fixtureRoute(fixture, 'POST', changePaymethodPattern).response.result
    expect(refreshedCart.paymethod_id).toBe(allowedPaymethodId)
    expect(refreshedCart.paymethod_data).toEqual(callbackData())
  }
}

test.describe('Choose a checkout payment method documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page)
      await openMethodList(runtime)
      const { fixture, requestLog, section, options } = runtime
      if (capture.id === 'payment-methods-cash-desktop') {
        await expect(section.locator("[data-doc-section='cash-payment-details']")).toBeVisible()
      }
      await expect(options.locator("[data-doc-payment-gateway='cash']")).toContainText('Cash')
      await expect(options.locator("[data-doc-payment-gateway='card_delivery']")).toContainText('Card on delivery')
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, { imageScope: 'section' })
      await captureSection({ page, locator: section, filename: capture.file, captureMode: capture.capture_mode })
      await assertProviderIsolation(page, runtime)
      await assertSafeNetwork(page, fixture, requestLog)
    })
  }

  test('a cart without a method automatically selects Cash with one exact update', async ({ page }) => {
    test.setTimeout(60_000)
    const runtime = await setup(page, { initialPaymethodId: null, targetPaymethodId: 1 })
    const { fixture, requestLog, section, options } = runtime
    // No click or preselected cart can satisfy the checkout's automatic transition.
    await expect.poll(() => matchingRequests(requestLog, 'POST', changePaymethodPattern).length).toBe(1)
    await expect(section).toHaveAttribute('data-doc-state', 'selected')
    await expect(options.getByRole('radio', { name: 'Cash', exact: true })).toBeChecked()
    await expect(section.getByRole('button', { name: 'Change', exact: true })).toBeVisible()
    await expect(section.locator("[data-doc-section='cash-payment-details']")).toBeVisible()
    await assertSafeNetwork(page, fixture, requestLog, { allowedPaymethodId: 1 })
    await assertProviderIsolation(page, runtime)
  })

  test('selecting Cash from Card on delivery sends one exact update @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Selection contract runs once on desktop.')
    const runtime = await setup(page, { initialPaymethodId: 2, targetPaymethodId: 1 })
    await openMethodList(runtime, 'Card on delivery')
    await runtime.options.getByRole('radio', { name: 'Cash', exact: true }).click()
    await expect(runtime.options.getByRole('radio', { name: 'Cash', exact: true })).toBeChecked()
    await expect(runtime.section.locator("[data-doc-section='cash-payment-details']")).toBeVisible()
    await assertSafeNetwork(page, runtime.fixture, runtime.requestLog, { allowedPaymethodId: 1 })
    await assertProviderIsolation(page, runtime)
  })

  test('card on delivery selection sends one exact safe cart paymethod update @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Selection contract runs once on desktop.')
    const runtime = await setup(page, { targetPaymethodId: 2 })
    await openMethodList(runtime)
    const { fixture, requestLog, section, options } = runtime
    expect(matchingRequests(requestLog, 'POST', changePaymethodPattern)).toHaveLength(0)
    await options.locator("[data-doc-control='payment-method'][data-doc-payment-gateway='card_delivery']").click()
    await expect.poll(() => matchingRequests(requestLog, 'POST', changePaymethodPattern).length).toBe(1)
    await expect(section).toHaveAttribute('data-doc-state', 'selected')
    await expect(options.getByRole('radio', { name: 'Card on delivery', exact: true })).toBeChecked()
    await expect(section.getByText('Change', { exact: true })).toBeVisible()
    await assertProviderIsolation(page, runtime)
    await assertSafeNetwork(page, fixture, requestLog, { allowedPaymethodId: 2 })
  })
})
