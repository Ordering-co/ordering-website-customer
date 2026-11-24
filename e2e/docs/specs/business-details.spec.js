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

const manifest = await loadManifest('business-details.manifest')

const businessPatterns = {
  'synthetic-market': '^/v400/en/docsmarket/business/synthetic-market(?:\\?.*)?$',
  'fixture-bakery': '^/v400/en/docsmarket/business/fixture-bakery(?:\\?.*)?$',
  'synthetic-studio': '^/v400/en/docsmarket/business/synthetic-studio(?:\\?.*)?$'
}

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const expectedSlug = (capture) => {
  if (capture.id.includes('closed')) return 'fixture-bakery'
  if (capture.id.includes('professionals')) return 'synthetic-studio'
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

const waitForResults = async (page) => {
  const root = page.locator("[data-doc-section='business-menu']")
  await expect(root).toHaveAttribute('data-doc-state', 'results')
  return root
}

const assertUniversalDetails = async (root) => {
  await expect(root.getByRole('heading', { name: 'Synthetic Market Kitchen', level: 1 })).toBeVisible()
  await expect(root.getByText('100 Synthetic Market Street').first()).toBeVisible()
  await expect(root.getByText('Restaurant', { exact: true }).first()).toBeVisible()
  await expect(root.locator("[data-doc-control='business-reviews']")).toContainText('4.8')
  await expect(root.locator("[data-doc-control='business-information']")).toBeVisible()
  const socialLinks = root.locator("[data-doc-control='business-social-link']")
  await expect(socialLinks).toHaveCount(2)
  await expect(socialLinks.nth(0)).toHaveAttribute('href', 'https://example.invalid/synthetic-market-facebook')
  await expect(socialLinks.nth(1)).toHaveAttribute('href', 'https://example.invalid/synthetic-market-instagram')
  await expect(root.getByText('Service fee', { exact: true })).toHaveCount(0)
  await expect(root.getByText('15min Pickup time', { exact: true })).toBeVisible()
  await expect(root.locator("[data-doc-control='business-preorder-entry']")).toHaveCount(0)
  await expect(root.locator("[data-doc-control='business-reservation-entry']")).toHaveCount(0)
}

const openInformationDialog = async (page, root) => {
  await root.locator("[data-doc-control='business-information']").click()
  const dialog = page.locator("[data-doc-section='business-information-dialog']")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('A synthetic business used only for documentation capture.')).toBeVisible()
  await expect(dialog.getByText('Fixture-made bowls, soups, and drinks.')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Schedule', level: 3 })).toBeVisible()
  for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
    await expect(dialog.getByText(day, { exact: true })).toHaveCount(1)
  }
  await expect(dialog.getByText('09:00:00 - 21:00:00', { exact: true })).toHaveCount(7)
  await expect(dialog.getByText('Delivery Time', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Pickup Time', { exact: true })).toBeVisible()
  await expect(dialog.getByText('25min', { exact: true })).toBeVisible()
  await expect(dialog.getByText('15min', { exact: true })).toBeVisible()
  await expect(dialog.locator('iframe')).toHaveCount(0)
  await expect(dialog.locator('.business-location-container')).toHaveCount(0)
  await expect(dialog.getByRole('heading', { name: 'Photos', level: 3 })).toHaveCount(1)
  await expect(dialog.locator("img[src='/e2e/docs/assets/synthetic-business-header.svg']")).toHaveCount(1)
  return dialog
}

const prepareCapture = async ({ page, capture }) => {
  const root = await waitForResults(page)

  if (capture.id.includes('closed')) {
    await expect(root.getByRole('heading', { name: 'Fixture Bakery', level: 1 })).toBeVisible()
    await expect(root.getByText(/^Closed · Opens /)).toBeVisible()
    await expect(root.getByText('200 Fixture Bakery Avenue')).toBeVisible()
    await expect(root.locator("[data-doc-control='business-information']")).toBeVisible()
    await expect(root.locator("[data-doc-control='business-preorder-entry']")).toHaveCount(0)
    return
  }

  if (capture.id.includes('professionals')) {
    await expect(root.getByRole('heading', { name: 'Synthetic Service Studio', level: 1 })).toBeVisible()
    const professionals = page.locator("[data-doc-section='business-professionals']")
    await expect(professionals.getByRole('heading', { name: 'Professionals', level: 2 })).toBeVisible()
    await expect(professionals.getByText('Any professional member', { exact: true })).toBeVisible()
    await expect(professionals.getByText('Synthetic Professional', { exact: true })).toBeVisible()
    await expect(professionals.getByText('Fixture Advisor', { exact: true })).toBeVisible()
    await expect(root.getByPlaceholder('Search Products')).toBeVisible()
    await expect(root.getByPlaceholder('Min')).toBeVisible()
    await expect(root.getByPlaceholder('Max')).toBeVisible()
    await expect(root.getByText('Sort By', { exact: true })).toBeVisible()
    await expect(root.locator("[data-doc-control='business-product-search-open']")).toHaveCount(0)
    await expect(root.locator("[data-doc-control='business-reservation-entry']")).toHaveCount(0)
    await expect(page.locator("[data-doc-section='product-customization']")).toHaveCount(0)
    return
  }

  await assertUniversalDetails(root)

  if (capture.id.includes('information')) {
    const dialog = await openInformationDialog(page, root)
    const overlay = page.locator("[data-doc-section='business-information-dialog']")
    await expect(overlay.locator("[data-slot='dialog-close-button']")).toBeVisible()

    if (capture.id === 'business-information-mobile') {
      const box = await dialog.boundingBox()
      const viewport = page.viewportSize()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
    }

    if (capture.id === 'business-information-desktop') {
      const photo = dialog.locator("[data-doc-control='business-gallery-image']")
      await photo.scrollIntoViewIfNeeded()
      await expect(photo).toBeVisible()
      await photo.click()
      const lightbox = page.locator("[data-doc-section='business-gallery-image-dialog']")
      await expect(lightbox).toBeVisible()
      await expect(lightbox.locator("img[src='/e2e/docs/assets/synthetic-business-header.svg']")).toBeVisible()
      await lightbox.locator("[data-slot='dialog-close-button']").click()
      await expect(lightbox).toHaveCount(0)
      await expect(overlay).toBeVisible()
      await expect(photo).toBeVisible()
      await dialog.evaluate((element) => { element.scrollTop = 0 })
      await expect(dialog.getByText('A synthetic business used only for documentation capture.')).toBeVisible()
      await expect(dialog.getByText('Fixture-made bowls, soups, and drinks.')).toBeVisible()
      await expect(dialog.getByRole('heading', { name: 'Schedule', level: 3 })).toBeVisible()
    }
    return
  }

  if (capture.id.includes('reviews')) {
    await root.locator("[data-doc-control='business-reviews']").click()
    const dialog = page.locator("[data-doc-section='business-reviews-dialog']")
    await expect(dialog).toBeVisible()
    await expect(dialog.locator("[data-slot='dialog-title']")).toHaveText('Reviews')
    await expect(dialog.getByText('Synthetic Customer', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Fixture Guest', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Fresh ingredients and a smooth pickup experience.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('The menu details made choosing simple.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('08/08/26', { exact: true })).toBeVisible()
    await expect(dialog.getByText('03/08/26', { exact: true })).toBeVisible()
    const reviewText = await dialog.locator('#review').allTextContents()
    expect(reviewText).toHaveLength(2)
    expect(reviewText[0]).toContain('Synthetic Customer')
    expect(reviewText[1]).toContain('Fixture Guest')
    const overlay = page.locator("[data-doc-section='business-reviews-dialog']")
    await expect(overlay.locator("[data-slot='dialog-close-button']")).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(overlay).toHaveCount(0)
    await expect(root.locator("[data-doc-control='business-reviews']")).toBeVisible()
    await root.locator("[data-doc-control='business-reviews']").click()
    await expect(page.locator("[data-doc-section='business-reviews-dialog']")).toBeVisible()
    return
  }

  if (capture.id === 'business-details-mobile') {
    await expect(page.getByText('Pickup', { exact: true }).first()).toBeVisible()
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.addStyleTag({
      content: "[data-doc-section='mobile-bottom-navigation'] { display: none !important; }"
    })
  }
}

test.describe('Business details documentation', () => {
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

  test('reviews dialog stays contained and closable on mobile @mobile-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Responsive reviews contract runs once on mobile.')
    test.setTimeout(60_000)
    await page.clock.install({ time: new Date('2026-08-10T12:00:00-05:00') })

    const fixture = await loadFixture(manifest.fixture)
    const requestLog = createRequestLog()
    await installFixtureGlobals(page, fixture)
    await installNetworkGuard(page, fixture, requestLog)
    await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
    await disableMotion(page)
    await waitForDocumentationReady(page, manifest.readiness, "[data-doc-section='business-menu']")

    const root = await waitForResults(page)
    await assertUniversalDetails(root)
    await root.locator("[data-doc-control='business-reviews']").click()

    const overlay = page.locator("[data-doc-section='business-reviews-dialog']")
    const dialog = page.locator("[data-doc-section='business-reviews-dialog']")
    await expect(overlay).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Fresh ingredients and a smooth pickup experience.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('The menu details made choosing simple.', { exact: true })).toBeVisible()
    await expect(overlay.locator("[data-slot='dialog-close-button']")).toBeVisible()

    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)).toBe(true)

    await overlay.locator("[data-slot='dialog-close-button']").click()
    await expect(overlay).toHaveCount(0)
    await expect(root.locator("[data-doc-control='business-reviews']")).toBeVisible()

    await waitForRequestQuiescence(requestLog, manifest.readiness.network)
    const catalogRequests = matchingRequests(requestLog, 'GET', businessPatterns['synthetic-market'])
    expect(catalogRequests).toHaveLength(1)
    verifyCatalogRequest(catalogRequests[0], 'synthetic-market')
    expect(requestLog.matched.filter((request) => request.method !== 'GET')).toHaveLength(0)
    assertNoUnknownRequests(requestLog)
    assertFixtureRequests(fixture, requestLog)
  })
})
