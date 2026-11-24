import { expect, test } from '../../lib/fixtures.js'
import { HEADER_PAGES, LONG_ADDRESS, withCart, withLongAddress } from '../../lib/flows.js'

// implementation notes (reopened on afde8b5e / d7e7e4e1): at 382, 390 and 412px the clock and "ASAP" of the second row sat on
// the left edge of the capsule while Delivery/Pickup were centred (7px from the edge, 48px left of the Delivery
// icon). Earlier reports: a long delivery address covered Pickup and intercepted its click. The header has three
// layouts (two stacked rows on a phone, one row under the header on a tablet, everything in the header from 1024px),
// so the spec first reads which one it is looking at and asserts what that layout promises. Per project width.
const measure = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } }
  const shown = (el) => el.getBoundingClientRect().width > 0
  const buttonWith = (test) => [...document.querySelectorAll('button')].filter(shown).find((el) => test(el.innerText.trim()))
  const types = [...document.querySelectorAll('[data-doc-section=header-order-types]')].find(shown)
  const moment = [...document.querySelectorAll('[data-doc-control=order-moment-open]')].find(shown) ?? buttonWith((text) => /^ASAP$|^\d\d-\d\d /.test(text))
  const address = [...document.querySelectorAll('[data-doc-control=order-address-open]')].find(shown) ?? buttonWith((text) => text.includes('Odyssey'))
  const pickup = types && [...types.querySelectorAll('[role=radio]')].find((el) => /pickup/i.test(el.textContent))
  const middle = pickup && { x: (box(pickup).left + box(pickup).right) / 2, y: (box(pickup).top + box(pickup).bottom) / 2 }
  const hit = middle && document.elementFromPoint(middle.x, middle.y)
  return {
    width: document.documentElement.clientWidth,
    types: types ? box(types) : null,
    moment: moment ? box(moment) : null,
    momentContent: moment?.firstElementChild ? box(moment.firstElementChild) : null,
    address: address ? box(address) : null,
    pickupClickable: pickup ? pickup.contains(hit) : null
  }
}
const centerX = (b) => (b.left + b.right) / 2
const centerY = (b) => (b.top + b.bottom) / 2
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

test.describe('1482 · order context, Pickup / ASAP', () => {
  const entry = HEADER_PAGES.find(({ name }) => name === 'store')
  test('Delivery/Pickup and the time are aligned with each other in the layout of this width', async ({ app, page }) => {
    await app.open(entry.fixture, entry.route, { authenticated: entry.authenticated, mutate: withCart })
    await expect(page.locator('[data-doc-section=header-order-types]').first()).toBeVisible({ timeout: 30_000 })
    await app.settle()
    const g = await page.evaluate(measure)
    expect(g.types, 'Delivery / Pickup is on screen').not.toBeNull()
    expect(g.moment, 'the time (ASAP) is on screen').not.toBeNull()
    expect(overlap(g.types, g.moment), 'Delivery/Pickup and the time overlap').toBe(false)
    if (g.moment.top >= g.types.bottom - 1) {
      // stacked rows (phones): the clock and ASAP are centred under the control above, away from the capsule's edge
      expect(Math.abs(centerX(g.momentContent) - centerX(g.types)), `ASAP group centre x=${centerX(g.momentContent)} against Delivery/Pickup x=${centerX(g.types)}`).toBeLessThanOrEqual(2)
      expect(g.momentContent.left - g.moment.left, 'the clock is stuck to the capsule edge').toBeGreaterThan(16)
    } else {
      // one row (tablet and desktop): same centre line
      expect(Math.abs(centerY(g.types) - centerY(g.moment)), 'Delivery/Pickup and the time are not on one line').toBeLessThanOrEqual(2)
    }
    await app.check('store pickup/asap')
  })
})

test.describe('1482 · order context, Delivery with a long address', () => {
  test('the address does not cover Pickup nor the edge, and Pickup stays clickable', async ({ app, page }) => {
    await app.open('addresses', '/search?lat=30.2672&lng=-97.7431&order_type=1', { authenticated: true, mutate: withLongAddress })
    await expect(page.locator('[data-doc-section=header-order-types]').first()).toBeVisible({ timeout: 30_000 })
    await app.settle()
    const g = await page.evaluate(measure)
    expect(g.address, `the Delivery address (${LONG_ADDRESS.length} characters) is on screen`).not.toBeNull()
    expect(overlap(g.address, g.types), 'the address overlaps the Delivery/Pickup control').toBe(false)
    expect(g.address.right, 'the address runs past the viewport').toBeLessThanOrEqual(g.width)
    expect(g.address.height, `the address takes ${Math.round(g.address.height)}px: cut it with an ellipsis, do not wrap it over lines`).toBeLessThanOrEqual(56)
    expect(g.pickupClickable, 'a tap on Pickup lands on something else').toBe(true)
    await app.check('delivery long address')
  })
})

// implementation notes (Duo, 380px) / implementation notesthe store page scrolled, the header's time ("ASAP") dropped alone to a second
// row under the menu, the store and the cart. On a phone (under 576px) the store's name yields and the time shares the
// first row with them (as the address chip does), in Pickup and in Delivery with no address (both show the time, not
// the address). Per project width, and at 430px (not a project) in the 390 project.
const ORDER_OPTIONS = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const timeChipShareTheRow = async ({ app, page }, type, label) => {
  await app.open('manage-cart', '/store/synthetic-market', {
    authenticated: true,
    mutate: (fixture) => {
      withCart(fixture)
      const { result } = fixture.routes.find(({ method, pattern }) => method === 'GET' && pattern === ORDER_OPTIONS).response
      result.type = type
      result.address = {}
    }
  })
  await expect(page.locator('[data-app-header]')).toBeVisible({ timeout: 30_000 })
  await app.settle()
  await expect(page.locator('#business_name')).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => page.evaluate(() => { window.scrollTo(0, 1200); return window.scrollY }), 'the page scrolls').toBeGreaterThan(900)
  const chip = page.locator('[data-doc-section=header-order-context-chip]')
  await expect(chip, 'the scrolled header shows the time chip').toBeVisible()
  const g = await page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
    const header = document.querySelector('[data-app-header]')
    const chipEl = header.querySelector('[data-doc-section=header-order-context-chip]')
    return { width: document.documentElement.clientWidth, header: box(header), chip: box(chipEl), menu: box(header.querySelector('#left-side button')), cart: box(header.querySelector('[data-doc-control=cart-open]')) }
  })
  expect(Math.abs(centerY(g.chip) - centerY(g.menu)), `the chip is on the menu's row (chip y=${centerY(g.chip)}, menu y=${centerY(g.menu)})`).toBeLessThanOrEqual(2)
  expect(g.chip.right, 'the chip ends before the cart').toBeLessThanOrEqual(g.cart.left)
  expect(g.header.bottom - g.header.top, 'the header is one row tall').toBeLessThanOrEqual(75)
  expect(g.width - g.cart.right, 'the cart is 20px from the edge').toBeCloseTo(20, 0)
  await app.check(`store scrolled ${label}`)
}
for (const [label, type] of [['Pickup', 2], ['Delivery, no address', 1]]) {
  test.describe(`1482 · the time chip is not alone on a second row · ${label}`, () => {
    test('on a phone, scrolled, the chip, the menu and the cart share the row, the cart 20px from the edge', async ({ app, page }) => {
      test.skip(page.viewportSize().width >= 576, 'a phone layout: under 576px')
      await timeChipShareTheRow({ app, page }, type, label)
    })
    test('at 430px too (a Pro Max)', async ({ app, page }, testInfo) => {
      test.skip(testInfo.project.name !== 'w390', 'one project runs the extra width')
      await page.setViewportSize({ width: 430, height: 932 })
      await timeChipShareTheRow({ app, page }, type, label)
    })
  })
}
