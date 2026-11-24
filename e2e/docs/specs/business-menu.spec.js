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

const manifest = await loadManifest('business-menu.manifest')
const businessPatterns = {
  'synthetic-market': '^/v400/en/docsmarket/business/synthetic-market(?:\\?.*)?$',
  'fixture-bakery': '^/v400/en/docsmarket/business/fixture-bakery(?:\\?.*)?$',
  'empty-fixture-market': '^/v400/en/docsmarket/business/empty-fixture-market(?:\\?.*)?$'
}

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const expectedSlug = (capture) => {
  if (capture.id.includes('closed')) return 'fixture-bakery'
  if (capture.id.includes('empty')) return 'empty-fixture-market'
  return 'synthetic-market'
}

const verifyCatalogRequest = (request, slug) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect(url.pathname).toBe(`/v400/en/docsmarket/business/${slug}`)
  expect(url.searchParams.get('version')).toBe('v2')
  expect(url.searchParams.get('type')).toBe('2')
  expect(url.searchParams.get('location')).toBe('30.2672,-97.7431')

  const fields = new Set((url.searchParams.get('params') || '').split(','))
  for (const field of ['id', 'name', 'open', 'schedule', 'today', 'reviews', 'products', 'configs']) {
    expect(fields.has(field)).toBe(true)
  }
}

const waitForMenuState = async (page, state) => {
  const root = page.locator("[data-doc-section='business-menu']")
  await expect(root).toHaveAttribute('data-doc-state', state)
  return root
}

const prepareCapture = async ({ page, capture }) => {
  if (capture.id.includes('empty')) {
    const root = await waitForMenuState(page, 'empty')
    await expect(root.getByText('Empty Fixture Market')).toBeVisible()
    await expect(root.getByText('No products available right now')).toBeVisible()
    return
  }

  const root = await waitForMenuState(page, 'results')

  if (capture.id.includes('closed')) {
    await expect(root.getByRole('heading', { name: 'Fixture Bakery', level: 1 })).toBeVisible()
    await expect(root.getByText(/^Closed · Opens /)).toBeVisible()
    await expect(root.locator("[data-doc-control='business-preorder-entry']")).toBeVisible()
    await expect(page.locator("[data-doc-section='business-preorder']")).toHaveCount(0)
    return
  }

  await expect(root.getByText('Synthetic Market Kitchen')).toBeVisible()
  await expect(root.getByText('100 Synthetic Market Street').first()).toBeVisible()
  await expect(root.getByText('Service fee', { exact: true })).toHaveCount(0)
  await expect(root.getByText('15min Pickup time', { exact: true })).toBeVisible()
  await expect(root.locator("[data-doc-control='business-information']")).toBeVisible()
  await expect(root.locator("[data-doc-section='business-menu-categories']")).toBeVisible()
  await expect(root.getByRole('heading', { name: 'Bowls', level: 2 })).toBeVisible()
  await expect(root.getByRole('heading', { name: 'Drinks', level: 2 })).toBeVisible()
  await page.locator('#category8312').scrollIntoViewIfNeeded()
  await expect(root.getByText('Synthetic Citrus Sparkler').first()).toBeVisible()
  await page.locator('#category8311').scrollIntoViewIfNeeded()
  await expect(root.getByText('Synthetic Market Bowl').first()).toBeVisible()
  await expect(root.getByText('$ 12.50', { exact: true })).toBeVisible()
  await expect(root.getByText('$ 4.50', { exact: true })).toBeVisible()
  await expect(root.locator("[data-doc-control='business-reviews']")).toBeVisible()
  await expect(root.locator("[data-doc-control='business-reservation-entry']")).toHaveCount(0)

  if (capture.id.includes('information')) {
    await root.locator("[data-doc-control='business-information']").click()
    const dialog = page.locator("[data-doc-section='business-information-dialog']")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('A synthetic business used only for documentation capture.')).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Schedule', level: 3 })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(root.getByText('Synthetic Market Bowl').first()).toBeVisible()
    await root.locator("[data-doc-control='business-information']").click()
    await expect(dialog).toBeVisible()
    return
  }

  if (capture.id === 'business-menu-mobile') {
    await expect(page.getByText('Pickup', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('ASAP', { exact: true }).first()).toBeVisible()
    await expect(root.locator('#search-component').first()).toBeVisible()
    await expect(root.locator("[data-doc-section='business-menu-header'] img")).toHaveCount(0)
    const categoriesBox = await root.locator("[data-doc-section='business-menu-categories']").boundingBox()
    const orderContextBox = await page.getByText('Pickup', { exact: true }).first().boundingBox()
    expect(orderContextBox.y).toBeLessThan(categoriesBox.y)
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.addStyleTag({
      content: "[data-doc-section='mobile-bottom-navigation'] { display: none !important; }"
    })
  }

  await page.evaluate(() => {
    window.scrollTo(0, 0)
    window.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
}

test.describe('Browse a business and its menu documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

      const requestLog = await runCaptureScenario({
        page,
        manifest,
        capture,
        beforeCapture: ({ page, capture }) => prepareCapture({ page, capture })
      })

      const slug = expectedSlug(capture)
      const catalogRequests = matchingRequests(requestLog, 'GET', businessPatterns[slug])
      expect(catalogRequests).toHaveLength(slug === 'fixture-bakery' ? 2 : 1)
      if (slug === 'fixture-bakery') {
        expect(new URL(catalogRequests[1].url, 'https://api.docs.invalid').searchParams.get('ignore_menu_schedule')).toBe('1')
      }
      verifyCatalogRequest(catalogRequests[0], slug)
      expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
      expect(requestLog.unknown).toHaveLength(0)
    })
  }

  // implementation notesgetBusiness sends the plain ASAP request first; only once that
  // response says the business is actually closed does it retry with
  // ignore_menu_schedule=1 (ordering-components 750e8ca), so an open store never
  // shows an out-of-hours menu by accident.
  test('closed business in ASAP shows the full menu, the "Closed · Opens" label, and retries with ignore_menu_schedule @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'ASAP ignore_menu_schedule contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    await page.goto('/store/fixture-bakery?lat=30.2672&lng=-97.7431&order_type=2', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const root = await waitForMenuState(page, 'results')
    await expect(root.getByRole('heading', { name: 'Fixture Bakery' })).toBeVisible()
    await expect(root.getByRole('heading', { name: 'Breads' })).toBeVisible()
    await expect(root.getByText('Fixture Country Loaf').first()).toBeVisible()
    await expect(root.getByText(/Closed · Opens/)).toBeVisible()

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const closedRequests = matchingRequests(requestLog, 'GET', businessPatterns['fixture-bakery'])
    expect(closedRequests).toHaveLength(2)
    const [firstLoad, retry] = closedRequests.map((request) => new URL(request.url, 'https://api.docs.invalid'))
    expect(firstLoad.searchParams.has('ignore_menu_schedule')).toBe(false)
    expect(retry.searchParams.get('ignore_menu_schedule')).toBe('1')
    closedRequests.forEach((request) => {
      const url = new URL(request.url, 'https://api.docs.invalid')
      expect(url.searchParams.has('timestamp')).toBe(false)
    })
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  // implementation notesan open business's first (and only) ASAP response already says
  // `open: true`, so getBusiness never retries with ignore_menu_schedule — that
  // param is for a closed store's own retry, not a blanket ASAP flag.
  test('ASAP does not send ignore_menu_schedule for an open business @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'ASAP ignore_menu_schedule contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    await page.goto('/store/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const root = await waitForMenuState(page, 'results')
    await expect(root.getByRole('heading', { name: 'Synthetic Market Kitchen' })).toBeVisible()

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const openRequests = matchingRequests(requestLog, 'GET', businessPatterns['synthetic-market'])
    expect(openRequests).toHaveLength(1)
    const url = new URL(openRequests[0].url, 'https://api.docs.invalid')
    expect(url.searchParams.has('ignore_menu_schedule')).toBe(false)
    expect(url.searchParams.has('timestamp')).toBe(false)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  // implementation notesa direct product link (?category=&product=, the SEO case a
  // crawler lands on) on a closed, ASAP business opens the product read-only
  // instead of a 404 or an empty form — getProduct already knows the business
  // is closed by the time it fetches the product (the business itself loads
  // first), so it asks ignore_menu_schedule=1 on its one and only request, no
  // retry needed (unlike getBusiness's own closed retry, implementation notes above).
  test('direct product link on a closed ASAP business sends ignore_menu_schedule and opens it read-only @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Direct-link read-only contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture('business-menu')
    // the production case this documents (nabe.orderingplus.com/example_restaurant?category=1&product=45):
    // category/product as query params on the business's own path, not a slug sub-path
    fixture.firstLoad.site = {
      ...fixture.firstLoad.site,
      product_url_template: '/store/:business_slug?category=:category_id&product=:product_id'
    }
    // the fixture already mocks this product's own detail route (for the
    // schedule-preorder implementation notes scenario's lazy fetch); reuse it as-is
    const productPattern = '^/v400/en/docsmarket/business/8302/categories/(?:breads|8331)/products/(?:fixture-loaf|8332)(?:\\?.*)?$'
    // this test never adds to cart or logs in: abort any write so a bug that
    // tried one would fail loudly instead of silently "succeeding"
    const trackingRoute = fixture.routes.find((route) => route.method === 'POST' && route.pattern === '^/v400/en/docsmarket/tracking_events$')
    trackingRoute.transport = { abortSequence: new Array(10).fill(true) }

    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    await page.goto('/store/fixture-bakery?category=8331&product=8332&lat=30.2672&lng=-97.7431&order_type=2', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const root = await waitForMenuState(page, 'results')
    await expect(root.getByText(/Closed · Opens/)).toBeVisible()

    const productForm = page.locator("[data-doc-section='product-customization-dialog']")
    await expect(productForm).toBeVisible({ timeout: 30_000 })
    await expect(productForm.getByText('Fixture Country Loaf')).toBeVisible()
    await expect(productForm.getByText('$ 8.00', { exact: true })).toBeVisible()
    await expect(productForm.locator("[data-doc-control='product-quantity-decrement']")).toBeDisabled()
    await expect(productForm.locator("[data-doc-control='product-quantity-increment']")).toBeDisabled()
    await expect(productForm.locator("[data-doc-section='product-instructions'] textarea")).toBeDisabled()

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const productRequests = matchingRequests(requestLog, 'GET', productPattern)
    expect(productRequests).toHaveLength(1)
    const productUrl = new URL(productRequests[0].url, 'https://api.docs.invalid')
    expect(productUrl.searchParams.get('ignore_menu_schedule')).toBe('1')
    expect(productUrl.searchParams.has('timestamp')).toBe(false)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('product history returns to its catalog or search result and preserves direct entry', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The closed bakery menu fixture uses the desktop catalog.')
    const fixture = await loadFixture(manifest.fixture)
    fixture.firstLoad.site.product_url_template = '/store/:business_slug?category=:category_id&product=:product_id'
    setSharedReadLimit(fixture, 'languages', 3)
    setSharedReadLimit(fixture, 'pages', 3)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.clock.setFixedTime(new Date('2026-08-10T12:00:00-05:00'))
    await page.route('**/history-control.html', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>History control</h1>' }))

    const origin = '/store/fixture-bakery?lat=30.2672&lng=-97.7431&order_type=2'
    const productPath = /category=8331&product=8332/
    const form = page.locator("[data-doc-section='product-customization-dialog']")
    const close = form.getByRole('button', { name: 'Close', exact: true })
    await page.goto('/history-control.html')
    await page.goto(origin)
    const menu = await waitForMenuState(page, 'results')
    const catalogCard = menu.getByRole('button', { name: 'Fixture Country Loaf', exact: true }).first()
    await catalogCard.click()
    await expect(page).toHaveURL(productPath)
    await expect(form).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL((url) => url.pathname + url.search === origin)
    await expect(form).toHaveCount(0)
    await expect(catalogCard).toBeFocused()

    await menu.locator("[data-doc-control='business-product-search-open']").filter({ visible: true }).first().click()
    const search = page.locator("[data-doc-section='business-product-search']")
    const query = search.getByPlaceholder('Search Products')
    await query.fill('loaf')
    const result = search.getByRole('button', { name: 'Fixture Country Loaf', exact: true }).first()
    await result.click()
    await expect(page).toHaveURL(productPath)
    await expect(form).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL((url) => url.pathname + url.search === origin)
    await expect(form).toHaveCount(0)
    await expect(query).toHaveValue('loaf')
    await expect(result).toBeFocused()
    await result.click()
    await close.click()
    await expect(page).toHaveURL((url) => url.pathname + url.search === origin)
    await expect(result).toBeFocused()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'History control' })).toBeVisible()

    await page.goto(`${origin}&category=8331&product=8332`)
    await expect(form.getByText('Fixture Country Loaf', { exact: true })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'History control' })).toBeVisible()
    assertNoUnknownRequests(requestLog)
  })

  test('canonical and short business routes resolve the same catalog @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Alias contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    setSharedReadLimit(fixture, 'languages', 2)
    setSharedReadLimit(fixture, 'pages', 2)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    for (const route of [
      '/store/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2',
      '/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2'
    ]) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await disableMotion(page)
      await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-menu']")
      const root = await waitForMenuState(page, 'results')
      await expect(root.getByText('Synthetic Market Kitchen')).toBeVisible()
      await root.locator('#category8311').scrollIntoViewIfNeeded()
      await expect(root.getByText('Synthetic Market Bowl').first()).toBeVisible()
    }

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const catalogRequests = matchingRequests(requestLog, 'GET', businessPatterns['synthetic-market'])
    expect(catalogRequests).toHaveLength(2)
    catalogRequests.forEach((request) => verifyCatalogRequest(request, 'synthetic-market'))
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('store and short routes offer recovery for a missing store @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Null-result contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    setSharedReadLimit(fixture, 'languages', 2)
    setSharedReadLimit(fixture, 'pages', 2)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    for (const route of ['/store/missing-business', '/missing-business']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await disableMotion(page)
      const root = page.locator("[data-doc-section='business-menu']")
      await expect(root).toHaveAttribute('data-doc-state', 'empty', { timeout: 30_000 })
      await expect(root.getByRole('heading', { name: 'Store not found', level: 1, exact: true })).toBeVisible()
      const recovery = root.getByRole('link', { name: 'Go to Businesses', exact: true })
      await expect(recovery).toBeVisible()
      await expect(recovery).toHaveAttribute('href', '/search')
    }

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const missingPattern = '^/v400/en/docsmarket/business/missing-business(?:\\?.*)?$'
    expect(matchingRequests(requestLog, 'GET', missingPattern)).toHaveLength(2)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('exposes a loading state before the catalog is ready @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Loading contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    let delayedCatalogGets = 0
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.route('https://api.docs.invalid/v400/en/docsmarket/business/synthetic-market**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      delayedCatalogGets += 1
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fallback()
    })

    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const root = page.locator("[data-doc-section='business-menu']")
    await expect(root).toHaveAttribute('data-doc-state', 'loading')
    await expect(root).toHaveAttribute('data-doc-state', 'results', { timeout: 5000 })
    await expect(root.getByRole('heading', { name: 'Synthetic Market Kitchen', level: 1 })).toBeVisible()
    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const catalogRequests = matchingRequests(requestLog, 'GET', businessPatterns['synthetic-market'])
    expect(delayedCatalogGets).toBe(1)
    expect(catalogRequests).toHaveLength(1)
    verifyCatalogRequest(catalogRequests[0], 'synthetic-market')
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })
})
