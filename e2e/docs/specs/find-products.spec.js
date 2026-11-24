import { expect, test } from '@playwright/test'
import { disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'
import { runCaptureScenario } from '../lib/scenario.js'

const manifest = await loadManifest('find-products.manifest')
const catalogPattern = '^/v400/en/docsmarket/business/synthetic-market(?:\\?.*)?$'
const lazyCategoriesPattern = '^/v400/en/docsmarket/business/8301/categories(?:\\?.*)?$'
const lazyProductsPattern = '^/v400/en/docsmarket/business/8301/products(?:\\?.*)?$'
const lazyDrinksPattern = '^/v400/en/docsmarket/business/8301/categories/8312/products(?:\\?.*)?$'

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const waitForMenu = async (page) => {
  const root = page.locator("[data-doc-section='business-menu']")
  await expect(root).toHaveAttribute('data-doc-state', 'results')
  await expect(root.getByText('Synthetic Market Kitchen')).toBeVisible()
  await expect(root.locator("[data-doc-section='business-menu-categories']")).toBeVisible()
  await expect(root.locator("[data-doc-section='business-menu-products']")).toHaveAttribute('data-doc-product-count', '3')
  return root
}

const categoryTab = (page, id) => page.locator(
  `[data-doc-control='business-category-tab'][data-doc-category-id='${id}']`
)

const openProductSearch = async (page) => {
  await page.locator("[data-doc-control='business-product-search-open']:visible").click()
  const search = page.locator("[data-doc-section='business-product-search']")
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('data-doc-state', 'ready')
  return search
}

const searchFor = async (search, term) => {
  const input = search.locator("[data-doc-control='business-product-search-term'] input")
  await input.pressSequentially(term, { delay: 25 })
  await expect(input).toHaveValue(term)
  await expect(search).toHaveAttribute('data-doc-state', 'results')
  return input
}

const replaceSearchTerm = async (search, term) => {
  const input = search.locator("[data-doc-control='business-product-search-term'] input")
  await input.click()
  await input.press('ControlOrMeta+A')
  await input.pressSequentially(term, { delay: 10 })
  await expect(input).toHaveValue(term)
  await expect(search).toHaveAttribute('data-doc-state', term ? 'results' : 'ready')
  return input
}

const proveTabScroll = async (page, root, categoryId, heading) => {
  const before = await page.evaluate(() => window.scrollY)
  await categoryTab(page, categoryId).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  const headingBox = await root.getByRole('heading', { name: heading, level: 2 }).boundingBox()
  expect(headingBox).not.toBeNull()
  expect(headingBox.y).toBeGreaterThanOrEqual(0)
  expect(headingBox.y).toBeLessThan(await page.evaluate(() => window.innerHeight))
  const syncTop = await page.locator(`#category${categoryId}`).evaluate((element) => element.offsetTop - 65)
  await page.evaluate((top) => {
    window.scrollTo(0, top)
    window.dispatchEvent(new Event('scroll'))
  }, syncTop)
  await expect(categoryTab(page, categoryId)).toHaveAttribute('data-doc-active', 'true')
}

const resetMenuScroll = async page => {
  await expect(async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 500 }).toBe(0)
  }).toPass({ timeout: 5000 })
}

const prepareCapture = async ({ page, capture }) => {
  const root = await waitForMenu(page)

  if (capture.id === 'find-products-categories-desktop') {
    await page.addStyleTag({ content: 'body { padding-bottom: 1200px !important; }' })
    await page.locator('#category8312').scrollIntoViewIfNeeded()
    await expect(root.getByText('Synthetic Citrus Sparkler').first()).toBeVisible()
    await resetMenuScroll(page)
    await proveTabScroll(page, root, '8311', 'Bowls')
    await expect(root.getByText('Synthetic Market Bowl').first()).toBeVisible()
    await resetMenuScroll(page)
    return
  }

  if (capture.id === 'find-products-categories-mobile') {
    await page.addStyleTag({ content: 'body { padding-bottom: 800px !important; }' })
    await page.locator('#category8312').scrollIntoViewIfNeeded()
    await expect(root.getByText('Synthetic Citrus Sparkler').first()).toBeVisible()
    await resetMenuScroll(page)
    await proveTabScroll(page, root, '8311', 'Bowls')
    await expect(root.getByText('Synthetic Market Bowl').first()).toBeVisible()
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.addStyleTag({
      content: "[data-doc-section='mobile-bottom-navigation'] { display: none !important; }"
    })
    await resetMenuScroll(page)
    return
  }

  if (capture.id === 'find-products-category-popover-desktop' || capture.id === 'find-products-category-slide-bar-mobile') {
    const opener = page.locator("[data-doc-control='business-category-popover-open']")
    await opener.scrollIntoViewIfNeeded()
    await opener.click()
    const variant = capture.id.includes('slide-bar') ? 'bottom-sheet' : 'popover'
    const panel = page.locator(`[data-doc-section='business-category-popover'][data-doc-variant='${variant}']`)
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Bowls', { exact: true })).toBeVisible()
    await expect(panel.getByText('Drinks', { exact: true })).toBeVisible()
    if (variant === 'bottom-sheet') {
      // The close control belongs to the bottom sheet, outside the category list.
      await expect(page.locator("[data-slot='sheet-content'] [data-slot='dialog-close-button']")).toBeVisible()
    }
    return
  }

  if (capture.id === 'find-products-subcategory-desktop') {
    await page.locator('#category8311').scrollIntoViewIfNeeded()
    const filters = root.locator("[data-doc-section='business-subcategory-filters'][data-doc-parent-category-id='8311']")
    await expect(filters).toBeVisible()
    const warmBowls = filters.locator("[data-doc-control='business-subcategory-filter'][data-doc-subcategory-id='8313']")
    const freshBowls = filters.locator("[data-doc-control='business-subcategory-filter'][data-doc-subcategory-id='8314']")
    await warmBowls.click()
    await expect(warmBowls).toHaveAttribute('data-doc-active', 'true')
    await expect(freshBowls).toHaveAttribute('data-doc-active', 'false')
    const bowls = root.locator('#category8311')
    await expect(bowls.getByText('Synthetic Market Bowl').first()).toBeVisible()
    await expect(bowls.getByText('Fixture Jardín Bowl')).toHaveCount(0)
    return
  }

  const search = await openProductSearch(page)
  if (capture.id.includes('search-results')) {
    await searchFor(search, 'sparkler')
    const resultCards = search.locator('.product-card')
    expect(await resultCards.count()).toBeGreaterThanOrEqual(1)
    for (let index = 0; index < await resultCards.count(); index += 1) {
      await resultCards.nth(index).scrollIntoViewIfNeeded()
    }
    await expect(search.getByText('Synthetic Citrus Sparkler').first()).toBeVisible()
    await expect(search.getByText('Synthetic Market Bowl')).toHaveCount(0)
    await expect(search.getByText('Fixture Grain Bowl')).toHaveCount(0)
    return
  }

  await searchFor(search, 'notfound')
  const message = 'No products match your filters'
  await expect(search.getByRole('heading', { name: message, exact: true })).toBeVisible()
  await expect(search.getByRole('status').filter({ hasText: message })).toHaveText(message)
  await expect(search.getByText('Try clearing your filters or search.')).toBeVisible()
  await expect(search.getByRole('button', { name: 'Clear filters' })).toBeVisible()
}

test.describe('Find products in a business menu documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

      let storageBeforeInteraction
      const requestLog = await runCaptureScenario({
        page,
        manifest,
        capture,
        beforeCapture: async ({ page }) => {
          await waitForMenu(page)
          storageBeforeInteraction = await page.evaluate(() => JSON.stringify({ ...window.localStorage }))
          await prepareCapture({ page, capture })
        }
      })

      expect(matchingRequests(requestLog, 'GET', catalogPattern)).toHaveLength(1)
      expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
      expect(requestLog.unknown).toHaveLength(0)
      expect(await page.evaluate(() => JSON.stringify({ ...window.localStorage }))).toBe(storageBeforeInteraction)

      if (capture.id === 'find-products-search-empty-desktop') {
        const search = page.locator("[data-doc-section='business-product-search']")
        await search.getByRole('button', { name: 'Clear filters' }).click()
        await expect(search).toHaveAttribute('data-doc-state', 'ready')
        await expect(search.locator("[data-doc-section='business-product-search-results']")).toHaveCount(0)
        await expect(search.locator("[data-doc-control='business-product-search-term'] input")).toHaveValue('')
      }

      if (capture.id === 'find-products-category-popover-desktop') {
        const panel = page.locator("[data-doc-section='business-category-popover'][data-doc-variant='popover']")
        await panel.getByText('Drinks', { exact: true }).click()
        await expect(panel).toBeHidden()
      }

      if (capture.id === 'find-products-category-slide-bar-mobile') {
        const panel = page.locator("[data-doc-section='business-category-popover'][data-doc-variant='bottom-sheet']")
        await page.locator("[data-slot='sheet-content'] [data-slot='dialog-close-button']").click()
        await expect(panel).toHaveCount(0)
      }
    })
  }

  test('viewport readiness rechecks dynamic targets and visible background images @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Viewport readiness regression runs once on desktop.')
    await page.setContent(`
      <main data-doc-section="dynamic-capture-target">Dynamic capture target</main>
      <img data-doc-image="offscreen" src="about:invalid#offscreen" alt="" style="position:absolute;top:2000px;width:40px;height:40px">
    `)
    const targetSelector = "[data-doc-section='dynamic-capture-target']"
    const readiness = { allowBrokenImages: false, imageTimeout: 50, settleMs: 0 }

    await waitForDocumentationReady(page, readiness, targetSelector, { imageScope: 'viewport' })

    await page.locator(targetSelector).evaluate((target) => {
      target.insertAdjacentHTML('beforeend', '<img data-doc-image="dynamic-target" src="about:invalid#dynamic-target" alt="" style="width:40px;height:40px">')
      target.insertAdjacentHTML('afterend', '<img data-doc-image="visible-background" src="about:invalid#visible-background" alt="" style="position:fixed;right:0;bottom:0;width:40px;height:40px">')
    })

    await expect(waitForDocumentationReady(
      page,
      readiness,
      targetSelector,
      { imageScope: 'viewport' }
    )).rejects.toThrow(/dynamic-target[\s\S]*visible-background|visible-background[\s\S]*dynamic-target/)

    await waitForDocumentationReady(
      page,
      { ...readiness, allowBrokenImages: true },
      targetSelector,
      { imageScope: 'viewport' }
    )
    await expect(page.locator("[data-doc-image='dynamic-target']")).toHaveAttribute('data-doc-image-state', 'unavailable')
    await expect(page.locator("[data-doc-image='visible-background']")).toHaveAttribute('data-doc-image-state', 'unavailable')
    await expect(page.locator("[data-doc-image='offscreen']")).not.toHaveAttribute('data-doc-image-state', 'unavailable')
  })

  test('non-lazy search is immediate, normalized, and does not refetch the catalog @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Local-search contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-menu']")
    await waitForMenu(page)
    expect(matchingRequests(requestLog, 'GET', catalogPattern)).toHaveLength(1)

    const search = await openProductSearch(page)

    await replaceSearchTerm(search, 'dressing')
    await expect(search.getByText('Synthetic Market Bowl').first()).toBeVisible()
    await expect(search.getByText('Synthetic Citrus Sparkler')).toHaveCount(0)

    await replaceSearchTerm(search, 'jardin')
    await expect(search.getByText('Fixture Jardín Bowl').first()).toBeVisible()
    await expect(search.getByText('Synthetic Market Bowl')).toHaveCount(0)

    await replaceSearchTerm(search, 's')
    await expect(search.locator('.product-card').first()).toBeVisible()
    expect(matchingRequests(requestLog, 'GET', catalogPattern)).toHaveLength(1)
    expect(requestLog.matched.filter((request) => request.url.includes('/business/8301/'))).toHaveLength(0)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('lazy search debounces a delayed flat request and category selection uses its category endpoint @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Lazy contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture('find-products-lazy')
    const requestLog = createRequestLog()
    let delayedProductRequests = 0
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.route('https://api.docs.invalid/v400/en/docsmarket/business/8301/products**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      delayedProductRequests += 1
      await new Promise((resolve) => setTimeout(resolve, 200))
      await route.fallback()
    })

    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-menu']")
    const root = await waitForMenu(page)
    await expect.poll(() => matchingRequests(requestLog, 'GET', lazyCategoriesPattern).length).toBe(1)

    const search = await openProductSearch(page)
    const input = search.locator("[data-doc-control='business-product-search-term'] input")
    await input.pressSequentially('market', { delay: 10 })
    await expect(input).toHaveValue('market')
    expect(matchingRequests(requestLog, 'GET', lazyProductsPattern)).toHaveLength(0)
    await page.clock.fastForward(749)
    expect(matchingRequests(requestLog, 'GET', lazyProductsPattern)).toHaveLength(0)
    const requestStartedAt = Date.now()
    await page.clock.fastForward(1)
    await expect.poll(() => matchingRequests(requestLog, 'GET', lazyProductsPattern).length, { timeout: 5000 }).toBe(1)
    await expect(search.getByText('Synthetic Market Bowl').first()).toBeVisible()
    expect(Date.now() - requestStartedAt).toBeGreaterThanOrEqual(180)
    expect(delayedProductRequests).toBe(1)

    const productRequest = matchingRequests(requestLog, 'GET', lazyProductsPattern)[0]
    const productUrl = new URL(productRequest.url, 'https://api.docs.invalid')
    expect(productUrl.searchParams.get('version')).toBe('v2')
    expect(productUrl.searchParams.get('type')).toBe('2')
    expect(productUrl.searchParams.has('page')).toBe(false)
    expect(productUrl.searchParams.has('page_size')).toBe(false)
    expect(productUrl.searchParams.has('orderBy')).toBe(false)
    const where = JSON.parse(productUrl.searchParams.get('where'))
    expect(JSON.stringify(where)).toContain('%market%')
    expect(JSON.stringify(where)).toContain('name')
    expect(JSON.stringify(where)).toContain('description')

    await search.locator("[data-doc-control='business-product-search-cancel']").click()
    await expect(search).toHaveCount(0)
    await expect(categoryTab(page, '8312')).toBeVisible()
    await categoryTab(page, '8312').click()
    await expect.poll(() => matchingRequests(requestLog, 'GET', lazyDrinksPattern).length).toBe(1)
    await expect(categoryTab(page, '8312')).toHaveCount(0)
    await expect(root.getByText('Go to all categories')).toBeVisible()
    const drink = root.locator("[data-doc-section='business-menu-products'] .product-card")
    await expect(drink).toHaveCount(1)
    await drink.scrollIntoViewIfNeeded()
    await expect(drink.getByText('Synthetic Citrus Sparkler')).toBeVisible()

    const categoryRequest = matchingRequests(requestLog, 'GET', lazyDrinksPattern)[0]
    const categoryUrl = new URL(categoryRequest.url, 'https://api.docs.invalid')
    expect(categoryUrl.searchParams.get('version')).toBe('v2')
    expect(categoryUrl.searchParams.get('type')).toBe('2')
    expect(categoryUrl.searchParams.has('page')).toBe(false)
    expect(categoryUrl.searchParams.has('page_size')).toBe(false)
    expect(categoryUrl.searchParams.has('orderBy')).toBe(false)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('two-segment alias renders the default menu instead of preselecting the category @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Route mismatch contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto('/synthetic-market/bowls?lat=30.2672&lng=-97.7431&order_type=2', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-menu']")
    const root = await waitForMenu(page)

    await expect(categoryTab(page, 'all')).toHaveCount(0)
    await expect(categoryTab(page, '8311')).toHaveAttribute('data-doc-active', 'false')
    await expect(root.getByRole('heading', { name: 'Bowls', level: 2 })).toBeVisible()
    await expect(root.getByRole('heading', { name: 'Drinks', level: 2 })).toBeVisible()
    await expect(page.locator("[data-doc-section='product-customization']")).toHaveCount(0)
    await expect(page).toHaveURL(/\/synthetic-market\/bowls\?lat=30\.2672&lng=-97\.7431&order_type=2$/)

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    expect(matchingRequests(requestLog, 'GET', catalogPattern)).toHaveLength(1)
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })
})
