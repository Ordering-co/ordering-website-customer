import { expect, test } from '@playwright/test'
import { APP_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import { assertOrderIsolation, initializeOrderPage, insertWriteRoute, orderFixture, settleOrderPage } from '../lib/order-actions.js'

const manifest = await loadManifest('reorder-reviews.manifest')

const modeFor = id => {
  if (id.includes('product')) return 'product'
  if (id.includes('driver')) return 'driver'
  if (id.includes('confirm')) return 'confirm'
  if (id.includes('review-business')) return 'business'
  return 'terminal'
}

const configureMode = async (mode, write = null) => orderFixture('reorder-reviews', ({ fixture, order, orderOptions }) => {
  const result = order.response.result
  delete result.review
  delete result.customer_id
  delete result.paymethod_id
  delete result.driver
  delete result.user_review

  if (mode === 'product') {
    result.review = { id: 9801 }
    result.customer_id = 9301
    result.paymethod_id = 1
    result.driver = { id: 9601, name: 'Synthetic Driver', lastname: 'Synthetic Courier', photo: '' }
  }
  if (mode === 'driver') {
    result.review = { id: 9801 }
    result.driver = { id: 9601, name: 'Synthetic Driver', lastname: 'Synthetic Courier', photo: '' }
  }
  if (mode === 'confirm') {
    orderOptions.assert = { count: 1 }
    orderOptions.response.result = {
      user_id: 9301,
      type: 1,
      carts: [{
        uuid: 'docs-cart-existing',
        business_id: 8101,
        status: 0,
        valid: true,
        total: 7,
        balance: 7,
        products: [{ id: 8251, product_id: 8251, code: 'docs-existing-line', name: 'Fixture Existing Item', quantity: 1, price: 7, total: 7, valid: true }],
        business: { id: 8101, name: 'Synthetic Kitchen', slug: 'synthetic-kitchen' }
      }]
    }
  }
  if (write) insertWriteRoute(fixture, write)
})

const openMode = async (page, mode) => {
  if (['business', 'product', 'driver'].includes(mode)) {
    await page.locator("[data-doc-control='order-review-open']").click()
    await expect(page.locator(`[data-doc-section='order-review-${mode}']`)).toBeVisible()
  }
  if (mode === 'confirm') {
    await page.locator("[data-doc-control='order-again']").click()
    const confirm = page.locator("[data-doc-section='order-again-confirmation']")
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText('Are you sure that you want to delete all products from cart?')
  }
}

const setup = async (page, capture, { mode = modeFor(capture?.id || ''), write = null } = {}) => {
  const fixture = await configureMode(mode, write)
  assertFixturePrivacy(fixture)
  const runtime = await initializeOrderPage({ page, fixture, mobile: capture?.project === 'mobile-chromium' })
  await disableMotion(page)
  const settled = await settleOrderPage({ page, fixture, requestLog: runtime.requestLog, network: manifest.readiness.network })
  const root = page.locator("[data-doc-section='order-details-terminal']")
  await expect(root).toBeVisible()
  await expect(root.getByRole('button', { name: 'Order again' })).toBeVisible()
  await openMode(page, mode)
  if (mode !== 'terminal') await waitForDocumentationReady(page, { ...manifest.readiness, selectors: [capture?.selector || `[data-doc-section='order-review-${mode}']`] })
  return { ...settled, ...runtime, mode }
}

const oneWrite = (runtime, pattern) => {
  const writes = runtime.requestLog.matched.filter(item => item.method !== 'GET')
  expect(writes).toHaveLength(1)
  expect(writes[0].pattern).toBe(pattern)
  expect(runtime.writeMetadata).toHaveLength(1)
  return writes[0]
}

test.describe('Order again and reviews documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      if (runtime.mode === 'business') {
        await expect(page.locator("[data-doc-section='order-review-business']")).toContainText('Rate the business')
        await expect(page.locator("[data-doc-control='order-review-submit']")).toBeVisible()
      }
      if (runtime.mode === 'product') {
        await expect(page.locator("[data-doc-section='order-review-product']")).toContainText('Rate your item')
        await expect(page.locator("[data-doc-control='product-review-submit']")).toBeDisabled()
      }
      if (runtime.mode === 'driver') {
        await expect(page.locator("[data-doc-section='order-review-driver']")).toContainText('Synthetic Driver')
        await expect(page.locator("[data-doc-control='driver-review-submit']")).toBeVisible()
      }
      await captureSection({ page, locator: page.locator(capture.selector), filename: capture.file, captureMode: capture.capture_mode })
      await assertOrderIsolation({ page, ...runtime, allowedWrites: 0, network: manifest.readiness.network })
    })
  }

  test('no-cart Order again sends one controlled reorder error and no sibling effect @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const pattern = '^/v400/en/docsmarket/orders/8701/reorder$'
    const runtime = await setup(page, null, {
      mode: 'terminal',
      write: { method: 'POST', pattern, assert: { count: 1 }, response: { error: true, result: ['Synthetic reorder stopped before cart creation.'] } }
    })
    await page.locator("[data-doc-control='order-again']").click()
    const request = oneWrite(runtime, pattern)
    expect(request.body).toEqual({})
    expect(runtime.writeMetadata[0]).toEqual({ method: 'POST', pathname: '/v400/en/docsmarket/orders/8701/reorder', queryKeys: [], hasAuthorization: true, hasApp: true, hasInternal: true, hasSocket: true, hasCountry: true })
    await expect(page).toHaveURL(`${APP_ORIGIN}/orders/docs-order-active`)
    await assertOrderIsolation({ page, ...runtime, allowedWrites: 1, network: manifest.readiness.network })
  })

  test('business review sends one exact controlled error and no follow-up @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const pattern = '^/v400/en/docsmarket/business/8101/reviews$'
    const runtime = await setup(page, null, {
      mode: 'business',
      write: { method: 'POST', pattern, assert: { count: 1 }, response: { error: true, result: ['Synthetic business review stopped.'] } }
    })
    await page.locator("[data-doc-control='order-review-like']").click()
    await page.locator("[data-doc-control='order-review-submit']").click()
    const request = oneWrite(runtime, pattern)
    expect(request.body).toEqual({ quality: 5, delivery: 5, service: 5, package: 5, comment: '', user_id: 9301, order_id: 8701, business_id: 8101 })
    await assertOrderIsolation({ page, ...runtime, allowedWrites: 1, network: manifest.readiness.network })
  })

  test('product review sends one exact controlled error and no follow-up @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const pattern = '^/v400/en/docsmarket/orders/8701/product_reviews$'
    const runtime = await setup(page, null, {
      mode: 'product',
      write: { method: 'POST', pattern, assert: { count: 1 }, response: { error: true, result: ['Synthetic product review stopped.'] } }
    })
    await page.locator("[data-doc-control='product-review-dislike']").click()
    await page.locator("[data-doc-control='product-review-submit']").click()
    const request = oneWrite(runtime, pattern)
    expect(Object.keys(request.body)).toEqual(['reviews'])
    expect(JSON.parse(request.body.reviews)).toEqual([{ product_id: 8201, comment: '', qualification: 1 }])
    await assertOrderIsolation({ page, ...runtime, allowedWrites: 1, network: manifest.readiness.network })
  })

  test('driver review sends one exact controlled error and no follow-up @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const pattern = '^/v400/en/docsmarket/users/9601/user_reviews$'
    const runtime = await setup(page, null, {
      mode: 'driver',
      write: { method: 'POST', pattern, assert: { count: 1 }, response: { error: true, result: ['Synthetic driver review stopped.'] } }
    })
    await page.locator("[data-doc-control='driver-review-submit']").click()
    const request = oneWrite(runtime, pattern)
    expect(request.body).toEqual({ qualification: 5, comment: '', order_id: 8701, user_id: 9601 })
    await assertOrderIsolation({ page, ...runtime, allowedWrites: 1, network: manifest.readiness.network })
  })

  test.skip('professional review remains source-only after the successful product-review cascade', async () => {})
  test.skip('confirmation Close, Cancel, Accept, Escape, and backdrop remain excluded', async () => {})
  test.skip('grouped reorder and review partial-write behavior remains excluded', async () => {})
})
