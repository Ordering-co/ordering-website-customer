import { expect, test } from '../lib/fixtures.js'
import { syntheticCart } from '../lib/flows.js'

// implementation noteson a phone the keyboard covers the page (iOS Safari, Chrome for Android since 108), so the checkout's
// fixed action bar ("Continue to payment" + "Still needed") sat over the field being typed in and the header took
// 70 px more. With a text field focused and the keyboard up: the field and its error are inside the visible box
// (under the header, over the keyboard), the bar is not fixed, the header is out of the way; when the keyboard goes
// all of it is as before. A fake `visualViewport` stands for the keyboard (the page cannot open one), as in
// e2e/design/dialog-keyboard. Every write is intercepted by the fixture's guard (a write with no mock fails the test).
const KEYBOARD = 300
const FIELDS = ['name', 'email', 'telefono']

const route = (fixture, method, part) => fixture.routes.find((r) => r.method === method && r.pattern.includes(part))
// a guest with no saved details at a pickup checkout: step 1 asks for name, last name, email and phone
const guestCheckout = (fixture) => {
  const guest = { id: 9201, guest_id: 9201, level: 3, name: '', lastname: '', email: '', cellphone: '', country_phone_code: '', enabled: true, email_verified: true, phone_verified: true, session: { access_token: fixture.authSession.token } }
  fixture.authSession.user = guest
  route(fixture, 'GET', '/users/9201(').response.result = guest
  const config = (key, value) => ({ key, value })
  Object.assign(fixture.firstLoad.configs, {
    guest_checkout_enabled: config('guest_checkout_enabled', '1'),
    allowed_order_types_guest_checkout: config('allowed_order_types_guest_checkout', 'pickup')
  })
  const cart = { ...syntheticCart(), uuid: 'synthetic-cart-checkout', user_id: 9201, type: 2, paymethod_id: null, paymethod_data: {} }
  route(fixture, 'GET', '/order_options(').response.result = { user_id: 9201, type: 2, moment: null, address: { id: 9211, address: '100 Synthetic Market Street', location: { lat: 30.2672, lng: -97.7431 } }, carts: [cart] }
  route(fixture, 'GET', '/business/8301').response.result = { id: 8301, slug: 'synthetic-market', name: 'Synthetic Market Kitchen', address: '200 Synthetic Checkout Avenue', paymethods: [{ paymethod_id: 1, sandbox: true, data: {}, paymethod: { id: 1, name: 'Cash', gateway: 'cash', enabled: true } }], configs: [], schedule: [], today: null, vertical: 'food' }
  route(fixture, 'GET', 'validation_field_order_types').response.result = ['name', 'lastname', 'email', 'mobile_phone'].map((code) => ({ order_type_id: 2, enabled: true, required: true, required_with_guest: true, validation_field: { code, name: code } }))
}

const fakeVisualViewport = () => {
  const visual = Object.assign(new EventTarget(), { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, scale: 1 })
  Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true })
  window.__keyboard = (px) => { visual.height = innerHeight - px; visual.dispatchEvent(new Event('resize')) }
}

test.describe('1563 · checkout with the keyboard up', () => {
  test.beforeEach(({ page }) => {
    test.skip(page.viewportSize().width > 430, 'the keyboard covers the page on phones')
  })

  test('the field and its error stay between the header and the keyboard, the bar leaves the flow, the header gives way', async ({ app, page }) => {
    await page.addInitScript(fakeVisualViewport)
    await app.open('complete-checkout', '/checkout/synthetic-cart-checkout', { authenticated: true, mutate: guestCheckout })
    const button = page.locator('button[data-doc-control=checkout-place-order]')
    await expect(button).toHaveText('Continue to payment', { timeout: 30000 })
    // the fields paint their errors, as a person who pressed the button before typing sees them
    await button.click()
    for (const name of FIELDS) await expect(page.locator(`input[name=${name}]`)).toHaveAttribute('aria-describedby', /error/)

    // the form brings its first invalid field to the middle of the page by itself: let that scroll end first
    await expect.poll(async () => {
      const before = await page.evaluate(() => scrollY)
      await page.waitForTimeout(400)
      return before === await page.evaluate(() => scrollY)
    }).toBe(true)

    const barIsFixed = () => button.evaluate((el) => { for (let node = el; node; node = node.parentElement) if (getComputedStyle(node).position === 'fixed') return true; return false })
    const headerBottom = () => page.evaluate(() => document.querySelector('[data-app-header]').getBoundingClientRect().bottom)
    const placeOf = (name) => page.evaluate((fieldName) => {
      const field = document.querySelector(`input[name=${fieldName}]`)
      const error = document.getElementById(field.getAttribute('aria-describedby'))
      return { top: field.getBoundingClientRect().top, bottom: Math.max(field.getBoundingClientRect().bottom, error.getBoundingClientRect().bottom), height: innerHeight }
    }, name)

    const header = await headerBottom()
    expect(header, 'the header has a row to give up').toBeGreaterThan(0)
    expect(await barIsFixed(), 'the bar is fixed with no keyboard').toBe(true)

    for (const name of FIELDS) {
      await page.locator(`input[name=${name}]`).focus()
      await page.evaluate((px) => window.__keyboard(px), KEYBOARD)
      await expect.poll(barIsFixed, { message: `${name}: the bar is not fixed while typing` }).toBe(false)
      await expect.poll(headerBottom, { message: `${name}: the header gives way` }).toBeLessThanOrEqual(0.5)
      // the scroller waits for the visual viewport to rest: the field ends under the header and over the keyboard...
      const inside = async () => {
        const place = await placeOf(name)
        return place.top >= Math.max(await headerBottom(), 0) - 0.5 && place.bottom <= place.height - KEYBOARD + 0.5
      }
      await expect.poll(inside, { message: `${name} and its error: between the header and the keyboard (${JSON.stringify(await placeOf(name))})` }).toBe(true)
      // ...and then keeps still: the bar and the header changing did not push it around
      const settled = await placeOf(name)
      await page.waitForTimeout(500)
      expect(await placeOf(name), `${name}: the field keeps still`).toEqual(settled)
    }
    // what the styles read: the attribute and the variables of the one hook (useKeyboardOpen)
    await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', '')
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--keyboard-inset'))).toBe(`${KEYBOARD}px`)

    await page.locator('input[name=telefono]').blur()
    await page.evaluate(() => window.__keyboard(0))
    await expect.poll(barIsFixed, { message: 'the bar is fixed again with the keyboard gone' }).toBe(true)
    await expect.poll(headerBottom, { message: 'the header is back' }).toBeCloseTo(header, 0)
  })
})
