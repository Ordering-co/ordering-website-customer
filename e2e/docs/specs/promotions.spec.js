import { expect, test } from '@playwright/test'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('promotions.manifest')
const offersPattern = '^/v400/en/docsmarket/offers/public(?:\\?.*)?$'
const trackingPattern = '^/v400/en/docsmarket/tracking_events$'
const expectedParams = [
  'id',
  'name',
  'description',
  'businesses',
  'sites',
  'image',
  'end',
  'start',
  'paymethods',
  'type',
  'minimum',
  'rate_type',
  'rate',
  'coupon',
  'limit',
  'enabled',
  'label',
  'rank',
  'condition_type',
  'target',
  'max_discount',
  'stackable',
  'auto',
  'loyalty_levels',
  'public',
  'limit_per_user',
  'user_order_count',
  'user_order_count_condition',
  'valid_from_after_user_last_order_minutes',
  'valid_until_after_user_last_order_minutes',
  'include_products_with_offer'
]

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const verifyOffersQuery = (request) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect(url.searchParams.get('enabled')).toBe('true')
  expect(url.searchParams.get('params')?.split(',')).toEqual(expectedParams)
  expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 30.2672, lng: -97.7431 })
  expect(url.searchParams.get('order_type_id')).toBe('1')
  expect(url.searchParams.has('franchise_id')).toBe(false)
}

const preparePromotionsState = async (page, capture) => {
  const promotions = page.locator("[data-doc-section='promotions']")

  if (capture.id === 'promotions-error-desktop') {
    await expect(promotions).toHaveAttribute('data-doc-state', 'error')
    await expect(promotions.getByText('Synthetic offers are temporarily unavailable.')).toBeVisible()
    return
  }

  if (capture.id === 'promotions-empty-desktop') {
    await expect(promotions).toHaveAttribute('data-doc-state', 'empty')
    await expect(promotions.getByText('No promotions available right now')).toBeVisible()
    await expect(promotions.getByText('Check back later for new offers in your area.')).toBeVisible()
    return
  }

  await expect(promotions).toHaveAttribute('data-doc-state', 'results')
  await expect(promotions.getByText('Synthetic Summer Savings')).toBeVisible()
  await expect(promotions.getByText('Fixture Delivery Credit')).toBeVisible()

  if (capture.id === 'promotions-details-desktop') {
    await promotions.locator("[data-doc-control='promotion-open']").first().click()
    const details = page.locator("[data-doc-section='promotion-details']")
    await expect(details).toBeVisible()
    await expect(details.getByText('SYNTHETIC20')).toBeVisible()
    await expect(details.getByText('Available businesses for this offer')).toBeVisible()
  }

  if (capture.id === 'promotions-search-empty-desktop') {
    const search = promotions.locator("[data-doc-control='promotions-search'] input")
    await search.click()
    await search.pressSequentially('No matching synthetic offer')
    await expect(promotions).toHaveAttribute('data-doc-state', 'search-empty')
    await expect(promotions.getByText('No promotions match your search')).toBeVisible()
    await expect(promotions.getByText('Try a different search term.')).toBeVisible()
  }
}

const runPromotionsCapture = async ({ page, capture, scenario = 'success', captureImage = true }) => {
  const fixture = structuredClone(await loadFixture(manifest.fixture))
  if (scenario !== 'success') {
    const offersRoute = fixture.routes.find((route) => route.method === 'GET' && route.pattern === offersPattern)
    offersRoute.response = fixture.scenarioResponses[scenario]
  }

  const requestLog = createRequestLog()
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await waitForDocumentationReady(page, manifest.readiness, capture.selector)
  await preparePromotionsState(page, capture)
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)

  if (captureImage) {
    const section = page.locator(capture.selector)
    await expect(section).toBeVisible()
    await captureSection({ page, locator: section, filename: capture.file })
  }
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  assertFixtureRequests(fixture, requestLog)
  return requestLog
}

test.describe('Promotions documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

      const scenario = capture.id === 'promotions-error-desktop'
        ? 'error'
        : capture.id === 'promotions-empty-desktop'
          ? 'empty'
          : 'success'
      const requestLog = await runPromotionsCapture({ page, capture, scenario })
      const offersRequests = matchingRequests(requestLog, 'GET', offersPattern)
      expect(offersRequests).toHaveLength(1)
      verifyOffersQuery(offersRequests[0])
      expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
      expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)

      if (capture.id === 'promotions-search-empty-desktop') {
        expect(matchingRequests(requestLog, 'GET', offersPattern)).toHaveLength(1)
      }

      if (capture.id === 'promotions-details-desktop') {
        await page.evaluate(() => {
          window.__docsNavigationAttempts = []
          window.history.pushState = (_state, _title, url) => {
            window.__docsNavigationAttempts.push(String(url))
          }
        })
        await page.locator("[data-doc-section='promotion-details'] [data-doc-control='promotion-open-business']").first().click()
        await expect.poll(() => page.evaluate(() => window.__docsNavigationAttempts)).toContain('/store/synthetic-kitchen')
        expect(matchingRequests(requestLog, 'GET', offersPattern)).toHaveLength(1)
        expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
        expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
        expect(requestLog.unknown).toHaveLength(0)
      }
    })
  }
})

test('the Promotions Clear action stays on the physical right in RTL and responds inside the field', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
  const capture = manifest.captures.find(({ id }) => id === 'promotions-search-empty-desktop')
  await runPromotionsCapture({ page, capture, captureImage: false })
  const promotions = page.locator("[data-doc-section='promotions']")
  await promotions.evaluate((section) => {
    section.dir = 'rtl'
    section.style.direction = 'rtl'
  })
  const field = promotions.locator("[data-doc-control='promotions-search'] input")
  const clear = promotions.getByRole('button', { name: 'Clear', exact: true })
  await expect(clear).toBeVisible()
  await expect(field).toHaveCSS('direction', 'rtl')
  const inputBox = await field.boundingBox()
  const clearBox = await clear.boundingBox()
  const slot = await clear.locator('..').boundingBox()
  expect(slot.width).toBeCloseTo(clearBox.width, 1)
  const x = clearBox.x + clearBox.width / 2
  const y = clearBox.y + clearBox.height / 2
  expect(x).toBeGreaterThan(inputBox.x + inputBox.width / 2)
  expect(x).toBeLessThan(inputBox.x + inputBox.width)
  expect(y).toBeGreaterThan(inputBox.y)
  expect(y).toBeLessThan(inputBox.y + inputBox.height)
  await page.mouse.click(x, y)
  await expect(field).toHaveValue('')
  await expect(promotions).toHaveAttribute('data-doc-state', 'results')
})

for (const dir of ['ltr', 'rtl']) {
  test(`Promotions Clear drops its offset when hovered or pressed in ${dir.toUpperCase()}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Measures pointer hover.')
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const capture = manifest.captures.find(({ id }) => id === 'promotions-search-empty-desktop')
    await runPromotionsCapture({ page, capture, captureImage: false })
    const promotions = page.locator("[data-doc-section='promotions']")
    await promotions.evaluate((section, direction) => {
      section.dir = direction
      section.style.direction = direction
    }, dir)
    const field = promotions.locator("[data-doc-control='promotions-search'] input")
    const clear = promotions.getByRole('button', { name: 'Clear', exact: true })
    const slot = clear.locator('..')
    await expect(field).toHaveCSS('direction', dir)
    await promotions.getByRole('heading', { name: 'Offers' }).hover()
    const rest = await slot.boundingBox()
    const input = await field.boundingBox()
    const right = input.x + input.width
    const edge = (rect) => rect.x + rect.width
    const sign = dir === 'rtl' ? 1 : -1
    expect(edge(rest) - right).toBeCloseTo(sign * rest.width * 0.3, 1)
    await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
    await expect.poll(async () => Math.abs(edge(await slot.boundingBox()) - right)).toBeLessThan(0.1)
    await page.mouse.down()
    await expect.poll(async () => Math.abs(edge(await slot.boundingBox()) - right)).toBeLessThan(0.1)
    await page.mouse.up()
    await expect(field).toHaveValue('')
  })
}
