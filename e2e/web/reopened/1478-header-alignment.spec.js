import { expect, test } from '../../lib/fixtures.js'
import { HEADER_PAGES, withCart } from '../../lib/flows.js'

// implementation notes (reopened on afde8b5e): at 360/390/430 the cart's side margin did not match the menu's, and the count
// sat 14px above the cart's line (centre y=21 against y=35), 16px from the edge on checkout against 20px of the
// menu. jsdom tests passed, because jsdom does not lay anything out. This spec measures the header in the browser,
// on each of the pages QA used, with a cart that has a count.
const geometry = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
  const visible = (el) => el && el.getBoundingClientRect().width > 0
  const header = document.querySelector('[data-app-header]')
  const menu = header.querySelector('#left-side button')
  const cart = header.querySelector('[data-doc-control=cart-open]')
  const badge = cart?.querySelector('span[aria-hidden=true]')
  const brand = [...header.querySelectorAll('#left-side button, #left-side a')].filter(visible).find((el) => el !== menu && el.innerText.trim())
  return {
    width: document.documentElement.clientWidth,
    menu: menu && box(menu),
    cart: cart && box(cart),
    badge: badge && visible(badge) ? { ...box(badge), text: badge.textContent } : null,
    brand: brand ? box(brand) : null
  }
}
const middle = (b) => (b.top + b.bottom) / 2

for (const entry of HEADER_PAGES) {
  test.describe(`1478 · header on ${entry.name}`, () => {
    test.beforeEach(async ({ app }) => {
      await app.open(entry.fixture, entry.route, { authenticated: entry.authenticated, mutate: withCart })
      await expect(app.page.locator('[data-app-header] [data-doc-control=cart-open]')).toBeVisible({ timeout: 30_000 })
      await app.settle()
    })

    test('the cart ends as far from the edge as the menu starts, on the same line', async ({ app, page }) => {
      const g = await page.evaluate(geometry)
      const end = g.width - Math.max(g.cart.right, g.badge?.right ?? 0)
      expect(Math.abs(g.menu.left - end), `menu starts ${g.menu.left}px from the left edge, the cart (with its count) ends ${end}px from the right`).toBeLessThanOrEqual(2)
      expect(Math.abs(middle(g.menu) - middle(g.cart)), 'menu and cart share a centre line').toBeLessThanOrEqual(2)
      if (g.brand) expect(Math.abs(middle(g.menu) - middle(g.brand)), 'menu and brand share a centre line').toBeLessThanOrEqual(2)
    })

    // Sergio decided: the count is a corner badge, not centred on the cart. It may stand above the cart's
    // centre line, but must not stick out of the cart's box nor of the page's edge, and the cart is there without a session.
    test('the count shows in the cart\'s corner, inside the cart and the page', async ({ app, page }) => {
      // a guest has no cart in the order options of this fixture: the home entry only proves the button is there
      test.skip(entry.noCount, 'no cart to count in the guest fixture')
      const g = await page.evaluate(geometry)
      expect(g.badge, 'the cart shows its count').not.toBeNull()
      expect(g.badge.right, 'the count sticks out of the cart on the right').toBeLessThanOrEqual(g.cart.right + 0.5)
      expect(g.badge.left, 'the count sticks out of the cart on the left').toBeGreaterThanOrEqual(g.cart.left - 0.5)
      expect(g.badge.top, 'the count sticks out of the header on the top').toBeGreaterThanOrEqual(0)
      expect(g.badge.right, 'the count is past the edge of the page').toBeLessThanOrEqual(g.width)
    })
  })
}
