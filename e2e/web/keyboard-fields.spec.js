import { expect, test } from '../lib/fixtures.js'
import { ADDRESS_FIXTURE, ADDRESS_ROUTE, withAddressSuggestions } from '../lib/flows.js'

// implementation notesthe on-screen keyboard covers the page on iOS Safari (and Chrome for Android until the viewport meta asks
// to resize), so a dialog or a sheet that followed the visual viewport by itself jumped when a field took the focus:
// it shrank, its form was cut at the top, a blank strip stayed and the field was half behind the keyboard (the video
// of the sign-up dialog). One state now (useKeyboardOpen): the layer keeps its size and its body pads what the keyboard
// covers. For the login, sign-up, address form, product's instructions and profile, at each phone width, for every
// field that takes the focus: the container does not change its height or place, the field and its error are whole
// between the lower edge of the band (or the header) and the top of the keyboard, our scroller moves at most once and
// then the field keeps still, and the body can scroll to its end above the keyboard with no blank strip left under
// the content. A fake `visualViewport` stands for the keyboard (the page cannot open one), as in e2e/design/dialog-keyboard.
// Every write is intercepted by the fixture's guard (a write with no mock fails the test).
const KEYBOARD = 300
const POPUP = '[data-slot=dialog-content], [data-slot=sheet-content]'
const TEXT = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=submit]):not([type=button]), textarea'

const fakeKeyboard = () => {
  const visual = Object.assign(new EventTarget(), { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, scale: 1 })
  Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true })
  window.__keyboard = (px) => { visual.height = innerHeight - px; visual.dispatchEvent(new Event('resize')) }
  // how many times something is scrolled vertically (the one scroller: useKeyboardOpen; a tab strip moves sideways)
  window.__scrolls = 0
  window.__scrollers = []
  for (const target of [window, Element.prototype]) {
    const original = target.scrollBy
    target.scrollBy = function (...args) { if (!args[0]?.top) return original.apply(this, args); window.__scrolls += 1; window.__scrollers.push(`${JSON.stringify(args[0])} ${new Error().stack.split('\n')[2]?.trim()}`); return original.apply(this, args) }
  }
}

// what the person sees of the container and of the field with its error, in px of the layout viewport
const measure = ({ popupSelector, index, fieldSelector }) => {
  const popup = popupSelector ? [...document.querySelectorAll(popupSelector)].at(-1) : null
  const scroller = popup && [...popup.children].find((el) => getComputedStyle(el).overflowY === 'auto')
  const fields = [...(popup || document).querySelectorAll(fieldSelector)].filter((el) => el.offsetParent !== null && !el.disabled)
  const field = fields[index]
  const described = (field?.getAttribute('aria-describedby') || '').split(' ').map((id) => id && document.getElementById(id)).filter(Boolean)
  const header = document.querySelector('[data-app-header]')
  const rect = popup?.getBoundingClientRect()
  return {
    count: fields.length,
    name: field && (field.name || field.getAttribute('aria-label') || field.placeholder || field.id),
    fieldTop: field?.getBoundingClientRect().top,
    fieldBottom: field && Math.max(...[field, ...described].map((el) => el.getBoundingClientRect().bottom)),
    // the lower edge of what owns the top: the band of the close or the handle (the scroller's scroll-padding), or the header
    topLimit: Math.max(0, scroller ? scroller.getBoundingClientRect().top + (parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0) : (header ? header.getBoundingClientRect().bottom : 0)),
    popupHeight: rect?.height,
    popupTop: rect?.top,
    popupBottom: rect?.bottom,
    scrolls: window.__scrolls,
    scrollers: window.__scrollers
  }
}

// the body scrolled to its end: how far the content stops from the keyboard (a blank strip) and whether it passes it
const atTheEnd = ({ popupSelector }) => {
  const popup = [...document.querySelectorAll(popupSelector)].at(-1)
  const scroller = [...popup.children].find((el) => getComputedStyle(el).overflowY === 'auto')
  const scrollable = scroller.scrollHeight > scroller.clientHeight
  scroller.scrollTop = scroller.scrollHeight
  const content = [...scroller.querySelectorAll('*')].filter((el) => {
    const rect = el.getBoundingClientRect()
    return rect.height > 1 && getComputedStyle(el).position !== 'fixed' && getComputedStyle(el).visibility !== 'hidden'
  })
  return {
    scrollable,
    contentBottom: Math.max(...content.map((el) => el.getBoundingClientRect().bottom)),
    padding: parseFloat(getComputedStyle(scroller).paddingBottom),
    inset: parseFloat(document.documentElement.style.getPropertyValue('--keyboard-inset')) || 0
  }
}

// each flow opens its screen and hands the container (`popup`: a dialog or a sheet; none: the page) and the text fields
const FLOWS = {
  login: {
    popup: true,
    async open ({ app, page }) {
      await app.open('sign-in-create-account', '/home')
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await page.locator('#sidebar_menu').getByRole('button', { name: 'Sign in', exact: true }).click()
      const login = page.locator("[data-doc-section='authentication-login']")
      await expect(login).toBeVisible({ timeout: 30_000 })
      // the person pressed Login with nothing typed: every field has its error
      await login.locator("[data-doc-control='authentication-submit']").click()
    }
  },
  signup: {
    popup: true,
    async open ({ app, page }) {
      await FLOWS.login.open({ app, page })
      await page.locator("[data-doc-section='authentication-login']").getByText('Create account', { exact: true }).click()
      const signup = page.locator("[data-doc-section='authentication-signup']")
      await expect(signup).toBeVisible()
      // as in the video: name and email typed, Password empty and with its error
      await signup.locator('input[name=name]').fill('Sergio')
      await signup.locator('input[name=email]').fill('sergio@example.com')
      await signup.locator("[data-doc-control='authentication-signup-submit']").click()
      await expect(signup.locator('input[name=password]')).toHaveAttribute('aria-describedby', /./)
    }
  },
  address: {
    popup: true,
    async open ({ app, page }) {
      await app.open(ADDRESS_FIXTURE, ADDRESS_ROUTE, { authenticated: true, mutate: withAddressSuggestions })
      await page.locator("[data-doc-section='address-list'] [data-doc-control='address-add']").click()
      await expect(page.locator("[data-doc-section='address-form']")).toHaveAttribute('data-doc-state', 'ready')
    }
  },
  product: {
    popup: true,
    async open ({ app, page }) {
      await app.open('customize-product', '/store/synthetic-market/bowls/synthetic-custom-bowl', { authenticated: true })
      const product = page.locator("[data-doc-section='product-customization-dialog']")
      await expect(product).toBeVisible({ timeout: 30_000 })
      await product.getByRole('button', { name: 'Additional instructions', exact: true }).click()
      await expect(product.locator("[data-doc-section='product-instructions'] textarea")).toBeVisible()
    }
  },
  profile: {
    popup: false,
    async open ({ app, page }) {
      await app.open('profile', '/profile?view=account', { authenticated: true })
      await expect(page.locator("[data-doc-section='user-profile'] input[name=name]")).toBeEnabled({ timeout: 30_000 })
    }
  }
}

test.describe('1566 · keyboard up over a field of a dialog, a sheet or the page', () => {
  test.beforeEach(({ page }) => {
    test.skip(page.viewportSize().width > 430, 'the keyboard covers the page on phones')
  })

  for (const [name, flow] of Object.entries(FLOWS)) {
    test(`${name}: the container keeps still, each field and its error stay between the band and the keyboard`, async ({ app, page }) => {
      await page.addInitScript(fakeKeyboard)
      await flow.open({ app, page })
      const popupSelector = flow.popup ? POPUP : null
      const args = (index) => ({ popupSelector, index, fieldSelector: TEXT })
      const inPage = (index) => page.evaluate(measure, args(index))
      if (flow.popup) await expect(page.locator(POPUP).last()).toBeVisible()
      // the fields as the app shows them, once the screen is ready
      await page.waitForTimeout(300)
      const rest = await inPage(0)
      expect(rest.count, `${name}: the flow has text fields`).toBeGreaterThan(0)
      const keyboardTop = page.viewportSize().height - KEYBOARD
      // the form brings its first invalid field into view by itself: let that end first
      await page.waitForTimeout(500)

      for (let index = 0; index < rest.count; index += 1) {
        const before = await inPage(index)
        await page.evaluate(() => { window.__scrolls = 0; window.__scrollers = [] })
        await page.locator(popupSelector || 'body').last().locator(TEXT).and(page.locator(':visible')).nth(index).focus()
        await page.evaluate((px) => window.__keyboard(px), KEYBOARD)
        const label = `${name} #${index} (${before.name})`
        const inside = async () => {
          const place = await inPage(index)
          return place.fieldTop >= place.topLimit - 0.5 && place.fieldBottom <= keyboardTop + 0.5
        }
        await expect.poll(inside, { message: `${label}: the field and its error between the band or header and the keyboard (${JSON.stringify(await inPage(index))})`, timeout: 5000 }).toBe(true)
        // then it keeps still, our scroller moved it at most once, and the container is as it was
        const settled = await inPage(index)
        await page.waitForTimeout(500)
        const after = await inPage(index)
        expect(after.fieldTop, `${label}: the field keeps still`).toBeCloseTo(settled.fieldTop, 0)
        expect(after.scrolls, `${label}: placed at most once (${after.scrollers.join(' | ')})`).toBeLessThanOrEqual(1)
        if (flow.popup) {
          expect(after.popupHeight, `${label}: the container keeps its height`).toBeCloseTo(rest.popupHeight, 0)
          expect(after.popupTop, `${label}: and its place`).toBeCloseTo(rest.popupTop, 0)
          expect(after.popupBottom, `${label}: no blank strip under the container, over the keyboard`).toBeGreaterThanOrEqual(keyboardTop - 0.5)
        }
      }

      if (flow.popup) {
        const end = await page.evaluate(atTheEnd, { popupSelector })
        // the content reaches above the keyboard, and what is left under it is the body's padding at most
        expect(end.contentBottom, `${name}: the end of the content is above the keyboard`).toBeLessThanOrEqual(keyboardTop + 0.5)
        if (end.scrollable) expect(keyboardTop - end.contentBottom, `${name}: no blank strip over the keyboard`).toBeLessThanOrEqual(end.padding - end.inset + 2)
      }
      await page.evaluate(() => { document.activeElement?.blur(); window.__keyboard(0) })
      await expect(page.locator('html')).not.toHaveAttribute('data-keyboard-open')
    })
  }
})
