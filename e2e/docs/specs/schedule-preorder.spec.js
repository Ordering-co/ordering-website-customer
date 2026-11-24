import { expect, test } from '@playwright/test'
import { openSelectList } from '../lib/select.js'
import { disableMotion } from '../lib/capture.js'
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

const manifest = await loadManifest('schedule-preorder.manifest')
const businessesPattern = '^/v400/en/docsmarket/businesses(?:\\?.*)?$'
const menusPattern = '^/v400/en/docsmarket/business/8102/menus(?:\\?.*)?$'
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const trackingPattern = '^/v400/en/docsmarket/tracking_events$'

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const waitForListing = async (page) => {
  const listing = page.locator("[data-doc-section='businesses-list']")
  await expect(listing).toHaveAttribute('data-doc-state', 'results')
  await expect(listing.getByText('Fixture Bakery', { exact: true })).toBeVisible()
  return listing
}

const openPreorder = async (page) => {
  const listing = await waitForListing(page)
  await listing.getByText('Fixture Bakery', { exact: true }).click()
  const dialog = page.locator("[data-doc-section='business-preorder-dialog']")
  await expect(dialog).toBeVisible()
  const preorder = dialog.locator("[data-doc-section='business-preorder']")
  await expect(preorder).toBeVisible()
  return preorder
}

const selectPreorderType = async (preorder, label) => {
  const type = preorder.locator("[data-doc-section='business-preorder-type']")
  const list = await openSelectList(type)
  await list.getByRole('option', { name: label, exact: true }).click()
}

const chooseBusinessMenu = async (preorder) => {
  await selectPreorderType(preorder, 'Business menu')
  const menu = preorder.locator("[data-doc-section='business-preorder-menu']")
  await expect(menu).toHaveAttribute('data-doc-state', 'results')
  const list = await openSelectList(menu)
  await list.getByRole('option', { name: 'Synthetic Bakery Menu', exact: true }).click()
  return menu
}

const selectDate = async (preorder, day) => {
  const tile = preorder.locator(`[data-doc-control='business-preorder-date-day'][data-doc-date='2026-08-${day}']`)
  await expect(tile).toBeEnabled()
  await tile.click()
}

const chooseAvailableMoment = async (preorder) => {
  await selectPreorderType(preorder, 'Business hours')
  await selectDate(preorder, 12)
  const timeStep = preorder.locator("[data-doc-section='business-preorder-time-step']")
  await expect(timeStep).toHaveAttribute('data-doc-state', 'expanded')
  const slot = timeStep.locator("[data-doc-control='business-preorder-time-slot'][data-doc-time='10:00']")
  await expect(slot).toBeEnabled()
  await slot.click()
  await expect(slot).toHaveAttribute('data-doc-selected', 'true')
  return slot
}

const prepareCapture = async ({ page, capture }) => {
  if (capture.id === 'preorder-entry-desktop') {
    await waitForListing(page)
    return
  }

  const preorder = await openPreorder(page)

  await expect(preorder).toHaveAttribute('data-doc-variant', 'standard')
  if (capture.id === 'preorder-type-desktop') {
    const type = preorder.locator("[data-doc-section='business-preorder-type']")
    const list = await openSelectList(type)
    await expect(list.getByRole('option', { name: 'Business menu', exact: true })).toBeVisible()
    await expect(list.getByRole('option', { name: 'Business hours', exact: true })).toBeVisible()
    return
  }

  if (capture.id === 'preorder-menu-desktop') {
    const menu = await chooseBusinessMenu(preorder)
    await expect(menu.getByText('Synthetic Bakery Menu', { exact: true })).toBeVisible()
    return
  }

  if (capture.id === 'preorder-closed-day-desktop') {
    await chooseBusinessMenu(preorder)
    await selectDate(preorder, 11)
    await expect(preorder.getByText('The business is closed at the moment')).toBeVisible()
    return
  }

  await selectPreorderType(preorder, 'Business hours')
  await selectDate(preorder, 12)
  const timeStep = preorder.locator("[data-doc-section='business-preorder-time-step']")
  await expect(timeStep).toHaveAttribute('data-doc-state', 'expanded')
  await expect(timeStep.locator("[data-doc-control='business-preorder-time-slot']")).not.toHaveCount(0)

  if (capture.id === 'preorder-time-slots-desktop') {
    const slots = timeStep.locator("[data-doc-control='business-preorder-time-slot']")
    expect(await slots.count()).toBeGreaterThan(12)
    await page.addStyleTag({
      content: "[data-doc-section='business-preorder-time-step'] [data-doc-control='business-preorder-time-slot']:nth-child(n+13) { display: none !important; }"
    })
    return
  }

  const slot = timeStep.locator("[data-doc-control='business-preorder-time-slot'][data-doc-time='10:00']")
  await slot.click()
  await expect(slot).toHaveAttribute('data-doc-selected', 'true')
  await expect(preorder.locator("[data-doc-control='business-preorder-go-to-menu']")).toBeEnabled()
  if (capture.id === 'preorder-selected-mobile') {
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
  }
}

test.describe('Schedule a preorder documentation', () => {
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

      expect(matchingRequests(requestLog, 'GET', businessesPattern).length).toBeGreaterThanOrEqual(1)
      expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
      expect(requestLog.unknown).toHaveLength(0)

      if (capture.id.includes('selected')) {
        const storedOptions = JSON.parse(await page.evaluate(() => window.localStorage.getItem('options')))
        expect(storedOptions.type).toBe(1)
        expect(storedOptions.moment).toBe('2026-08-12 15:00:00')
      }
      if (capture.id === 'preorder-menu-desktop' || capture.id === 'preorder-closed-day-desktop') {
        expect(matchingRequests(requestLog, 'GET', menusPattern)).toHaveLength(1)
      }
    })
  }

  test('guest selection writes UTC storage, navigates, and sends no option or tracking mutation @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Guest contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const preorder = await openPreorder(page)
    await chooseAvailableMoment(preorder)

    expect(JSON.parse(await page.evaluate(() => window.localStorage.getItem('options')))).toMatchObject({
      type: 1,
      moment: '2026-08-12 15:00:00'
    })
    expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)).toHaveLength(0)
    const goToMenu = preorder.locator("[data-doc-control='business-preorder-go-to-menu']")
    await goToMenu.click()
    await expect(page).toHaveURL(/\/store\/fixture-bakery/)
    expect(matchingRequests(requestLog, 'POST', trackingPattern)).toHaveLength(0)
    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('guest fixture clears stale storage without seeding authentication keys @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Storage-isolation contract runs once on desktop.')
    const fixture = await loadFixture(manifest.fixture)
    // This case deliberately boots the application twice.
    setSharedReadLimit(fixture, 'configs', 2)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => window.localStorage.setItem('stale-doc-key', 'must-be-cleared'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('stale-doc-key'))).toBeNull()
    expect(await page.evaluate(() => ({
      token: window.localStorage.getItem('token'),
      user: window.localStorage.getItem('user'),
      customer: window.localStorage.getItem('user-customer')
    }))).toEqual({ token: null, user: null, customer: null })
    assertNoUnknownRequests(requestLog)
  })

  test('authenticated selection sends one exact PUT and does not persist guest options @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Authenticated contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture, { authenticated: true })
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    expect((await page.evaluate(() => Object.keys(window.localStorage).sort()))).toEqual(['token', 'user'])
    const preorder = await openPreorder(page)
    await chooseAvailableMoment(preorder)
    await expect.poll(() => matchingRequests(requestLog, 'PUT', orderOptionsPattern).length).toBe(1)
    expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)[0].body).toEqual({
      moment: 1786546800,
      user_id: 9101
    })
    expect(await page.evaluate(() => window.localStorage.getItem('options'))).toBeNull()
    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })

  test('menu loading and failure settle without invented error copy @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Menu state contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.route('https://api.docs.invalid/v400/en/docsmarket/business/8102/menus**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: true, result: 'Synthetic menu failure' }) })
    })
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const preorder = await openPreorder(page)
    await selectPreorderType(preorder, 'Business menu')
    const menu = preorder.locator("[data-doc-section='business-preorder-menu']")
    await expect(menu).toHaveAttribute('data-doc-state', 'empty')
    await expect(menu.getByText('Synthetic menu failure')).toHaveCount(0)
    expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
  })

  test('preorder disabled shows the closed-state copy without date controls @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Disabled gate contract runs once on desktop.')
    const fixture = await loadFixture(manifest.fixture)
    fixture.firstLoad.configs.preorder_status_enabled.value = '0'
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const preorder = await openPreorder(page)
    await expect(preorder.getByText('The business is closed at the moment')).toBeVisible()
    await expect(preorder.locator("[data-doc-section='business-preorder-date-time']")).toHaveCount(0)
    await expect(preorder.locator("[data-doc-section='business-preorder-type']")).toHaveCount(0)
    expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
  })

  test('catering preorder remains blocked with no selectable dates @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Catering blocker contract runs once on desktop.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })
    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto('/search?lat=30.2672&lng=-97.7431&order_type=7', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const preorder = await openPreorder(page)
    await expect(preorder).toHaveAttribute('data-doc-variant', 'catering')
    await expect(preorder.locator("[data-doc-section='business-preorder-type']")).toHaveCount(0)
    const dates = preorder.getByRole('radiogroup', { name: 'Choose Date' })
    await expect(preorder.getByRole('button', { name: /Choose Date/ })).toBeVisible()
    await expect(dates.locator('[role="radio"]:not([aria-disabled="true"])')).toHaveCount(0)
    await expect(preorder.locator("[data-doc-control='business-preorder-time-slot']")).toHaveCount(0)
    expect(matchingRequests(requestLog, 'PUT', orderOptionsPattern)).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
  })

  // implementation notesclicking a product on a closed, ASAP business menu (not the /search
  // businesses list) opens the product form directly, read-only, with its own
  // "Schedule for later" button — never a schedule modal first (that was implementation notes,
  // replaced here). The preorder modal it opens (BusinessPreorder, via
  // BusinessProductsListing, for the same RenderProductsLayout-remount reason as
  // implementation notes) layers on top of the still-open product; confirming a valid moment
  // swaps in the fresh product and reactivates the form without ever closing it.
  // Reuses the business-menu fixture's closed Fixture Bakery (with a real menu);
  // schedule-preorder's own fixture-bakery has none.
  test('closed ASAP business menu opens a search result read-only, then restores each layer when scheduling (implementation notes, implementation notes)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The closed bakery menu fixture uses the desktop catalog.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture('business-menu')
    const businessPattern = '^/v400/en/docsmarket/business/fixture-bakery(?:\\?.*)?$'
    const bakeryRoute = fixture.routes.find((route) => route.method === 'GET' && route.pattern === businessPattern)
    // the ASAP load is itself 2 requests (getBusiness only retries with
    // ignore_menu_schedule=1 once the plain first response says closed — see
    // business-menu.spec.js), plus one reload once the moment is scheduled
    bakeryRoute.assert = { minCount: 3, maxCount: 3 }
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)

    await page.goto('/store/fixture-bakery?lat=30.2672&lng=-97.7431&order_type=2', { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    const menu = page.locator("[data-doc-section='business-menu']")
    await expect(menu).toHaveAttribute('data-doc-state', 'results')
    await expect(menu.getByText('Fixture Country Loaf').first()).toBeVisible()
    await expect(menu.getByText(/Closed · Opens/)).toBeVisible()

    await menu.locator("[data-doc-control='business-product-search-open']").filter({ visible: true }).first().click()
    const search = page.locator("[data-doc-section='business-product-search']")
    const query = search.getByPlaceholder('Search Products')
    await query.fill('loaf')
    const result = search.getByRole('button', { name: 'Fixture Country Loaf', exact: true }).first()
    await result.click()
    const productForm = page.locator("[data-doc-section='product-customization-dialog']")
    await expect(productForm).toBeVisible()
    await expect(productForm.getByText('Fixture Country Loaf')).toBeVisible()

    // read-only: the quantity stepper and comment box are really disabled,
    // not only styled that way
    await expect(productForm.locator("[data-doc-control='product-quantity-decrement']")).toBeDisabled()
    await expect(productForm.locator("[data-doc-control='product-quantity-increment']")).toBeDisabled()
    await expect(productForm.locator("[data-doc-section='product-instructions'] textarea")).toBeDisabled()

    // implementation notesthe footer's one action, in place of Add to cart
    await expect(productForm.getByRole('button', { name: 'Add to cart' })).toHaveCount(0)
    const scheduleButton = productForm.locator("[data-doc-control='product-schedule-for-later']")
    await expect(scheduleButton).toBeVisible()
    await scheduleButton.click()

    // layered on top: the product dialog never closes
    await expect(productForm).toBeVisible()
    const dialog = page.locator("[data-doc-section='business-preorder-dialog']")
    await expect(dialog).toBeVisible()
    const preorder = dialog.locator("[data-doc-section='business-preorder']")
    await expect(preorder).toBeVisible()

    await selectPreorderType(preorder, 'Business hours')
    await selectDate(preorder, 12)
    const timeStep = preorder.locator("[data-doc-section='business-preorder-time-step']")
    await expect(timeStep).toHaveAttribute('data-doc-state', 'expanded')
    const slot = timeStep.locator("[data-doc-control='business-preorder-time-slot'][data-doc-time='10:00']")
    await expect(slot).toBeEnabled()
    await slot.click()
    await expect(slot).toHaveAttribute('data-doc-selected', 'true')

    // implementation notesediting the picker must leave the real order provider,
    // its persisted options and the menu's availability on the prior moment.
    const storedMoment = () => page.evaluate(() => JSON.parse(localStorage.getItem('options'))?.moment ?? null)
    expect(await storedMoment()).toBeNull()
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    // implementation notesthe return focus stays inside the same product window.
    await expect.poll(() => productForm.evaluate((form) => form.contains(document.activeElement))).toBe(true)
    await expect(productForm.locator("[data-doc-control='product-quantity-increment']")).toBeDisabled()
    expect(await storedMoment()).toBeNull()

    await scheduleButton.click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(query).toHaveValue('loaf')
    await expect.poll(() => productForm.evaluate((form) => form.contains(document.activeElement))).toBe(true)

    await scheduleButton.click()
    await chooseAvailableMoment(preorder)
    const goToMenu = preorder.locator("[data-doc-control='business-preorder-go-to-menu']")
    await expect(goToMenu).toBeEnabled()
    await goToMenu.click()
    await expect(dialog).toHaveCount(0)
    await expect.poll(storedMoment).toBe('2026-08-12 15:00:00')

    await expect(productForm).toBeVisible({ timeout: 30_000 })
    await expect(productForm.getByText('Fixture Country Loaf')).toBeVisible()
    // reactivated: disabled controls and the schedule button are both gone.
    // Not the decrement button: quantity 1 keeps that one disabled on its own
    // (the minimum), regardless of closed/open — increment is the one only
    // the read-only state disables.
    await expect(productForm.locator("[data-doc-control='product-quantity-increment']")).toBeEnabled()
    await expect(productForm.locator("[data-doc-control='product-quantity']")).toBeEnabled()
    await expect(productForm.locator("[data-doc-section='product-instructions'] textarea")).toBeEnabled()
    await expect(productForm.locator("[data-doc-control='product-schedule-for-later']")).toHaveCount(0)
    await expect(productForm.getByRole('button', { name: 'Add to cart' })).toBeEnabled()
    await expect.poll(() => productForm.evaluate((form) => form.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
    await expect.poll(() => productForm.evaluate((form) => form.contains(document.activeElement))).toBe(true)
    await productForm.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(query).toHaveValue('loaf')
    await expect(result).toBeFocused()

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const bakeryRequests = matchingRequests(requestLog, 'GET', businessPattern)
    expect(bakeryRequests).toHaveLength(3)
    const scheduledRequests = bakeryRequests.filter((request) => new URL(request.url, 'https://api.docs.invalid').searchParams.has('timestamp'))
    expect(scheduledRequests).toHaveLength(1)
    scheduledRequests.forEach((request) => {
      const url = new URL(request.url, 'https://api.docs.invalid')
      expect(url.searchParams.has('ignore_menu_schedule')).toBe(false)
    })
    const asapRequests = bakeryRequests.filter((request) => !new URL(request.url, 'https://api.docs.invalid').searchParams.has('timestamp'))
    expect(asapRequests).toHaveLength(2)
    const [firstAsapLoad, closedRetry] = asapRequests.map((request) => new URL(request.url, 'https://api.docs.invalid'))
    expect(firstAsapLoad.searchParams.has('ignore_menu_schedule')).toBe(false)
    expect(closedRetry.searchParams.get('ignore_menu_schedule')).toBe('1')
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })
})
