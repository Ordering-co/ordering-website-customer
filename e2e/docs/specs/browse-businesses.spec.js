import { expect, test } from '@playwright/test'
import { loadManifest } from '../lib/manifest.js'
import { runCaptureScenario } from '../lib/scenario.js'
import { disableMotion } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { assertNoUnknownRequests, createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../lib/network.js'

const manifest = await loadManifest('browse-businesses.manifest')
const businessesPattern = '^/v400/en/docsmarket/businesses(?:\\?.*)?$'
const pickupBusinessesPattern = '^/v400/en/docsmarket/businesses\\?(?=.*order_type_id=2).*$'
const trackingPattern = '^/v400/en/docsmarket/tracking_events$'
const favoriteAddPattern = '^/v400/en/docsmarket/users/9101/favorite_businesses$'
const favoriteDeletePattern = '^/v400/en/docsmarket/users/9101/favorite_businesses/8101$'
const kitchenDetailPattern = '^/v400/en/docsmarket/business/synthetic-kitchen(?:\\?.*)?$'
const businessTypesPattern = '^/v400/en/docsmarket/business_types(?:\\?.*)?$'
const bannerPattern = '^/v400/en/docsmarket/banner(?:\\?.*)?$'
const syntheticCategoryImage = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#2563eb"/></svg>'
)}`

const loadListingWithSheet = async (page, configure = () => {}) => {
  const fixture = await loadFixture(manifest.fixture)
  fixture.firstLoad.theme.values.components.business_listing_page.base.filters = 'sheet'
  configure(fixture)
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, createRequestLog())
  await page.goto(manifest.route)
  await page.addStyleTag({ content: '[data-ds-review] { display: none; }' })
  return page.getByRole('button', { name: 'Filters', exact: true })
}

const openListingFilters = async (page, configure) => {
  const trigger = await loadListingWithSheet(page, configure)
  await trigger.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true })
  await expect(sheet).toBeVisible()
  return { sheet, trigger }
}

test('compact filter chips reserve independent touch targets across wrapped rows', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  const { sheet } = await openListingFilters(page, (fixture) => {
    const values = fixture.firstLoad.theme.values
    values.tokens = { space: { md: 8 } }
    values.components.chip = { sizes: { md: { height: 24 } } }
    fixture.firstLoad.configs.filter_search_options.value += '|brands'
  })
  const chips = sheet.locator('[data-slot=chip]')
  await expect(chips).toHaveCount(6)
  const measure = () => chips.evaluateAll(buttons => {
    const boxes = buttons.map(button => button.getBoundingClientRect())
    return {
      rows: new Set(boxes.map(box => Math.round(box.y))).size,
      heights: boxes.map(box => box.height),
      verticalEdges: boxes.map((box, index) => {
        const x = box.x + box.width / 2
        const centerY = box.y + box.height / 2
        return [-21, 21].map(offset => buttons[index].contains(document.elementFromPoint(x, centerY + offset)))
      })
    }
  })
  // Drawer can be visible before its final transform is painted.
  await expect.poll(measure).toEqual({
    rows: expect.any(Number),
    heights: Array(6).fill(24),
    verticalEdges: Array(6).fill([true, true])
  })
  expect((await measure()).rows).toBeGreaterThanOrEqual(2)
})

test('open filters stay mounted and restore focus after crossing the wide search breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 1190, height: 900 })
  const { sheet, trigger } = await openListingFilters(page)
  const filterRow = page.locator('[data-doc-section=business-list-filters]')
  const searchInRow = filterRow.locator('input[name=search]')
  await expect(searchInRow).toHaveCount(0)
  for (const [width, expectedSearchCount] of [[1210, 1], [1190, 0]]) {
    const portal = await sheet.elementHandle()
    await page.setViewportSize({ width, height: 900 })
    await expect(searchInRow).toHaveCount(expectedSearchCount)
    await expect(sheet).toBeVisible()
    expect(await portal.evaluate(el => el.isConnected)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(trigger).not.toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()
    if (expectedSearchCount === 1) await trigger.press('Enter')
  }
})

test('preorder keeps its themed backdrop while filter shortcuts are in a sheet', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
  const trigger = await loadListingWithSheet(page, (fixture) => {
    fixture.firstLoad.theme.values.components.modal = { base: { overlay: 'rgba(28, 52, 76, 0.45)' } }
  })
  await expect(trigger).toBeVisible()
  const results = page.locator('[data-doc-section=business-list-results]')
  await results.getByRole('button', { name: 'Fixture Bakery' }).click()
  const preorder = page.locator('[data-doc-section=business-preorder-dialog]')
  await expect(preorder).toBeVisible()
  const backdrop = page.locator('[data-slot=dialog-overlay]')
  await expect(backdrop).toHaveCSS('background-color', 'rgba(28, 52, 76, 0.45)')
  await page.keyboard.press('Escape')
  await expect(preorder).toBeHidden()
  await expect(backdrop).toHaveCount(0)
})

const hideMobileFilters = (fixture) => {
  const values = fixture.firstLoad.theme.values
  // A mobile section array replaces the desktop array, so keep its other overrides.
  const sections = values.pages.business_listing.sections.filter(({ key }) => key !== 'filters')
  values.platforms = {
    mobile_web: { pages: { business_listing: { sections: [...sections, { key: 'filters', visible: false }] } } }
  }
}

test('a listing card keeps its DOM node and focus when the mobile theme hides or shows filters', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 576, height: 900 })
  const trigger = await loadListingWithSheet(page, hideMobileFilters)
  const card = page.locator('[data-doc-section=business-list-results]').getByRole('link', { name: 'Synthetic Kitchen' })
  await expect(trigger).toBeVisible()
  await card.focus()
  const originalCard = await card.elementHandle()
  for (const [width, filterCount] of [[575, 0], [576, 1]]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(trigger).toHaveCount(filterCount)
    expect(await originalCard.evaluate(el => el.isConnected)).toBe(true)
    await expect(card).toBeFocused()
  }
})

test('hiding the filter trigger closes its sheet and clears the modal state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 576, height: 900 })
  const { sheet, trigger } = await openListingFilters(page, hideMobileFilters)
  const body = page.locator('body')
  await expect(body).toHaveCSS('overflow-y', 'hidden')
  await page.setViewportSize({ width: 575, height: 900 })
  await expect(trigger).toHaveCount(0)
  await expect(sheet).toBeHidden()
  await expect(body).not.toHaveCSS('overflow-y', 'hidden')
  await page.setViewportSize({ width: 576, height: 900 })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(sheet).toBeHidden()
  await trigger.press('Enter')
  await expect(sheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('compact filter chips keep the themed row spacing with a mouse', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 1440, height: 900 })
  const { sheet } = await openListingFilters(page, (fixture) => {
    const values = fixture.firstLoad.theme.values
    values.tokens = { space: { md: 8 } }
    values.components.chip = { sizes: { md: { height: 24 } } }
    fixture.firstLoad.configs.filter_search_options.value = 'price_range|brands'
  })
  expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
  const chips = sheet.locator('[data-slot=chip]')
  await expect(chips).toHaveCount(2)
  const row = await chips.evaluateAll(buttons => {
    const [first, second] = buttons.map(button => button.getBoundingClientRect())
    const cells = buttons.map(button => button.parentElement.getBoundingClientRect())
    return {
      oneRow: first.y === second.y,
      height: cells[0].height,
      heights: [first.height, second.height],
      gap: second.left - first.right
    }
  })
  expect(row).toEqual({ oneRow: true, height: 24, heights: [24, 24], gap: 8 })
})

test.describe('Category search spacing', () => {
  for (const variant of ['images', 'pills', 'hidden-search']) {
    test(`${variant} @mobile-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-chromium')
      const fixture = await loadFixture(manifest.fixture)
      const categoriesRoute = fixture.routes.find(route => route.pattern === businessTypesPattern)
      categoriesRoute.response.result = [{
        id: 2,
        name: 'Groceries',
        enabled: true,
        image: variant === 'pills' ? null : syntheticCategoryImage
      }]
      const theme = fixture.firstLoad.theme.values
      const layout = variant === 'pills' ? 'pills' : 'pills_image'
      const sectionGap = variant === 'pills' ? 36 : 24
      if (variant === 'pills') theme.tokens = { space: { xl: sectionGap } }
      theme.components.business_types = { base: { layout } }
      if (variant === 'hidden-search') {
        theme.pages.business_listing.sections.push({ key: 'search', visible: false })
      }
      const requestLog = createRequestLog()
      await installFixtureGlobals(page, fixture)
      await installNetworkGuard(page, fixture, requestLog)
      await page.goto(manifest.route)
      await disableMotion(page)
      const listing = page.locator("[data-doc-section='businesses-list']")
      const categories = listing.locator('#container')
      const category = categories.getByRole('button', { name: 'Groceries' })
      const search = listing.getByRole('textbox', { name: 'Search' })
      const filters = listing.locator("[data-doc-section='business-list-filters']")
      await expect(category).toBeVisible()
      await expect(categories).toHaveAttribute('data-layout', layout)
      if (variant === 'images') {
        const image = category.locator('img')
        await expect(image).toBeVisible()
        await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0)
      } else if (variant === 'pills') {
        await expect(category.locator('img')).toHaveCount(0)
      }

      for (const width of [390, 580, 581, 1200, 1201, 1440]) {
        await page.setViewportSize({ width, height: 844 })
        await expect(listing).toHaveCSS('row-gap', `${sectionGap}px`)
        if (variant === 'hidden-search') {
          await expect(search).toHaveCount(0)
        } else {
          await expect(search).toBeVisible()
          const nextSection = width > 1200 ? filters : listing.locator("[data-doc-control='business-list-search']")
          if (width > 1200) {
            await expect(filters.getByRole('textbox', { name: 'Search' })).toBeVisible()
          }
          await expect.poll(async () => {
            const categoryBox = await categories.boundingBox()
            const nextBox = await nextSection.boundingBox()
            return nextBox && categoryBox && Math.round(nextBox.y - categoryBox.y - categoryBox.height)
          }).toBeGreaterThanOrEqual(sectionGap - 8)
        }
        if (width === 390 && variant !== 'hidden-search') {
          await testInfo.attach(`category-search-${variant}`, { body: await page.screenshot(), contentType: 'image/png' })
        }
      }
      assertNoUnknownRequests(requestLog)
    })
  }
})

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const verifyListingQuery = (request, orderType) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  expect(url.searchParams.get('order_type_id')).toBe(String(orderType))
  expect(url.searchParams.get('page')).toBe('1')
  expect(url.searchParams.get('page_size')).toBe('25')
  expect(url.searchParams.get('orderBy')).toBe('distance')
  expect(url.searchParams.has('disabled_business')).toBe(false)
  expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 30.2672, lng: -97.7431 })
  const params = new Set((url.searchParams.get('params') || '').split(','))
  for (const field of ['id', 'name', 'open', 'enabled', 'today', 'schedule', 'timezone']) {
    expect(params.has(field)).toBe(true)
  }
}

const hasSupportingQuery = (request, orderType) => {
  const url = new URL(request.url, 'https://api.docs.invalid')
  return url.searchParams.get('order_type_id') === String(orderType) &&
    JSON.stringify(JSON.parse(url.searchParams.get('location'))) === JSON.stringify({ lat: 30.2672, lng: -97.7431 })
}

const prepareEmptyState = async (page) => {
  const orderTypes = page.locator("[data-doc-section='header-order-types']")
  await orderTypes.getByRole('tab', { name: 'Pickup' }).click()
  await expect(page.locator("[data-doc-section='businesses-list']")).toHaveAttribute('data-doc-state', 'empty')
  // the listing has a location (the query's lat and lng), so it is the empty state of an address
  await expect(page.getByText('No businesses available at this address')).toBeVisible()
}

const verifyBusinessStates = async (page) => {
  await expect(page.locator("[data-doc-section='businesses-list']")).toHaveAttribute('data-doc-state', 'results')
  const kitchen = page.locator("[data-doc-section='businesses-list']").getByRole('link', { name: 'Synthetic Kitchen', exact: true })
  await expect(kitchen).toHaveCount(1)
  await expect(kitchen).toBeVisible()
  await expect(page.getByText('Fixture Bakery')).toBeVisible()
  await expect(page.getByText('Preorder')).toBeVisible()
}

const exerciseClosedBusiness = async (page) => {
  await page.getByText('Fixture Bakery').click()
  const preorder = page.getByRole('dialog').and(page.locator("[data-doc-section='business-preorder-dialog']"))
  await expect(preorder).toBeVisible()
  await expect(preorder.getByText('Order time')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(preorder).toBeHidden()
}

test.describe('Browse businesses documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

      const requestLog = await runCaptureScenario({
        page,
        manifest,
        capture,
        beforeCapture: async ({ fixture, requestLog }) => {
          if (capture.id === 'business-results-desktop') {
            const listing = fixture.routes.find(route => route.pattern === businessesPattern)
            const kitchen = listing.response.result.find(business => business.slug === 'synthetic-kitchen')
            fixture.routes.push({
              method: 'GET',
              pattern: kitchenDetailPattern,
              assert: { maxCount: 1 },
              response: { error: false, result: { ...kitchen, categories: [] } }
            })
          }
          if (capture.id.includes('empty')) {
            await prepareEmptyState(page)
            if (capture.id.includes('address')) {
              await page.getByRole('button', { name: 'Change address' }).click()
              await expect(page.locator("[data-doc-section='address-form']")).toHaveAttribute('data-doc-state', 'ready')
            }
          } else if (capture.id.includes('preorder')) {
            await expect.poll(() => matchingRequests(requestLog, 'GET', businessesPattern).length, { timeout: 15000 }).toBeGreaterThanOrEqual(1)
            await verifyBusinessStates(page)
            await page.getByText('Fixture Bakery').click()
            await expect(page.locator("[data-doc-section='business-preorder-dialog']")).toBeVisible()
          } else {
            await expect.poll(() => matchingRequests(requestLog, 'GET', businessesPattern).length, { timeout: 15000 }).toBeGreaterThanOrEqual(1)
            await verifyBusinessStates(page)
            await exerciseClosedBusiness(page)
          }
        }
      })

      if (capture.id.includes('empty')) {
        const pickupRequests = matchingRequests(requestLog, 'GET', pickupBusinessesPattern)
        expect(pickupRequests.length).toBeGreaterThanOrEqual(1)
        verifyListingQuery(pickupRequests.at(-1), 2)
      } else {
        const listingRequests = matchingRequests(requestLog, 'GET', businessesPattern)
        expect(listingRequests.length).toBeGreaterThanOrEqual(1)
        verifyListingQuery(listingRequests.at(-1), 1)
      }
      expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'POST', favoriteAddPattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'DELETE', favoriteDeletePattern)).toHaveLength(0)

      const expectedOrderType = capture.id.includes('empty') ? 2 : 1
      const businessTypesRequests = matchingRequests(requestLog, 'GET', businessTypesPattern)
      const bannerRequests = matchingRequests(requestLog, 'GET', bannerPattern)
      expect(businessTypesRequests.some((request) => hasSupportingQuery(request, expectedOrderType))).toBe(true)
      expect(bannerRequests.some((request) => hasSupportingQuery(request, expectedOrderType))).toBe(true)

      if (capture.id === 'business-results-desktop') {
        await page.evaluate(() => {
          window.history.pushState = (_, __, url) => { window.__DOC_BUSINESS_NAVIGATION__ = url }
        })
        const kitchen = page.getByRole('link', { name: 'Synthetic Kitchen', exact: true })
        await expect(kitchen).toHaveAttribute('href', '/store/synthetic-kitchen')
        await kitchen.click()
        await expect.poll(() => page.evaluate(() => window.__DOC_BUSINESS_NAVIGATION__)).toBe('/store/synthetic-kitchen')
        await expect.poll(() => matchingRequests(requestLog, 'GET', kitchenDetailPattern).length).toBe(1)
        await waitForRequestQuiescence(requestLog, manifest.readiness.network)
        expect(matchingRequests(requestLog, 'GET', kitchenDetailPattern)).toHaveLength(1)
        expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
        assertNoUnknownRequests(requestLog)
      }
    })
  }
})
