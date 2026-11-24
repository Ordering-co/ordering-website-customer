import { expect, test } from '../../lib/fixtures.js'

// implementation notes (reopened): the heart of the BUSINESS was fixed (it says "Network error, please reload the page"), but
// the heart of the PRODUCT, on the product sheet, still showed the browser's own "Failed to fetch" above Add to cart
// when the POST to favorite_products died at the transport. The fixture fails the test on that text by itself (its
// watcher knows each engine's wording: "Failed to fetch", "Load failed", "NetworkError…"); this spec supplies the
// failing connection. Chromium and WebKit word it differently, so run it on both.
const PRODUCT = '/store/synthetic-market/bowls/synthetic-custom-bowl'

test.describe('1505 · favorite hearts with the connection dropped', () => {
  test('the product heart shows no browser text when the write dies', async ({ app, page }) => {
    await app.open('customize-product', PRODUCT, { authenticated: true })
    const heart = page.locator('button.favorite[aria-label="Favorite"]').first()
    await expect(heart).toBeVisible({ timeout: 30_000 })
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    await app.cutNetwork({ match: /\/favorite_products/, methods: ['POST', 'DELETE'] })
    await heart.click()
    await expect.poll(() => app.injected.length, { message: 'the tap should have sent the write that the test cuts' }).toBeGreaterThan(0)
    // the toast lives a few seconds; the watcher saw it from the first frame, this wait only lets it render
    await page.waitForTimeout(1500)
    expect(await app.textSeen(), 'the user read the browser\'s transport error').toEqual([])
    await expect(heart, 'the heart goes back to unmarked').toHaveAttribute('aria-pressed', 'false')
  })
})
