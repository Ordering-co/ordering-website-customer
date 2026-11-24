// implementation notes repro: every button of the cart (panel on desktop, modal on a
// phone) measured in a real Chromium, to compare before / after moving them to
// the base Button piece. Not part of vitest.
//
// Needs a dev server with DS_REVIEW=1 (`?ds_theme=defaults|grill|cafe` serves
// the test theme) against the store `cha_sha`. The API is PRODUCTION: nothing
// is ever written. The page gets a synthetic session (localStorage token and
// user) and a simulated cart: the `order_options` read is answered with it, the
// customer's own reads (`users/<id>`, wallets, paymethods) and the cart's
// upselling read are answered locally, and EVERY POST/PUT/PATCH/DELETE of the
// page (any host) is intercepted by `context.route`: the cart's add / update /
// remove / clear are fulfilled with the simulated cart, the rest is aborted.
// The log says how many writes were intercepted and that none was continued to
// the network (service workers are blocked so nothing can bypass the route).
//
//   API=<api base of the project> BASE=http://<host>:3128 OUT=before.json node cartButtons.repro.mjs
//   API=… BASE=http://<host>:3128 OUT=after.json COMPARE=before.json node cartButtons.repro.mjs
//
// Env: THEMES (default defaults,grill,cafe), WIDTHS (default 390,1440),
// CASES (default one,two,empty,multi), SHOT_DIR (one screenshot per width, grill
// with one product).
//
// Per theme x width x case it opens the cart (header button `cart-open`) and,
// for each control found, saves getComputedStyle of the properties in PROPS,
// getBoundingClientRect, the child svg (size, color, stroke, fill), the
// attributes (aria-*, disabled, type, role, data-doc-control, data-slot), the
// :hover state (page.hover, then measures again), and a hit test (the element
// at the control's centre is the control itself, so neighbouring touch targets
// do not overlap). It also records the count of each control (1 product ->
// n, 2 products -> n+1, empty cart -> 0), horizontal scroll (document and cart
// container), and console errors after load. A control that does not appear is
// "not present" with the condition under which the code renders it (read from
// the source, not measured).
//
// Cases: one (1 product), two (2 products, neighbours n -> n+1), empty (no
// cart), multi (2 carts of 2 stores: the only layout where the accordion toggle
// exists). COMPARE=<json> prints a table of differences (before -> after) per
// property; exit code 1 if there are differences or console errors.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE || 'http://localhost:3119'
const OUT = process.env.OUT
const COMPARE = process.env.COMPARE
const THEMES = (process.env.THEMES || 'defaults,grill,cafe').split(',')
const WIDTHS = (process.env.WIDTHS || '390,1440').split(',').map(Number)
const CASES = (process.env.CASES || 'one,two,empty,multi').split(',')
const SHOT_DIR = process.env.SHOT_DIR
const STORE = 'cha_sha'
// the API of the review store's project (the one the review server's VITE_DS_REVIEW_PROJECT
// names): never written in the code (devReview.js), e.g. API=<api url>/<version>/<language>/<project>
const API = process.env.API
if (!API) {
  console.error('API is not set: the API base of the review store\'s project (see the header)')
  process.exit(2)
}
const TOKEN = 'docs-fixture-cart-buttons-token'
const USER = { id: 9301, name: 'Synthetic', lastname: 'Fixture', email: 'docs@e.invalid', cellphone: '2025550199', country_phone_code: '1', session_strategy: 'jwt_session', enabled: true, level: 3, session: { access_token: TOKEN } }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const PROPS = ['color', 'background-color', 'border', 'border-radius', 'height', 'width', 'padding', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'box-shadow', 'opacity', 'cursor', 'display', 'position']

// Controls: `css` picks candidates inside the open cart, `text` keeps those whose
// trimmed text equals it, `near` keeps those whose parent or grandparent holds
// that text (and is short). `when` = the condition the source renders it under.
const CONTROLS = [
  { name: 'go-to-store', css: 'button, a, [role=button]', text: 'Go to store', when: 'BusinessItemAccordion L225: not the cart view (showUpsellingInBusinessInfo false: the cart popover, not this panel), handleStoreRedirect, not isStore / isCartOnProductsList / gift card, and theme cart.go_to_store visible' },
  { name: 'clear-cart', css: 'button, a, [role=button]', text: 'Clear cart', when: 'products in an open store, not pending, theme cart.clear visible (header link in the cart view; Button in the non-cart view; one more in the cart body when forceHideBusiness)' },
  { name: 'add-more-products', css: 'button, a, [role=button]', text: 'Add more products', when: 'BusinessItemAccordion L346: cart view (showUpsellingInBusinessInfo), not gift card, not pending, store open' },
  { name: 'checkout', css: "[data-doc-control='cart-checkout']", when: 'BusinessItemAccordion L359: store open, not checkout, and (sticky footer: has products)' },
  { name: 'checkout-action', css: "[class*='CheckoutAction'] button", when: 'Cart L955: CheckoutAction renders with onClickCheckout or isForceOpenCart, not isCheckout, valid cart, not forceHideCheckoutButton (the cart-view panel uses the accordion footer button instead)' },
  { name: 'change-store', css: 'button, a, [role=button], .change-store', text: 'Change store', when: 'BusinessItemAccordion L255: config cart_change_business_validation = 1, handleChangeStore (not kiosk), no reservation, not gift card, not pending, and not the cart view' },
  { name: 'accordion-toggle', css: 'button.accordion-toggle', when: 'BusinessItemAccordion L304: store open with products and not isSoloCart (cart view with a single forced-open cart has no toggle: only with several carts)' },
  { name: 'taxes-fees-toggle', css: "[data-doc-control='cart-taxes-fees-toggle'] button", when: 'Cart L509: the cart panel (cart view) shows only the Subtotal; the taxes line renders in checkout or the non-cart view, when the cart has product taxes or fees and theme cart.taxes_detail is visible. Not reachable by opening the cart only' },
  { name: 'product-edit', css: "[data-doc-control='cart-product-edit'], [data-doc-section='cart-product-row'] button[aria-label='Edit']", when: 'ProductItemAccordion: cart line, not pending, editing enabled (isDisabledEdit false)' },
  { name: 'product-delete', css: "[data-doc-control='cart-product-delete'], [data-doc-section='cart-product-row'] button[aria-label='Delete'], [data-doc-section='cart-product-row'] button[aria-label='Remove']", when: 'ProductItemAccordion: cart line, not pending, onDeleteProduct (the stepper trash at quantity 1)' },
  { name: 'upselling-add', css: "button[aria-label='Add']", when: 'UpsellingPage in the cart: the upselling read returned products (here simulated: 3)' },
  { name: 'upselling-previous', css: "button[aria-label='Previous']", when: 'UpsellingPage carousel with more products than fit' },
  { name: 'upselling-next', css: "button[aria-label='Next']", when: 'UpsellingPage carousel with more products than fit' },
  { name: 'upselling-close', css: "button[aria-label='Close']", near: 'Complement your order', when: 'UpsellingPage L147: the non-popover layout (not fromCartPopover) with its "Complement your order" header' },
  { name: 'upselling-no-thanks', css: 'button, a, [role=button]', text: 'No, Thanks', when: 'UpsellingPage L210: the upselling modal opened (openUpselling / non-custom mode), not shown inline in the cart' }
]

// --- the simulated cart ---------------------------------------------------
async function fetchBusiness () {
  try {
    const res = await fetch(`${API}/business/${STORE}?version=v2&type=2&params=id,name,slug,logo,timezone,tax_type,delivery_time,pickup_time`)
    const json = await res.json()
    if (json?.result?.id) return { ...json.result, open: true }
  } catch { /* falls back below */ }
  return { id: 1, name: 'Cha Sha', slug: STORE, timezone: 'America/New_York', tax_type: 1, open: true }
}

const product = (business, n) => ({
  id: 9000 + n,
  code: `fixture-line-${n}`,
  business_id: business.id,
  category_id: 1,
  name: `Fixture product ${n}`,
  price: 10,
  total: 10,
  quantity: 1,
  balance: 1,
  stock: 20,
  inventoried: false,
  images: null,
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {},
  options: {}
})
const cartOf = (business, uuid, count) => ({
  uuid,
  business_id: business.id,
  user_id: USER.id,
  status: 0,
  type: 2,
  valid: true,
  valid_products: true,
  valid_schedule: true,
  valid_address: true,
  valid_minimum: true,
  valid_maximum: true,
  minimum: 0,
  maximum: 1000,
  subtotal: 10 * count,
  subtotal_with_discount: 10 * count,
  discount: 0,
  discount_type: 1,
  discount_rate: 0,
  delivery_price_with_discount: 0,
  driver_tip: 0,
  tax: 1,
  taxes: [{ id: 7, name: 'VAT', type: 2, target: 'product', rate: 10, summary: { tax: 1 } }],
  fees: [],
  offers: [],
  metafields: [],
  total: 10 * count + 1,
  balance: 10 * count + 1,
  products: Array.from({ length: count }, (_, i) => product(business, i + 1)),
  business
})
const casesCarts = (business) => {
  const other = { ...business, id: business.id + 1000, name: 'Fixture Store', slug: 'fixture-store', logo: null }
  return {
    one: [cartOf(business, 'fixture-cart', 1)],
    two: [cartOf(business, 'fixture-cart', 2)],
    empty: [],
    multi: [cartOf(business, 'fixture-cart', 1), cartOf(other, 'fixture-cart-2', 1)]
  }
}

// every request of the context goes through here (see the header)
async function installRoutes (ctx, carts, writes) {
  await ctx.route('**/*', async (route) => {
    const request = route.request()
    const method = request.method()
    const { pathname, hostname } = new URL(request.url())
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      writes.intercepted.push(`${method} ${hostname}${pathname}`)
      // the cart's own writes answer with the simulated cart; anything else is aborted
      if (method === 'POST' && /\/carts\/(add_product|update_product|remove_product|multi_product)$/.test(pathname)) return route.fulfill({ json: { error: false, result: carts[0] } })
      if (method === 'POST' && /\/carts\/clear$/.test(pathname)) return route.fulfill({ json: { error: false, result: { ...carts[0], products: [], subtotal: 0, total: 0, balance: 0 } } })
      return route.abort()
    }
    if (method !== 'GET' || !hostname.endsWith('ordering.co')) return route.continue()
    if (/\/order_options$/.test(pathname)) return route.fulfill({ json: { error: false, result: { user_id: USER.id, type: 2, carts } } })
    if (new RegExp(`/users/${USER.id}$`).test(pathname)) return route.fulfill({ json: { error: false, result: USER } })
    if (new RegExp(`/users/${USER.id}/`).test(pathname) || /\/paymethods$/.test(pathname)) return route.fulfill({ json: { error: false, result: [] } })
    if (/\/carts\/[^/]+\/upselling$/.test(pathname)) {
      return route.fulfill({ json: { error: false, result: [1, 2, 3].map((i) => ({ id: 7000 + i, name: `Fixture upsell ${i}`, price: 3, images: null, upselling: true, inventoried: false })) } })
    }
    if (pathname.endsWith(`/business/${STORE}`) && request.url().includes('ignore_menu_schedule')) {
      const response = await route.fetch()
      const json = await response.json()
      if (json?.result) json.result.open = true
      return route.fulfill({ response, json })
    }
    return route.continue()
  })
}

// --- one run: theme x width x case -----------------------------------------
async function run (browser, business, theme, width, caseName) {
  const carts = casesCarts(business)[caseName]
  const writes = { intercepted: [], continued: 0, seenByPage: 0 }
  const consoleErrors = []
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 800 }, serviceWorkers: 'block' })
  await ctx.addInitScript(([token, user]) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, [TOKEN, USER])
  await installRoutes(ctx, carts, writes)
  const page = await ctx.newPage()
  page.on('request', (r) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.seenByPage++ })
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${m.text().slice(0, 160)} @ ${m.location().url.slice(0, 80)}`) })
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 160)}`))
  const result = { theme, width, case: caseName, cartOpened: false, counts: {}, controls: {}, notPresent: [], layout: {} }
  try {
    await page.goto(`${BASE}/store/${STORE}?ds_theme=${theme}`, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: '[data-ds-review]{display:none !important}' })
    await page.locator("[data-doc-control='cart-open']").first().waitFor({ timeout: 20000 })
    const loaded = consoleErrors.length // errors after this point are "after load"
    await page.locator("[data-doc-control='cart-open']").first().click()
    result.cartOpened = await page.locator("[data-doc-section='cart-content']").first().waitFor({ timeout: 8000 }).then(() => true, () => false)
    await sleep(1500) // slide-in, upselling read, images
    if (result.cartOpened) await measureCart(page, result)
    result.consoleErrorsAfterLoad = consoleErrors.slice(loaded)
    result.consoleErrorsBeforeCart = consoleErrors.slice(0, loaded)
    if (SHOT_DIR && theme === 'grill' && caseName === 'one') {
      mkdirSync(SHOT_DIR, { recursive: true })
      await page.screenshot({ path: join(SHOT_DIR, `cart-buttons-${width}.png`) })
    }
  } catch (err) {
    result.error = String(err.message).split('\n')[0]
  }
  result.writes = { intercepted: writes.intercepted.length, continuedToNetwork: writes.continued, seenByPage: writes.seenByPage, list: writes.intercepted }
  await ctx.close()
  return result
}

// tags the controls (data-probe) and returns what is there
const tagControls = (page) => page.evaluate(([defs]) => {
  const root = document.querySelector("[data-doc-section='cart-content']")
  const seen = new Set()
  const counts = {}
  const short = (el) => (el.textContent || '').length < 300
  for (const def of defs) {
    const found = [...root.querySelectorAll(def.css)].filter((el) => {
      if (seen.has(el)) return false
      if (def.text && (el.textContent || '').trim() !== def.text) return false
      if (def.near) {
        const a = el.parentElement
        const b = a?.parentElement
        if (![a, b].some((x) => x && short(x) && x.textContent.includes(def.near))) return false
      }
      return true
    })
    found.forEach((el, i) => { seen.add(el); el.setAttribute('data-probe', `${def.name}#${i}`) })
    counts[def.name] = found.length
  }
  return counts
}, [CONTROLS])

const measure = (page, probe) => page.evaluate(([probe, props]) => {
  const el = document.querySelector(`[data-probe="${probe}"]`)
  if (!el) return null
  const cs = getComputedStyle(el)
  const style = {}
  for (const p of props) style[p] = cs.getPropertyValue(p)
  // the `border` shorthand is empty when the sides differ: keep the sides then
  if (!style.border) style.border = ['top', 'right', 'bottom', 'left'].map((s) => cs.getPropertyValue(`border-${s}`)).join(' / ')
  const r = el.getBoundingClientRect()
  const round = (n) => Math.round(n * 100) / 100
  const svg = el.querySelector('svg')
  const sc = svg && getComputedStyle(svg)
  const sr = svg?.getBoundingClientRect()
  const attrs = {}
  for (const a of el.attributes) {
    if (/^(aria-|disabled$|type$|role$|data-doc-control$|data-slot$)/.test(a.name)) attrs[a.name] = a.value
  }
  return {
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || '').trim().slice(0, 40),
    style,
    rect: { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) },
    svg: svg ? { width: round(sr.width), height: round(sr.height), color: sc.color, stroke: sc.stroke, fill: sc.fill } : null,
    attrs
  }
}, [probe, PROPS])

async function measureCart (page, result) {
  result.counts = await tagControls(page)
  for (const def of CONTROLS) {
    if (!result.counts[def.name]) result.notPresent.push({ control: def.name, condition: def.when })
    for (let i = 0; i < result.counts[def.name]; i++) {
      const probe = `${def.name}#${i}`
      const loc = page.locator(`[data-probe="${probe}"]`)
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      await page.mouse.move(0, 0)
      await sleep(350)
      const rest = await measure(page, probe)
      // the element at the centre of the control is the control (or its child)
      const hit = await page.evaluate((probe) => {
        const el = document.querySelector(`[data-probe="${probe}"]`)
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return { ownButton: !!top && el.contains(top), hitTag: top?.tagName.toLowerCase() ?? null, hitControl: top?.closest('[data-probe]')?.getAttribute('data-probe') ?? null }
      }, probe)
      let hover
      try {
        await loc.hover({ timeout: 3000 })
        await sleep(400)
        hover = (await measure(page, probe))?.style
      } catch (err) {
        hover = { error: String(err.message).split('\n')[0] }
      }
      await page.mouse.move(0, 0)
      result.controls[probe] = { ...rest, hit, hover }
    }
  }
  result.layout = await page.evaluate(() => {
    const root = document.querySelector("[data-doc-section='cart-content']")
    let scroller = root
    while (scroller && scroller !== document.body && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowX + getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      horizontalScrollDocument: document.documentElement.scrollWidth > window.innerWidth + 1,
      cartContainerScrollWidth: scroller?.scrollWidth ?? null,
      cartContainerClientWidth: scroller?.clientWidth ?? null,
      horizontalScrollCart: scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : null
    }
  })
}

// --- compare ----------------------------------------------------------------
const flatten = (runs) => {
  const flat = {}
  for (const r of runs) {
    const base = `${r.theme}|${r.width}|${r.case}`
    flat[`${base}|cartOpened`] = r.cartOpened
    flat[`${base}|error`] = r.error ?? null
    flat[`${base}|consoleErrorsAfterLoad`] = (r.consoleErrorsAfterLoad || []).length
    Object.entries(r.counts).forEach(([name, n]) => { flat[`${base}|count ${name}`] = n })
    Object.entries(r.layout).forEach(([k, v]) => { flat[`${base}|layout ${k}`] = v })
    for (const [probe, c] of Object.entries(r.controls)) {
      const key = `${base}|${probe}`
      flat[`${key}|tag`] = c.tag
      flat[`${key}|text`] = c.text
      Object.entries(c.style).forEach(([p, v]) => { flat[`${key}|${p}`] = v })
      Object.entries(c.rect).forEach(([p, v]) => { flat[`${key}|rect.${p}`] = v })
      Object.entries(c.svg || { none: true }).forEach(([p, v]) => { flat[`${key}|svg.${p}`] = v })
      Object.entries(c.attrs).forEach(([p, v]) => { flat[`${key}|attr ${p}`] = v })
      Object.entries(c.hit).forEach(([p, v]) => { flat[`${key}|hit.${p}`] = v })
      Object.entries(c.hover || {}).forEach(([p, v]) => { flat[`${key}|hover ${p}`] = v })
    }
  }
  return flat
}

const compare = (before, after) => {
  // only the runs both files have (a subset run, e.g. THEMES=grill, compares what it ran)
  const ran = new Set(after.runs.map((r) => `${r.theme}|${r.width}|${r.case}|`))
  const a = Object.fromEntries(Object.entries(flatten(before.runs)).filter(([key]) => [...ran].some((p) => key.startsWith(p))))
  const b = flatten(after.runs)
  const rows = []
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) rows.push({ key, before: a[key] ?? '(absent)', after: b[key] ?? '(absent)' })
  }
  console.log(`\nCOMPARE: ${rows.length} differing values (of ${Object.keys(b).length})`)
  if (rows.length) console.table(rows.map((r) => ({ 'theme|width|case|control|property': r.key, before: String(r.before).slice(0, 70), after: String(r.after).slice(0, 70) })))
  return rows.length
}

// Before the runs: a POST to the cart's clear is fulfilled and a POST to anything
// else is aborted, both without reaching the network (the runs click nothing, so
// this is what shows the interception works). The API of a fake session would
// answer 401 anyway.
async function selfTest (browser, business) {
  const writes = { intercepted: [], continued: 0, seenByPage: 0 }
  const ctx = await browser.newContext({ serviceWorkers: 'block' })
  await installRoutes(ctx, casesCarts(business).one, writes)
  const page = await ctx.newPage()
  page.on('request', (r) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.seenByPage++ })
  await page.goto(`${BASE}/robots.txt`)
  const send = (method, path) => page.evaluate(([url, method]) => fetch(url, { method, body: '{}' }).then((r) => r.status, () => 'aborted'), [`${API}${path}`, method])
  const answers = [await send('POST', '/carts/clear'), await send('PUT', '/carts/selftest-never-sent'), await send('DELETE', '/carts/selftest-never-sent'), await send('PATCH', '/carts/selftest-never-sent')]
  await ctx.close()
  const ok = answers.join() === '200,aborted,aborted,aborted' && writes.intercepted.length === 4 && writes.seenByPage === 4 && !writes.continued
  console.log(`SELFTEST writes (POST clear -> fulfilled, PUT/DELETE/PATCH -> aborted): answers=${answers.join('/')} intercepted=${writes.intercepted.length} seen=${writes.seenByPage} continued=${writes.continued} -> ${ok ? 'OK' : 'FAIL'}`)
  return ok
}

// --- main -------------------------------------------------------------------
const business = await fetchBusiness()
const browser = await chromium.launch()
if (!(await selfTest(browser, business))) { await browser.close(); process.exit(1) }
const runs = []
for (const theme of THEMES) {
  for (const width of WIDTHS) {
    for (const caseName of CASES) {
      const r = await run(browser, business, theme, width, caseName)
      runs.push(r)
      const present = Object.entries(r.counts).filter(([, n]) => n).map(([name, n]) => `${name}=${n}`).join(' ')
      console.log(`${theme} ${width} ${caseName}: opened=${r.cartOpened}${r.error ? ` ERROR ${r.error}` : ''} | ${present || 'no controls'} | writes intercepted=${r.writes.intercepted} continued=${r.writes.continuedToNetwork} seen=${r.writes.seenByPage} | console errors after load=${(r.consoleErrorsAfterLoad || []).length}`)
    }
  }
}
await browser.close()

const totals = runs.reduce((t, r) => ({ intercepted: t.intercepted + r.writes.intercepted, continued: t.continued + r.writes.continuedToNetwork, seen: t.seen + r.writes.seenByPage }), { intercepted: 0, continued: 0, seen: 0 })
console.log(`\nWRITES: ${totals.intercepted} intercepted (${totals.seen} seen by the page), ${totals.continued} reached the network`)
const errors = runs.flatMap((r) => (r.consoleErrorsAfterLoad || []).map((e) => `${r.theme} ${r.width} ${r.case}: ${e}`))
console.log(`CONSOLE ERRORS after load: ${errors.length}`)
;[...new Set(errors)].slice(0, 20).forEach((e) => console.log(`  ${e}`))
const conditions = Object.fromEntries(CONTROLS.map((c) => [c.name, c.when]))
const out = { meta: { base: BASE, at: new Date().toISOString(), themes: THEMES, widths: WIDTHS, cases: CASES, props: PROPS, store: STORE }, conditions, totals, runs }
if (OUT) {
  writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`saved ${OUT}`)
}
let diffs = 0
if (COMPARE) diffs = compare(JSON.parse(readFileSync(COMPARE, 'utf8')), out)
process.exit(totals.continued || (COMPARE && (diffs || errors.length)) ? 1 : 0)
