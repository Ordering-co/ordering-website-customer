import { expect, test } from '@playwright/test'
import { APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture, setSharedReadLimit } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('multi-cart.manifest')
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const createGroupPattern = '^/v400/en/docsmarket/cart_groups$'
const groupUuid = 'synthetic-cart-group-4401'
const groupPattern = '^/v400/en/docsmarket/cart_groups/synthetic-cart-group-4401(?:\\?.*)?$'
const cartMutationPattern = /\/carts\/(?:add_product|update_product|remove_product|clear)(?:\?|$)/
const orderMutationPattern = /\/(?:orders?|place|confirm)(?:\/|\?|$)/
const paymentMutationPattern = /\/(?:payments?|wallets?)(?:\/|\?|$)/

const matchingRequests = (log, method, pattern) => log.matched.filter(
  request => request.method === method && request.pattern === pattern
)

const fixtureRoute = (fixture, method, pattern) => fixture.routes.find(
  route => route.method === method && route.pattern === pattern
)

const product = (id, businessId, name, total) => ({
  id,
  code: `DOCS-MULTI-LINE-${id}`,
  business_id: businessId,
  category_id: businessId + 10,
  name,
  price: total,
  total,
  quantity: 1,
  balance: 1,
  stock: 10,
  inventoried: false,
  images: '/e2e/docs/assets/synthetic-business-header.svg',
  comment: null,
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {},
  options: {}
})

const cart = ({ uuid, businessId, businessName, productId, total, ...overrides }) => ({
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
  taxes: [],
  fees: [],
  offers: [],
  metafields: [],
  total,
  balance: total,
  products: [product(productId, businessId, `${businessName} item`, total)],
  business: {
    id: businessId,
    slug: `synthetic-business-${businessId}`,
    name: businessName,
    vertical: 'food',
    tax_type: 2,
    configs: []
  },
  ...overrides
})

const eligibleCarts = () => [
  cart({ uuid: 'synthetic-multi-cart-a', businessId: 8401, businessName: 'Synthetic North Kitchen', productId: 8411, total: 12 }),
  cart({ uuid: 'synthetic-multi-cart-b', businessId: 8501, businessName: 'Fixture South Kitchen', productId: 8511, total: 9 })
]

const installNavigationLog = async (page) => {
  await page.addInitScript(() => {
    window.__DOC_NAVIGATION_LOG__ = []
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        const target = new URL(String(args[2] ?? window.location.href), window.location.href)
        window.__DOC_NAVIGATION_LOG__.push({ method, pathname: target.pathname, search: target.search })
        return original(...args)
      }
    }
  })
}

const seedGroupRead = (fixture, carts) => {
  const group = fixtureRoute(fixture, 'GET', groupPattern)
  group.response.result.carts = structuredClone(carts)
  group.response.result.balance = carts.reduce((total, cart) => total + cart.balance, 0)
  group.assert.maxCount = 3
}

const setup = async (page, {
  carts = eligibleCarts(),
  delayMs = 400,
  groupResponse = { error: false, result: { uuid: 'synthetic-cart-group-4401' } },
  groupTransport = {},
  multiBusinessEnabled = true,
  refreshResponse,
  refreshStatus,
  refreshAbort = false,
  expectPreparation = true,
  expectCreate = true,
  seedCreatedGroup = false
} = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  fixture.firstLoad.configs.checkout_multi_business_enabled.value = multiBusinessEnabled ? '1' : '0'
  const orderOptions = fixtureRoute(fixture, 'GET', orderOptionsPattern)
  orderOptions.response.result.carts = structuredClone(carts)
  const refreshedCarts = carts.map(item => ({
    ...structuredClone(item),
    group: { uuid: groupResponse?.result?.uuid || 'synthetic-cart-group-4401' }
  }))
  orderOptions.responseSequence = [
    structuredClone(orderOptions.response),
    {
      ...structuredClone(orderOptions.response),
      result: {
        ...structuredClone(orderOptions.response.result),
        carts: refreshedCarts
      }
    }
  ]
  if (refreshResponse !== undefined) orderOptions.responseSequence[1] = refreshResponse
  if (refreshStatus !== undefined) orderOptions.transport = { ...(orderOptions.transport || {}), statusSequence: [200, refreshStatus] }
  if (refreshAbort) orderOptions.transport = { ...(orderOptions.transport || {}), abortSequence: [false, true] }
  orderOptions.assert.maxCount = 3
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').assert.maxCount = 4
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/delivery_options(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$').assert.maxCount = 4
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/users/9201(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/cart_groups/synthetic-cart-group-4401(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v3/?(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/users/9201/wallets(?:\\?.*)?$').assert.maxCount = 2
  if (seedCreatedGroup) seedGroupRead(fixture, refreshedCarts)
  const createGroup = fixtureRoute(fixture, 'POST', createGroupPattern)
  createGroup.response = structuredClone(groupResponse)
  createGroup.transport = { delayMs, ...groupTransport }

  const requestLog = createRequestLog()
  const createGroupHeaders = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname.endsWith('/cart_groups')) {
      createGroupHeaders.push(request.headers())
    }
  })
  await installNavigationLog(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(1)
  const preparation = page.locator("[data-doc-section='multi-cart-preparation']")
  if (expectPreparation) {
    await expect(preparation).toBeVisible({ timeout: 30_000 })
    await expect(preparation).toHaveAttribute('data-doc-state', 'loading')
  } else if (expectCreate) {
    await expect.poll(() => matchingRequests(requestLog, 'POST', createGroupPattern).length).toBe(1)
  }
  return { fixture, requestLog, createGroupHeaders, preparation }
}

const setupGroupedHeader = async (
  page,
  groupUuids = [groupUuid, groupUuid]
) => {
  const fixture = await loadFixture(manifest.fixture)
  const grouped = eligibleCarts().map((item, index) => ({
    ...item,
    ...(groupUuids[index] ? { group: { uuid: groupUuids[index] } } : {})
  }))
  const orderOptions = fixtureRoute(fixture, 'GET', orderOptionsPattern)
  orderOptions.response.result.carts = structuredClone(grouped)
  orderOptions.assert.maxCount = 1
  if (groupUuids.every(uuid => uuid === groupUuid)) seedGroupRead(fixture, grouped)
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').assert.maxCount = 2
  fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/loyalty_plans(?:\\?.*)?$').assert.maxCount = 2
  const requestLog = createRequestLog()
  await installNavigationLog(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(1)
  const open = page.locator("[data-doc-control='cart-open']")
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  const cart = page.locator("[data-doc-section='cart-content']")
  await expect(cart.locator("[data-doc-control='cart-checkout']")).toHaveCount(2)
  const checkout = cart.locator("[data-doc-control='multi-cart-group-checkout'][data-doc-group-index='0']")
  return { fixture, requestLog, cart, checkout }
}

const assertSafeNetwork = async (page, fixture, requestLog) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  assertFixtureRequests(fixture, requestLog)
  expect(requestLog.matched.filter(({ method, url }) => method !== 'GET' && cartMutationPattern.test(url))).toHaveLength(0)
  expect(requestLog.matched.filter(({ method, url }) => method !== 'GET' && orderMutationPattern.test(url))).toHaveLength(0)
  expect(requestLog.matched.filter(({ method, url }) => method !== 'GET' && paymentMutationPattern.test(url))).toHaveLength(0)
  const unexpectedWrites = requestLog.matched.filter(({ method, pattern }) => !(
    method === 'GET' || (method === 'POST' && pattern === createGroupPattern)
  ))
  expect(unexpectedWrites).toEqual([])
  const completedRedirect = await page.evaluate(() => window.__DOC_NAVIGATION_LOG__?.some(entry => entry.pathname.startsWith('/multi-orders/')))
  expect(completedRedirect).toBe(false)
  const unresolvedRedirect = await page.evaluate(() => window.__DOC_NAVIGATION_LOG__?.some(entry => entry.pathname.endsWith('/undefined')))
  expect(unresolvedRedirect).toBe(false)
}

const assertExactCreateGroup = (requestLog, expectedCarts) => {
  const requests = matchingRequests(requestLog, 'POST', createGroupPattern)
  expect(requests).toHaveLength(1)
  expect(requests[0].body).toEqual({ carts: expectedCarts })
}

const hasNavigation = (page, method, pathname) => page.evaluate(
  ({ method, pathname }) => window.__DOC_NAVIGATION_LOG__?.some(entry => entry.method === method && entry.pathname === pathname),
  { method, pathname }
)

const assertCreateHeaders = (headersList) => {
  expect(headersList).toHaveLength(1)
  const headers = headersList[0]
  expect(headers.authorization).toBe('Bearer docs-fixture-custom-product-session-token')
  expect(headers['content-type']).toContain('application/json')
  expect(headers['x-app-x']).toBe('docs-fixture-website-app')
  expect(headers['x-internal-product-x']).toBe('website')
  expect(Object.hasOwn(headers, 'x-socket-id-x')).toBe(true)
}

test.describe('Prepare multi-business carts documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const { fixture, requestLog, checkout } = await setupGroupedHeader(page)
      const cartShell = page.locator(capture.selector)
      await expect(cartShell).toBeVisible()
      await expect(cartShell).toContainText('Synthetic North Kitchen')
      await expect(cartShell).toContainText('Fixture South Kitchen')
      await expect(cartShell).toContainText('Total for all Carts')
      await expect(cartShell).toContainText('USD 21.00')
      await expect(cartShell.locator("[data-doc-control='multi-cart-group-checkout']")).toHaveCount(1)
      const businessCheckouts = cartShell.locator("[data-doc-control='cart-checkout']")
      await expect(businessCheckouts).toHaveCount(2)
      await expect(businessCheckouts.nth(0)).toHaveAccessibleName('Checkout · USD 12.00')
      await expect(businessCheckouts.nth(1)).toHaveAccessibleName('Checkout · USD 9.00')
      await expect(checkout).toHaveAccessibleName('Checkout USD 21.00')
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, { imageScope: 'viewport' })
      await captureSection({ page, locator: cartShell, filename: capture.file, captureMode: capture.capture_mode })
      await checkout.click()
      await expect.poll(() => hasNavigation(page, 'pushState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
      await assertSafeNetwork(page, fixture, requestLog)
      expect(matchingRequests(requestLog, 'POST', createGroupPattern)).toHaveLength(0)
    })
  }

  test('creates one exact group and replaces the route with multi-checkout @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Canonical contract runs once on desktop.')
    const { fixture, requestLog, createGroupHeaders } = await setup(page, { seedCreatedGroup: true })
    const preparePattern = `^/v400/en/docsmarket/cart_groups/${groupUuid}/prepare(?:\\?.*)?$`
    fixtureRoute(fixture, 'GET', preparePattern).assert.maxCount = 2
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    assertCreateHeaders(createGroupHeaders)
    await expect.poll(() => hasNavigation(page, 'replaceState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(2)
    setSharedReadLimit(fixture, 'languages', 2)
    setSharedReadLimit(fixture, 'pages', 2)
    await expect.poll(() => matchingRequests(requestLog, 'GET', preparePattern).length).toBe(1)
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(3)
    await page.locator("[data-doc-control='cart-open']").click()
    const sharedGroupCheckout = page.locator("[data-doc-control='multi-cart-group-checkout'][data-doc-group-index='0']")
    await expect(sharedGroupCheckout).toBeVisible()
    await sharedGroupCheckout.click()
    await expect.poll(() => hasNavigation(page, 'pushState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
    await expect.poll(() => matchingRequests(requestLog, 'GET', preparePattern).length).toBe(2)
    await assertSafeNetwork(page, fixture, requestLog)
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
  })

  test('one eligible cart redirects to checkout once without creating a group @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Single-cart blocker runs once on desktop.')
    const onlyCart = eligibleCarts()[0]
    const { fixture, requestLog } = await setup(page, { carts: [onlyCart], expectPreparation: false, expectCreate: false })
    await expect.poll(() => hasNavigation(page, 'replaceState', '/checkout/synthetic-multi-cart-a')).toBe(true)
    await assertSafeNetwork(page, fixture, requestLog)
    expect(matchingRequests(requestLog, 'POST', createGroupPattern)).toHaveLength(0)
    const checkoutNavigations = await page.evaluate(() => window.__DOC_NAVIGATION_LOG__
      .filter(({ pathname }) => /^\/(?:multi-)?checkout\//.test(pathname)))
    expect(checkoutNavigations).toHaveLength(1)
  })

  for (const { id, carts } of [
    { id: 'empty', carts: [] },
    { id: 'invalid', carts: eligibleCarts().map(item => ({ ...item, valid: false })) },
    { id: 'pending', carts: eligibleCarts().map(item => ({ ...item, status: 2 })) }
  ]) {
    test(`${id} carts show an exit without creating a group @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Eligibility blocker runs once on desktop.')
      const { fixture, requestLog, preparation } = await setup(page, {
        carts,
        expectPreparation: false,
        expectCreate: false
      })
      await expect(page.getByRole('heading', { name: "You don't have any carts yet" })).toBeVisible()
      await waitForRequestQuiescence(requestLog, manifest.readiness.network)
      expect(matchingRequests(requestLog, 'POST', createGroupPattern)).toHaveLength(0)
      await expect(page).toHaveURL(/\/multi-cart$/)
      await expect(preparation).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Go to Businesses' })).toBeVisible()
      await assertSafeNetwork(page, fixture, requestLog)
    })
  }

  test('mixed active, pending, and invalid carts send only the active cart to checkout @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Mixed eligibility boundary runs once on desktop.')
    const [active, other] = eligibleCarts()
    const pending = { ...structuredClone(other), uuid: 'synthetic-pending-cart', status: 2 }
    const invalid = { ...structuredClone(other), uuid: 'synthetic-invalid-cart', valid: false }
    const { fixture, requestLog } = await setup(page, { carts: [active, pending, invalid], expectPreparation: false, expectCreate: false })
    await expect.poll(() => hasNavigation(page, 'replaceState', '/checkout/synthetic-multi-cart-a')).toBe(true)
    await assertSafeNetwork(page, fixture, requestLog)
    expect(matchingRequests(requestLog, 'POST', createGroupPattern)).toHaveLength(0)
  })

  for (const { id, options } of [
    { id: 'API error', options: { groupResponse: { error: true, result: 'Synthetic group creation failed.' } } },
    { id: 'non-JSON success', options: { groupTransport: { contentType: 'text/plain', body: 'synthetic-not-json' } } },
    { id: 'network failure', options: { groupTransport: { abortSequence: [true] } } },
    { id: 'missing UUID', options: { groupResponse: { error: false, result: {} } } },
    { id: 'placeholder UUID', options: { groupResponse: { error: false, result: { uuid: 'undefined' } } } }
  ]) {
    test(`${id} during group creation offers a way out @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Group error runs once on desktop.')
      const { fixture, requestLog, preparation } = await setup(page, options)
      assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
      await expect(page).toHaveURL(/\/multi-cart$/)
      await expect(preparation).toHaveCount(0)
      const errorHeading = page.getByRole('heading', { name: 'We couldn’t prepare your carts for checkout.' })
      await expect(errorHeading).toBeFocused()
      const exit = page.getByRole('button', { name: 'Go to Businesses' })
      await page.keyboard.press('Tab')
      await expect(exit).toBeFocused()
      await assertSafeNetwork(page, fixture, requestLog)
      await page.keyboard.press('Enter')
      await expect(page).not.toHaveURL(/\/multi-cart$/)
    })
  }

  test('HTTP status is ignored when group creation still returns a success body @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'HTTP status boundary runs once on desktop.')
    const { fixture, requestLog } = await setup(page, { groupTransport: { status: 503 }, expectPreparation: false })
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    await expect.poll(() => hasNavigation(page, 'replaceState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('direct route still creates a group when multi-business config is disabled @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Direct-route blocker runs once on desktop.')
    const { fixture, requestLog } = await setup(page, { multiBusinessEnabled: false })
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('a failed order-options refresh is swallowed and still navigates after group persistence @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Refresh-failure boundary runs once on desktop.')
    const { fixture, requestLog } = await setup(page, { delayMs: 1200 })
    const orderOptions = fixtureRoute(fixture, 'GET', orderOptionsPattern)
    orderOptions.responseSequence[1] = { error: true, result: 'Synthetic order-options refresh failed.' }
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(2)
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    await expect.poll(() => hasNavigation(page, 'replaceState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('malformed JSON during post-create refresh announces a failed retry and can continue @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Malformed refresh boundary runs once on desktop.')
    const { fixture, requestLog } = await setup(page, { refreshResponse: '{', expectPreparation: false, seedCreatedGroup: true })
    const orderOptions = fixtureRoute(fixture, 'GET', orderOptionsPattern)
    orderOptions.responseSequence.push(structuredClone(orderOptions.response))
    orderOptions.transport = { abortSequence: [false, false, true, false] }
    orderOptions.assert.maxCount = 4
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    const errorHeading = page.getByRole('heading', { name: 'We couldn’t refresh your carts. Check your cart before placing your order.' })
    await expect(errorHeading).toBeFocused()
    await expect(page).toHaveURL(/\/multi-cart$/)
    expect(matchingRequests(requestLog, 'GET', orderOptionsPattern)).toHaveLength(2)
    expect(matchingRequests(requestLog, 'GET', groupPattern)).toHaveLength(0)
    const retry = page.getByRole('button', { name: 'Try again' })
    await page.keyboard.press('Tab')
    await expect(retry).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(3)
    await expect(page.getByRole('status')).toHaveText('We still couldn’t refresh your carts.')
    await expect(retry).toBeFocused()
    await expect(retry).toBeEnabled()
    await expect(page).toHaveURL(/\/multi-cart$/)
    await page.keyboard.press('Enter')
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(4)
    await expect(page).toHaveURL(/\/multi-checkout\/synthetic-cart-group-4401$/)
    await expect.poll(() => matchingRequests(requestLog, 'GET', groupPattern).length).toBeGreaterThan(0)
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('network failure during the post-create refresh is caught and still hands off @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Refresh transport boundary runs once on desktop.')
    const { fixture, requestLog } = await setup(page, { refreshAbort: true })
    assertExactCreateGroup(requestLog, ['synthetic-multi-cart-a', 'synthetic-multi-cart-b'])
    await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(2)
    await expect.poll(() => hasNavigation(page, 'replaceState', '/multi-checkout/synthetic-cart-group-4401')).toBe(true)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  for (const { name, groups } of [
    { name: 'separate groups', groups: ['synthetic-existing-group-a', 'synthetic-existing-group-b'] },
    { name: 'a partially grouped pair', groups: ['synthetic-existing-group-a', null] },
    { name: 'a shared group', groups: [groupUuid, groupUuid] }
  ]) {
    for (const uuid of ['synthetic-multi-cart-a', 'synthetic-multi-cart-b']) {
      test(`per-business Checkout opens ${uuid} for ${name} @desktop-chromium`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Per-business handoff runs once on desktop.')
        const { fixture, requestLog, cart } = await setupGroupedHeader(page, groups)
        await expect(cart.locator("[data-doc-control='multi-cart-group-checkout']")).toHaveCount(groups[0] === groups[1] ? 1 : 0)
        const businessCheckout = cart
          .locator(`[data-doc-section='cart'][data-doc-cart-uuid='${uuid}']`)
          .locator("[data-doc-control='cart-checkout']")
        await expect(businessCheckout).toBeVisible()
        await businessCheckout.click()
        await expect(page).toHaveURL(new RegExp(`/checkout/${uuid}$`))
        await assertSafeNetwork(page, fixture, requestLog)
        expect(matchingRequests(requestLog, 'POST', createGroupPattern)).toHaveLength(0)
      })
    }
  }
})
