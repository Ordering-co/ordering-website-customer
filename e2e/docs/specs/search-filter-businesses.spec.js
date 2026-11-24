import { expect, test } from '@playwright/test'
import { disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture, setSharedReadLimit } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'
import { runCaptureScenario } from '../lib/scenario.js'

const manifest = await loadManifest('search-filter-businesses.manifest')
const searchPath = '/v400/en/docsmarket/search?'
const kitchenDetailPattern = '^/v400/en/docsmarket/business/synthetic-kitchen(?:\\?.*)?$'
const trackingPattern = '^/v400/en/docsmarket/tracking_events$'
const businessTypesPattern = '^/v400/en/docsmarket/business_types(?:\\?.*)?$'
const fixedLocation = { lat: 12.3456, lng: -45.6789 }
const filterParameterNames = [
  'price_level',
  'franchise_ids',
  'max_delivery_price',
  'max_eta',
  'max_distance',
  'business_types'
]
const baseParameterNames = [
  'order_type_id',
  'excludes',
  'orderBy',
  'page',
  'page_size',
  'location'
]

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const searchRequests = (requestLog) => requestLog.matched.filter(
  (request) => request.method === 'GET' && request.url.startsWith(searchPath)
)

const searchUrl = (request) => new URL(request.url, 'https://api.docs.invalid')

const verifyCommonSearchQuery = (request) => {
  const url = searchUrl(request)
  expect(url.searchParams.get('order_type_id')).toBe('1')
  expect(url.searchParams.get('orderBy')).toBe('distance')
  expect(url.searchParams.get('page')).toBe('1')
  expect(url.searchParams.get('page_size')).toBe('25')
  expect(JSON.parse(url.searchParams.get('location'))).toEqual(fixedLocation)
}

const verifyBaseSearchQuery = (request) => {
  verifyCommonSearchQuery(request)
  const url = searchUrl(request)
  expect(url.searchParams.get('excludes')).toBe('categories')
  expect(url.searchParams.has('term')).toBe(false)
}

const verifyExactFilteredQuery = (request, expectedFilters) => {
  verifyBaseSearchQuery(request)
  const url = searchUrl(request)
  expect([...url.searchParams.keys()].sort()).toEqual(
    [...baseParameterNames, ...Object.keys(expectedFilters)].sort()
  )
  for (const parameter of filterParameterNames) {
    if (Object.hasOwn(expectedFilters, parameter)) {
      expect(url.searchParams.getAll(parameter)).toEqual([expectedFilters[parameter]])
    } else {
      expect(url.searchParams.has(parameter)).toBe(false)
    }
  }
}

const verifyTermSearchQuery = (request, term) => {
  verifyCommonSearchQuery(request)
  const url = searchUrl(request)
  expect(url.searchParams.get('term')).toBe(term)
  expect(url.searchParams.has('excludes')).toBe(false)
}

const waitForSearchRequest = async (requestLog, predicate, previousCount = 0) => {
  await expect.poll(() => searchRequests(requestLog).filter(predicate).length, { timeout: 15000 }).toBeGreaterThan(previousCount)
  return searchRequests(requestLog).filter(predicate).at(-1)
}

const waitForResults = async (page) => {
  const root = page.locator("[data-doc-section='business-search']")
  await expect(root).toHaveAttribute('data-doc-state', 'results')
  await expect(root.getByText('Synthetic Kitchen').first()).toBeVisible()
  await expect(root.getByText('Fixture Bakery').first()).toBeVisible()
}

const typeSearchTerm = async (page, requestLog, term) => {
  const input = page.locator("[data-doc-control='business-search-term'] input")
  await input.click()
  await input.press('ControlOrMeta+A')
  const previousCount = searchRequests(requestLog).filter((request) => searchUrl(request).searchParams.get('term') === term.toLowerCase()).length
  await input.pressSequentially(term, { delay: 25 })
  return waitForSearchRequest(
    requestLog,
    (request) => searchUrl(request).searchParams.get('term') === term.toLowerCase(),
    previousCount
  )
}

const installNavigationProbe = async (page) => {
  await page.evaluate(() => {
    window.__docsNavigationAttempts = []
    window.history.pushState = (_state, _title, url) => {
      window.__docsNavigationAttempts.push(String(url))
    }
    window.history.replaceState = (_state, _title, url) => {
      window.__docsNavigationAttempts.push(String(url))
    }
  })
}

const prepareCapture = async ({ page, capture, requestLog }) => {
  const root = page.locator("[data-doc-section='business-search']")

  if (capture.id === 'business-search-price-filter-desktop') {
    await waitForResults(page)
    const previousCount = searchRequests(requestLog).length
    await page.locator("[data-doc-control='business-filter-price-range']").click()
    const dialog = page.locator("[data-doc-section='business-search-filter-dialog']")
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: '$$', exact: true }).click()
    const request = await waitForSearchRequest(
      requestLog,
      (entry) => searchUrl(entry).searchParams.get('price_level') === '2',
      0
    )
    expect(searchRequests(requestLog).length).toBeGreaterThan(previousCount)
    expect(searchUrl(request).searchParams.get('price_level')).toBe('2')
    return
  }

  if (capture.id === 'business-search-category-filter-mobile') {
    await waitForResults(page)
    await page.locator("[data-doc-control='business-filter-categories']").click()
    const dialog = page.locator("[data-doc-section='business-search-filter-dialog']")
    await expect(dialog).toBeVisible()
    await expect.poll(() => matchingRequests(requestLog, 'GET', businessTypesPattern).length).toBe(1)
    await dialog.getByRole('button', { name: 'Restaurant', exact: true }).click()
    const request = await waitForSearchRequest(
      requestLog,
      (entry) => searchUrl(entry).searchParams.get('business_types') === '[8601]',
      0
    )
    expect(searchUrl(request).searchParams.get('business_types')).toBe('[8601]')
    return
  }

  if (capture.id.includes('product')) {
    const request = await typeSearchTerm(page, requestLog, 'Synthetic')
    verifyTermSearchQuery(request, 'synthetic')
    await expect(root.getByText('Synthetic Market Bowl')).toBeVisible()
    await expect(root.getByText('Fixture Sold-out Salad')).toBeVisible()
    if (capture.id.includes('dialog')) {
      const storageBefore = await page.evaluate(() => JSON.stringify({ ...window.localStorage }))
      await root.getByText('Synthetic Market Bowl').click()
      await expect(page.locator("[data-doc-section='business-search-product-dialog']")).toBeVisible()
      await expect(page.locator("[data-doc-section='product-customization']")).toBeVisible()
      const storageAfter = await page.evaluate(() => JSON.stringify({ ...window.localStorage }))
      expect(storageAfter).toBe(storageBefore)
      expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
    }
    return
  }

  if (capture.id === 'business-search-empty-desktop') {
    const request = await typeSearchTerm(page, requestLog, 'NoResult')
    verifyTermSearchQuery(request, 'noresult')
    await expect(root).toHaveAttribute('data-doc-state', 'empty')
    await expect(root.getByText('No businesses available at this address')).toBeVisible()
    return
  }

  if (capture.id === 'business-search-map-desktop') {
    await page.goto('/business_search?lat=12.3456&lng=-45.6789&view=map', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, capture.selector)
    await expect(root).toHaveAttribute('data-doc-state', 'map')
    await expect(page.locator("[data-doc-section='business-search-map'] [data-doc-map-ready='true']")).toBeVisible()
    await expect(page.locator("[data-doc-control='business-search-map-marker']")).toHaveCount(2)
    await expect(page.locator("[data-doc-control='business-search-term'] input")).toHaveCount(0)
    await expect(page.locator("[data-doc-section='business-search-filters']")).toBeVisible()
    return
  }

  await waitForResults(page)
}

test.describe('Search, filter, and map businesses documentation', () => {
  test('delivery fee respects the configured euro symbol and preserves search values', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const fixture = await loadFixture(manifest.fixture)
    fixture.firstLoad.configs.format_number_currency.value = '€'
    fixture.firstLoad.configs.format_number_decimal_separator = { value: '.' }
    fixture.localStorage.iosPwaPrompt = JSON.stringify({ isiOS: true, visits: 100 })
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-search']")
    await waitForResults(page)
    await page.locator("[data-doc-control='business-filter-delivery-fee']").click()
    const dialog = page.locator("[data-doc-section='business-search-filter-dialog']")
    await expect(dialog).toBeVisible()
    for (const label of ['€ 1.00', '€ 2.00', '€ 5.00', '€ 5.00+']) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(dialog.getByText(/\$/)).toHaveCount(0)
    await dialog.screenshot({ path: testInfo.outputPath('delivery-fee-euro.png') })
    await dialog.getByText('€ 2.00', { exact: true }).click()
    await expect(dialog.getByText('Under € 2.00', { exact: true })).toBeVisible()
    const request = await waitForSearchRequest(requestLog, (entry) => searchUrl(entry).searchParams.get('max_delivery_price') === '2')
    verifyExactFilteredQuery(request, { max_delivery_price: '2' })
    await dialog.getByText('Reset', { exact: true }).click()
    await expect.poll(() => searchUrl(searchRequests(requestLog).at(-1)).searchParams.has('max_delivery_price')).toBe(false)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

      const requestLog = await runCaptureScenario({
        page,
        manifest,
        capture,
        beforeCapture: async ({ page, fixture, requestLog }) => {
          if (['business-search-results-desktop', 'business-search-map-desktop'].includes(capture.id)) {
            const listings = fixture.routes.filter(({ response }) => Array.isArray(response?.result))
            const kitchen = listings.flatMap(({ response }) => response.result)
              .find(business => business.slug === 'synthetic-kitchen')
            fixture.routes.push({
              method: 'GET',
              pattern: kitchenDetailPattern,
              assert: { maxCount: 1 },
              response: { error: false, result: { ...kitchen, categories: [] } }
            })
          }
          if (capture.id === 'business-search-map-desktop') {
            // The map capture navigates to a new document with view=map.
            setSharedReadLimit(fixture, 'languages', 2)
            setSharedReadLimit(fixture, 'pages', 2)
          }
          await prepareCapture({ page, capture, requestLog })
        }
      })

      const baseRequests = searchRequests(requestLog).filter((request) => searchUrl(request).searchParams.get('excludes') === 'categories')
      expect(baseRequests.length).toBeGreaterThanOrEqual(1)
      verifyBaseSearchQuery(baseRequests[0])
      expect(requestLog.unknown).toHaveLength(0)

      if (capture.id === 'business-search-results-desktop') {
        await installNavigationProbe(page)
        await page.getByText('Synthetic Kitchen').first().click()
        await expect.poll(() => page.evaluate(() => window.__docsNavigationAttempts)).toContain('/store/synthetic-kitchen')
        await expect.poll(() => matchingRequests(requestLog, 'GET', kitchenDetailPattern).length).toBe(1)
        await waitForRequestQuiescence(requestLog, manifest.readiness.network)
        expect(matchingRequests(requestLog, 'GET', kitchenDetailPattern)).toHaveLength(1)
        expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
        assertNoUnknownRequests(requestLog)
      }

      if (capture.id === 'business-search-map-desktop') {
        await installNavigationProbe(page)
        await page.locator("[data-doc-control='business-search-map-marker']").first().click()
        await expect.poll(() => page.evaluate(() => window.__docsNavigationAttempts)).toContain('/store/synthetic-kitchen')
        await waitForRequestQuiescence(requestLog, manifest.readiness.network)
        expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
        assertNoUnknownRequests(requestLog)
      }
    })
  }

  test('reachable filters map to exact search parameters @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Contract exercise runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-search']")
    await waitForResults(page)

    const allowedOrderTypes = fixture.firstLoad.configs.order_types_allowed.value.split('|')
    expect(allowedOrderTypes).toEqual(['1', '2'])
    expect(allowedOrderTypes).not.toContain('9')
    const expectedFilters = {}

    const selectFilter = async ({ control, option, param, value }) => {
      const prior = searchRequests(requestLog).filter((request) => searchUrl(request).searchParams.get(param) === value).length
      await page.locator(`[data-doc-control='${control}']`).click()
      const dialog = page.locator("[data-doc-section='business-search-filter-dialog']")
      await expect(dialog).toBeVisible()
      await dialog.getByText(option, { exact: true }).click()
      const request = await waitForSearchRequest(
        requestLog,
        (entry) => searchUrl(entry).searchParams.get(param) === value,
        prior
      )
      expectedFilters[param] = value
      verifyExactFilteredQuery(request, expectedFilters)
      await dialog.getByRole('button', { name: 'View Results' }).click()
      await expect(dialog).toBeHidden()
    }

    await selectFilter({ control: 'business-filter-price-range', option: '$$', param: 'price_level', value: '2' })
    await selectFilter({ control: 'business-filter-brands', option: 'Synthetic Group', param: 'franchise_ids', value: '[8501]' })
    await selectFilter({ control: 'business-filter-delivery-fee', option: '$ 2,00', param: 'max_delivery_price', value: '2' })
    await selectFilter({ control: 'business-filter-fulfillment-time', option: '15 min', param: 'max_eta', value: '15' })
    await selectFilter({ control: 'business-filter-distance', option: /^2 km$/i, param: 'max_distance', value: '2000' })
    await selectFilter({ control: 'business-filter-categories', option: 'Restaurant', param: 'business_types', value: '[8601]' })

    const typeRequests = matchingRequests(requestLog, 'GET', businessTypesPattern)
    expect(typeRequests).toHaveLength(1)
    const typeUrl = new URL(typeRequests[0].url, 'https://api.docs.invalid')
    expect(JSON.parse(typeUrl.searchParams.get('where'))).toEqual([{ attribute: 'enabled', value: true }])
    expect(JSON.parse(typeUrl.searchParams.get('location'))).toEqual(fixedLocation)
    expect(typeUrl.searchParams.get('order_type_id')).toBe('1')

    await page.locator("[data-doc-control='business-filter-categories']").click()
    const dialog = page.locator("[data-doc-section='business-search-filter-dialog']")
    const resetPrior = searchRequests(requestLog).filter(
      (entry) => !searchUrl(entry).searchParams.has('business_types') && searchUrl(entry).searchParams.get('price_level') === '2'
    ).length
    await dialog.getByText('Reset', { exact: true }).click()
    const resetRequest = await waitForSearchRequest(
      requestLog,
      (entry) => !searchUrl(entry).searchParams.has('business_types') && searchUrl(entry).searchParams.get('price_level') === '2',
      resetPrior
    )
    delete expectedFilters.business_types
    verifyExactFilteredQuery(resetRequest, expectedFilters)

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })
})
