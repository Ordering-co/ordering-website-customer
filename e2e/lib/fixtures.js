import { expect, test as base } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { disableMotion } from '../docs/lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../docs/lib/fixtures.js'
import { APP_ORIGIN } from '../docs/lib/server.cjs'
import { createRequestLog, installNetworkGuard, waitForRequestQuiescence } from '../docs/lib/network.js'

// Shared fixture of the web's browser suite (e2e/web). It boots the real app over the docs fixtures (the whole API
// mocked by e2e/docs/lib/network.js) and adds the checks that must hold on EVERY page, state and width: the classes
// of failure QA kept reopening. A spec only drives the page; the fixture judges it.
//
//   automatic, at teardown of every test
//     - no write (POST/PUT/PATCH/DELETE) left the app without a mock;
//     - no console.error and no pageerror;
//     - the browser's own wording of a network failure, `[object Object]`, `undefined`, or a witness text injected
//       by a fault never showed on screen, not even for a moment (a MutationObserver watches from the first paint).
//   on demand: `app.check(label)` → no horizontal scroll, dialogs inside the viewport, header aligned within 2px,
//     personal and address fields with a real `autocomplete`, optionally axe.

// While a bug's fix is not integrated its spec carries `test.fail(KNOWN_BUGS, …)`, so the suite stays green and flips
// to red the moment the fix lands (an unexpected pass). `E2E_KNOWN_BUGS=off` runs those specs as plain tests: that is
// how a fix is verified, and how the failure message of a still-open bug is read.
export const KNOWN_BUGS = process.env.E2E_KNOWN_BUGS !== 'off'
// console.error the app itself raises today and that has an issue open; remove each entry when its fix lands
// (implementation notes, the profile phone that was not E.164, is fixed: none left).
const KNOWN_CONSOLE_ERRORS = []
export const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const FROZEN_NOW = new Date('2026-08-10T12:00:00-05:00')

// What a user must never read. The browser's wording of a transport failure differs by engine.
const RAW_TEXT = [
  'Failed to fetch',
  'NetworkError when attempting to fetch resource',
  'Load failed',
  'Network request failed',
  'Error: \\[',
  '\\[object Object\\]',
  '\\bundefined\\b'
]

// Valid `autocomplete` tokens (HTML living standard) per kind of personal field. `new-field` and `off` are not.
const AUTOCOMPLETE = {
  email: ['email', 'username'],
  phone: ['tel', 'tel-national', 'tel-local', 'tel-national'],
  givenName: ['given-name', 'name'],
  familyName: ['family-name'],
  street: ['street-address', 'address-line1', 'address-line2'],
  postal: ['postal-code'],
  city: ['address-level2']
}

const kindOfField = ({ type, hint }) => {
  if (type === 'password' || type === 'hidden' || type === 'checkbox' || type === 'radio') return null
  if (type === 'email' || /e-?mail/i.test(hint)) return 'email'
  if (type === 'tel' || /phone|cellphone|mobile/i.test(hint)) return 'phone'
  if (/last.?name|family.?name|apellido/i.test(hint)) return 'familyName'
  if (/first.?name|given.?name|^name$|\bname\b(?!.*(business|store|menu|product))/i.test(hint) && !/address|business|store|company/i.test(hint)) return 'givenName'
  if (/zip|postal|código postal/i.test(hint)) return 'postal'
  if (/city|ciudad/i.test(hint)) return 'city'
  if (/(^|[^a-z])(address|street|dirección|direccion)([^a-z]|$)/i.test(hint) && !/note|email|e-mail/i.test(hint)) return 'street'
  return null
}

const pageSnapshot = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0
  }
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }
  const labelOf = (el) => {
    const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : ''
    return [byFor, el.closest('label')?.textContent, el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.name, el.id].filter(Boolean).join(' ')
  }
  const header = document.querySelector('[data-app-header]')
  // the app's menu is the first button of #left-side; the design fixture marks it data-test=menu
  const menu = header?.querySelector('[data-test=menu], #left-side button')
  const cart = header?.querySelector('[data-doc-control=cart-open]')
  const badge = cart?.querySelector('span[aria-hidden=true]')
  return {
    viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
    coarsePointer: Boolean(window.matchMedia?.('(pointer: coarse)')?.matches),
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('[role=dialog],[role=alertdialog]')]
      .filter(visible)
      .map((el) => ({ label: el.getAttribute('aria-label') || el.getAttribute('data-doc-section') || el.id || 'dialog', ...box(el) })),
    header: header && menu && cart && visible(menu) && visible(cart)
      ? { menu: box(menu), cart: box(cart), badge: badge && visible(badge) ? box(badge) : null }
      : null,
    fields: [...document.querySelectorAll('input,textarea')]
      .filter((el) => visible(el) && !el.disabled && !el.readOnly)
      .map((el) => ({ type: el.type, hint: labelOf(el), autocomplete: el.getAttribute('autocomplete') || '', name: el.name || el.id || '' }))
  }
}

// Watches the page text from the first paint, so a toast that lives two seconds is still caught.
const installTextWatcher = () => {
  window.__TEXT_WATCH__ = { patterns: [], witnesses: [], seen: [] }
  const watch = window.__TEXT_WATCH__
  const scan = () => {
    const text = document.body?.innerText
    if (!text) return
    for (const source of watch.patterns) {
      const hit = text.match(new RegExp(source))
      if (hit && !watch.seen.some((seen) => seen.what === source)) watch.seen.push({ what: source, around: text.slice(Math.max(0, hit.index - 40), hit.index + 80) })
    }
    for (const witness of watch.witnesses) {
      if (text.includes(witness) && !watch.seen.some((seen) => seen.what === witness)) watch.seen.push({ what: witness, around: 'witness text of an injected failure' })
    }
  }
  // what is added, and what is shown by an attribute (an error that was in the page hidden), implementation notes
  new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden'] })
  window.addEventListener('load', scan)
  // the teardown scans once more: a rule or an animation shows a text with no mutation to announce it
  watch.scan = scan
}

export const test = base.extend({
  app: async ({ page }, use, testInfo) => {
    const consoleErrors = []
    const pageErrors = []
    const injected = []
    // WebKit cancels the lazy dev-server modules of the document a reload is leaving and reports them as errors
    let reloading = false
    const leavingPage = (text) => reloading && /Importing a module script failed/.test(text)
    page.on('pageerror', (error) => { if (!leavingPage(error.message)) pageErrors.push(error.message) })
    // "Failed to load resource" is the browser narrating a request the guard or a fault already failed on purpose.
    page.on('console', (message) => {
      const text = message.text()
      if (message.type() !== 'error' || /^Failed to load resource/.test(text)) return
      if (leavingPage(text)) return
      // WebKit does not know `interactive-widget` (index.html, implementation notesChrome for Android resizes with the keyboard) and says so in the console; the key is ignored there
      if (/Viewport argument key "interactive-widget" not recognized/.test(text)) return
      if (KNOWN_BUGS && KNOWN_CONSOLE_ERRORS.some((known) => known.test(text))) return
      consoleErrors.push(text)
    })

    const app = {
      page,
      requestLog: createRequestLog(),
      fixture: null,
      consoleErrors,
      pageErrors,
      injected,

      // Boots the app on a docs fixture. Every API call is answered by the fixture or blocked with a 418.
      async open (fixtureName, route, { authenticated = false, mutate, clock = true } = {}) {
        app.fixture = await loadFixture(fixtureName)
        await mutate?.(app.fixture)
        if (clock) await page.clock.install({ time: FROZEN_NOW })
        await installFixtureGlobals(page, app.fixture, { authenticated })
        await installNetworkGuard(page, app.fixture, app.requestLog)
        await page.addInitScript(installTextWatcher)
        await page.addInitScript((patterns) => { window.__TEXT_WATCH__.patterns = patterns }, RAW_TEXT)
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        await disableMotion(page)
        return app
      },

      // Registers a text that must never appear (the witness of an injected failure).
      async watchText (witness) {
        await page.addInitScript((text) => { window.__TEXT_WATCH__.witnesses.push(text) }, witness)
        await page.evaluate((text) => { window.__TEXT_WATCH__.witnesses.push(text) }, witness)
      },

      // Every write matching `match` (default: all of them) fails with an HTTP 422 whose body carries `witness`,
      // the way api-core answers a validation error. Registered after the guard, so it answers first.
      async inject422 ({ witness, match = /./, methods = WRITE_METHODS }) {
        await app.watchText(witness)
        await page.route(
          (url) => url.origin !== APP_ORIGIN && match.test(url.pathname + url.search),
          async (route) => {
            const request = route.request()
            if (!methods.includes(request.method())) return route.fallback()
            injected.push({ kind: '422', method: request.method(), path: new URL(request.url()).pathname })
            await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: true, result: [witness] }) })
          }
        )
      },

      // Every request matching `match` dies at the transport, like a dropped connection.
      async cutNetwork ({ match = /./, methods = WRITE_METHODS }) {
        await page.route(
          (url) => url.origin !== APP_ORIGIN && match.test(url.pathname + url.search),
          async (route) => {
            const request = route.request()
            if (!methods.includes(request.method())) return route.fallback()
            injected.push({ kind: 'cut', method: request.method(), path: new URL(request.url()).pathname })
            await route.abort('failed')
          }
        )
      },

      // A reload that keeps what the app stored. installFixtureGlobals wipes localStorage on every document load (so a
      // page always starts from the fixture); this puts back what the page had, as a real browser would keep it.
      async reload () {
        // leaving a page that still loads lazy modules makes WebKit raise "Importing a module script failed" in the old document
        await page.waitForLoadState('networkidle')
        const stored = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)))
        await page.addInitScript((entries) => { for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value) }, stored)
        reloading = true
        try {
          await page.reload({ waitUntil: 'domcontentloaded' })
          await disableMotion(page)
        } finally {
          reloading = false
        }
      },

      async settle () {
        await waitForRequestQuiescence(app.requestLog, { quietMs: 250, timeout: 5000 }).catch(() => {})
      },

      assertNoUnknownWrites () {
        const writes = app.requestLog.unknown.filter((entry) => WRITE_METHODS.some((method) => entry.startsWith(`${method} `)))
        if (writes.length > 0) throw new Error(`A write left the app without a mock (it would have reached the real API):\n${[...new Set(writes)].join('\n')}`)
      },

      async textSeen () {
        return page.evaluate(() => { window.__TEXT_WATCH__?.scan?.(); return window.__TEXT_WATCH__?.seen ?? [] })
      },

      // The checks of a page in a given state. `label` names it in the failure message.
      async check (label, { header = true, axe = false, autocomplete = true, streetOffWithMouse = false } = {}) {
        const snap = await page.evaluate(pageSnapshot)
        const at = `[${label} @ ${snap.viewport.width}px]`
        expect(Math.max(snap.scrollWidth, snap.bodyScrollWidth), `${at} the page scrolls horizontally`).toBeLessThanOrEqual(snap.viewport.width)
        for (const dialog of snap.dialogs) {
          expect(dialog.left, `${at} dialog "${dialog.label}" starts left of the screen`).toBeGreaterThanOrEqual(-0.5)
          expect(dialog.top, `${at} dialog "${dialog.label}" starts above the screen`).toBeGreaterThanOrEqual(-0.5)
          expect(dialog.right, `${at} dialog "${dialog.label}" ends right of the screen`).toBeLessThanOrEqual(snap.viewport.width + 0.5)
          expect(dialog.bottom, `${at} dialog "${dialog.label}" ends below the screen`).toBeLessThanOrEqual(snap.viewport.height + 0.5)
        }
        if (header && snap.header) {
          const { menu, cart, badge } = snap.header
          const start = menu.left
          const end = snap.viewport.width - Math.max(cart.right, badge?.right ?? 0)
          expect(Math.abs(start - end), `${at} header margins differ: menu ${start.toFixed(1)}px from the left edge, cart ${end.toFixed(1)}px from the right`).toBeLessThanOrEqual(2)
          const menuMiddle = (menu.top + menu.bottom) / 2
          const cartMiddle = (cart.top + cart.bottom) / 2
          expect(Math.abs(menuMiddle - cartMiddle), `${at} menu and cart are not on the same line (${menuMiddle.toFixed(1)} vs ${cartMiddle.toFixed(1)})`).toBeLessThanOrEqual(2)
        }
        if (autocomplete) {
          for (const field of snap.fields) {
            const kind = kindOfField(field)
            if (!kind) continue
            const tokens = field.autocomplete.split(/\s+/).filter(Boolean)
            // an address search whose suggestions would be covered by the browser's own popup may opt out, with a mouse only
            if (kind === 'street' && streetOffWithMouse && !snap.coarsePointer && tokens.includes('off')) continue
            expect(
              tokens.some((token) => AUTOCOMPLETE[kind].includes(token)),
              `${at} ${kind} field "${field.hint.trim().slice(0, 40)}" has autocomplete="${field.autocomplete}" (expected one of ${AUTOCOMPLETE[kind].join(', ')})`
            ).toBe(true)
          }
        }
        if (axe) {
          const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          const serious = result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact))
          expect(serious.map((violation) => `${violation.id} (${violation.impact}, ${violation.nodes.length} nodes)`), `${at} axe violations`).toEqual([])
        }
      }
    }

    await use(app)

    app.assertNoUnknownWrites()
    expect(pageErrors, 'uncaught page errors').toEqual([])
    expect(consoleErrors, 'console.error calls').toEqual([])
    const seen = await app.textSeen().catch(() => [])
    expect(seen, 'text the user must never read showed on screen').toEqual([])
    if (injected.length > 0) testInfo.annotations.push({ type: 'faults', description: `${injected.length} injected: ${injected.map((fault) => `${fault.kind} ${fault.method} ${fault.path}`).join(', ')}` })
  }
})

export { expect }
