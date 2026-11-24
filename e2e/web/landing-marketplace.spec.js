import { expect, test } from '../lib/fixtures.js'
import { loadFixture } from '../docs/lib/fixtures.js'
import { APP_ORIGIN } from '../docs/lib/server.cjs'
import { MOBILE_WEB_MAX_WIDTH } from '../../src/utils/themeBreakpoint.mjs'

// implementation notesthe marketing page of a Marketplace site with Full Website (`/`), N3 of ordering-website-design.
// The whole API is the `browse-businesses` fixture plus what the page asks for: business types with an image, stores
// (six featured), the order's address. `site.experience = 'full_website'` is schema 1.6.0 and not published, so the theme
// of first_load is intercepted here. Themes are the design system's own test themes (`THEME_ENVELOPES`, the ones
// `?ds_theme=` serves), read once from the dev server. Every write is intercepted and listed: none may leave the page.
const FIXTURE = 'browse-businesses'
const THEMES = ['defaults', 'grill', 'cafe']
const BUSINESSES = /\/docsmarket\/businesses(\?|$)/
const SYNTHETIC_IMAGE = '/e2e/docs/assets/synthetic-business-header.svg'

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const deepMerge = (base, extra) => {
  if (!isObject(base) || !isObject(extra)) return extra
  const out = { ...base }
  for (const [key, value] of Object.entries(extra)) out[key] = key in base ? deepMerge(base[key], value) : value
  return out
}

let envelopes
test.beforeAll(async ({ browser }) => {
  // the dev server serves the module; its page is never the app, so no request leaves for a real API
  const page = await browser.newPage()
  await page.route((url) => url.origin !== APP_ORIGIN, (route) => route.abort())
  const themesModule = '/src/ui/src/design-system/preview/themes.js'
  await page.goto(`${APP_ORIGIN}${themesModule}`)
  // a native import in the page (the path is a variable so the linter does not read it as a project import)
  envelopes = await page.evaluate(async (path) => (await import(path)).THEME_ENVELOPES, themesModule)
  await page.close()
})

const store = (id, name, extra = {}) => ({
  id,
  name,
  description: `${name} synthetic cooking`,
  header: SYNTHETIC_IMAGE,
  logo: SYNTHETIC_IMAGE,
  types: [{ id: 1, name: 'Restaurant' }],
  location: { lat: 30.2673, lng: -97.7432 },
  address: `${name} address`,
  ribbon: { enabled: false },
  timezone: 'America/Chicago',
  schedule: Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }] })),
  today: { enabled: true, lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }] },
  open: true,
  delivery_price: 2.5,
  distance: 1.2,
  delivery_time: '00:25',
  pickup_time: '00:15',
  reviews: { total: 4.6 },
  featured: true,
  offers: [],
  slug: name.toLowerCase().replaceAll(' ', '-'),
  configs: {},
  enabled: true,
  disabled_reason: null,
  available_drivers_count: 3,
  activated_orders: 1,
  ...extra
})
const STORES = [
  store(8201, 'Synthetic Kitchen'), store(8202, 'Fixture Bakery'), store(8203, 'Sample Noodle Bar'),
  store(8204, 'Docs Taqueria'), store(8205, 'Test Pizzeria'), store(8206, 'Mock Juice Lab', { featured: false })
]
const TYPES = [[1, 'Restaurant'], [2, 'Bakery'], [3, 'Grocery'], [4, 'Dessert'], [5, 'Coffee']].map(([id, name]) => ({
  id, name, description: name, image: SYNTHETIC_IMAGE, enabled: true, businesses_count: 3
}))
const pageOf = (result) => ({ error: false, result, pagination: { current_page: 1, total_pages: 1, total: result.length, page_size: 25 } })

// Opens `/` as a Marketplace site with Full Website, painted by one of the design system's themes.
const openLanding = async (app, page, { theme = 'defaults', experience = 'full_website', stores = STORES, types = TYPES, authenticated = false, route = '/', storesTransport } = {}) => {
  const requests = []
  const writes = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin === APP_ORIGIN) return
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(`${request.method()} ${url.pathname}`)
    requests.push({ method: request.method(), url: url.pathname + url.search })
  })
  await app.open(FIXTURE, route, {
    authenticated,
    mutate: async (fixture) => {
      // the order's address and the sign-in routes of a customer, from the fixture that already has them
      const donor = await loadFixture('choose-location-order-type')
      const own = (route) => ({ ...route, assert: undefined })
      fixture.routes.unshift(
        ...donor.routes.filter(({ pattern }) => /order_options|searchbox|users|addresses/.test(pattern)).map(own),
        { method: 'GET', pattern: '^/v400/en/docsmarket/businesses(?:\\?.*)?$', ...storesTransport?.(stores) ?? { response: pageOf(stores) } },
        { method: 'GET', pattern: '^/v400/en/docsmarket/business_types(?:\\?.*)?$', response: pageOf(types) }
      )
      if (authenticated) {
        // the customer of `addresses`, with the id the donor's user routes answer for
        const { authSession } = await loadFixture('addresses')
        authSession.user.id = 9101
        fixture.authSession = authSession
      }
      const values = deepMerge(envelopes[theme].values, { site: { mode: 'marketplace', experience } })
      fixture.firstLoad.theme = { version: 2, values }
      fixture.themeValues = values
    }
  })
  return { requests, writes }
}

// ── helpers of the page ────────────────────────────────────────────────────────────────────────────────────────────
const SECTIONS = ['categories', 'popular_stores', 'how_it_works', 'partner']
const banner = (page) => page.getByRole('banner')
const landingReady = async (page) => {
  await expect(page.locator('main h1')).toHaveCount(1)
  await expect(page.locator('#landing-how_it_works')).toBeVisible()
}
// a color token (any CSS color expression, e.g. var(--ot-color-primary)) as the browser computes it
const colorOf = (page, expression) => page.evaluate((value) => {
  const probe = document.createElement('div')
  probe.style.color = value
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}, expression)
// first family of a font stack, without quotes: `'Playfair Display',sans-serif` and `"Playfair Display", sans-serif` are one
const family = (stack) => stack.split(',')[0].replaceAll(/["']/g, '').trim()
const rgb = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = (color) => {
  const [r, g, b] = rgb(color).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const styleOf = (page, locator, props) => locator.evaluate((el, list) => Object.fromEntries(list.map((name) => [name, getComputedStyle(el)[name]])), props)
const shot = async (page, name) => {
  if (process.env.LANDING_SHOTS_DIR) await page.screenshot({ path: `${process.env.LANDING_SHOTS_DIR}/${name}-${page.viewportSize().width}.png`, fullPage: true })
}

const measured = {}

// ── the matrix: 3 themes at the project's width ───────────────────────────────────────────────────────────────────
for (const theme of THEMES) {
  test(`marketplace landing, ${theme}: theme, structure, links and requests`, async ({ app, page }) => {
    const { requests, writes } = await openLanding(app, page, { theme })
    await landingReady(page)
    await app.settle()
    const width = page.viewportSize().width
    const at = `[${theme} @ ${width}px]`

    // structure: one h1; each section its h2 (the hero's title is the page's h1); every img has an alt attribute
    await expect(page.locator('main h1')).toHaveCount(1)
    // the whole page: the app's own header is not painted on a full website's `/` (another issue hides it); while it is, its h1 is listed, not judged
    const h1s = await page.locator('h1:visible').evaluateAll((list) => list.map((h) => `${h.closest('main') ? 'main' : h.closest('[data-app-header]') ? 'app header' : 'other'}: ${h.textContent.trim().slice(0, 40)}`))
    if (await page.locator('[data-app-header]').count() === 0) expect(h1s, `${at} h1 of the page`).toHaveLength(1)
    else test.info().annotations.push({ type: 'app-header-painted', description: `h1: ${h1s.join(' | ')}` })
    for (const key of SECTIONS) {
      await expect(page.locator(`#landing-${key} h2`), `${at} ${key} has one h2`).toHaveCount(1)
      await expect(page.locator(`#landing-${key}`), `${at} ${key} is named by its h2`).toHaveAttribute('aria-labelledby', `landing-${key}-title`)
    }
    const imgs = await page.locator('img').evaluateAll((list) => list.map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') })))
    expect(imgs.filter(({ alt }) => alt === null), `${at} images without an alt attribute`).toEqual([])
    expect(imgs.length, `${at} the page has images`).toBeGreaterThan(0)

    // computed CSS against the theme's own --ot-* variables
    const root = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)
    const expected = {
      background: await colorOf(page, 'var(--ot-color-background)'),
      text: await colorOf(page, 'var(--ot-color-text)'),
      primary: await colorOf(page, 'var(--ot-color-primary)'),
      onPrimary: await colorOf(page, 'var(--ot-color-on-primary)'),
      heading: family(await root('--ot-font-heading')),
      body: family(await root('--ot-font-body'))
    }
    expect(expected.heading, `${at} the theme names a heading font`).not.toBe('')
    const band = page.locator('#landing-how_it_works')
    const bandStyle = await styleOf(page, band, ['backgroundColor', 'color'])
    const bodyStyle = await styleOf(page, page.locator('body'), ['backgroundColor', 'color'])
    // the band paints nothing of its own (the page's background shows) and its text is the theme's text
    expect.soft(bodyStyle.backgroundColor, `${at} page background`).toBe(expected.background)
    expect.soft(['rgba(0, 0, 0, 0)', expected.background], `${at} section background`).toContain(bandStyle.backgroundColor)
    expect.soft(bandStyle.color, `${at} section text`).toBe(expected.text)
    for (const level of ['h1', 'main h2']) {
      const style = await styleOf(page, page.locator(level).first(), ['fontFamily', 'color'])
      expect.soft(family(style.fontFamily), `${at} ${level} font`).toBe(expected.heading)
      expect.soft(style.color, `${at} ${level} color`).toBe(expected.text)
    }
    const orderNow = banner(page).getByRole('link', { name: 'Order now' })
    const search = page.getByRole('button', { name: 'Search', exact: true })
    const partner = page.getByRole('link', { name: 'Partner with us' })
    for (const [name, control] of [['Order now', orderNow], ['Search', search]]) {
      const style = await styleOf(page, control, ['backgroundColor', 'color', 'fontFamily'])
      expect.soft(style.backgroundColor, `${at} ${name} background`).toBe(expected.primary)
      expect.soft(style.color, `${at} ${name} text`).toBe(expected.onPrimary)
      expect.soft(family(style.fontFamily), `${at} ${name} font`).toBe(expected.body)
    }
    // Partner with us is the primary button too (filled), on its own surface: the theme's surface_alt (not the page's
    // background), its text legible on it
    const cta = await styleOf(page, partner, ['backgroundColor', 'color'])
    expect.soft(cta.backgroundColor, `${at} Partner with us background`).toBe(expected.primary)
    expect.soft(cta.color, `${at} Partner with us text`).toBe(expected.onPrimary)
    const offer = page.locator('#landing-partner h2').locator('xpath=ancestor::div[2]')
    const offerStyle = await styleOf(page, offer, ['backgroundColor', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft'])
    const surface = await colorOf(page, 'var(--ot-color-surface-alt)')
    expect.soft(offerStyle.backgroundColor, `${at} the offer paints the theme's surface_alt`).toBe(surface)
    expect.soft(offerStyle.backgroundColor, `${at} the offer's surface is not the page's background`).not.toBe(expected.background)
    expect.soft(offerStyle.borderTopLeftRadius, `${at} the offer has the theme's radius`).toBe(await page.evaluate(() => { const probe = document.createElement('div'); probe.style.borderRadius = 'var(--ot-radius-lg)'; document.body.append(probe); const radius = getComputedStyle(probe).borderTopLeftRadius; probe.remove(); return radius }))
    expect.soft(parseFloat(offerStyle.paddingTop), `${at} the offer has padding`).toBeGreaterThan(0)
    const titleStyle = await styleOf(page, page.locator('#landing-partner h2'), ['color'])
    const textStyle = await styleOf(page, page.locator('#landing-partner p'), ['color'])
    expect.soft(contrast(titleStyle.color, offerStyle.backgroundColor), `${at} the offer's title on its surface`).toBeGreaterThanOrEqual(4.5)
    expect.soft(contrast(textStyle.color, offerStyle.backgroundColor), `${at} the offer's text on its surface`).toBeGreaterThanOrEqual(4.5)
    expect.soft(contrast(cta.color, cta.backgroundColor), `${at} Partner with us text on its fill`).toBeGreaterThanOrEqual(4.5)
    measured[`${width}`] = { ...measured[width], [theme]: { background: expected.background, text: expected.text, primary: expected.primary, heading: expected.heading, surface } }

    // real links
    await expect(page.locator('#landing-popular_stores').getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/order')
    await expect(orderNow).toHaveAttribute('href', '/order')
    await expect(partner).toHaveAttribute('href', '/signup_business')
    // the stores are asked near a point and with the fields a card needs
    const asked = requests.filter(({ method, url }) => method === 'GET' && BUSINESSES.test(url))
    expect(asked.length, `${at} the stores were asked for`).toBeGreaterThan(0)
    const query = new URL(asked[0].url, APP_ORIGIN).searchParams
    expect(JSON.parse(query.get('location')), `${at} GET business location`).toEqual({ lat: 30.2672, lng: -97.7431 })
    expect(query.get('params').split(','), `${at} GET business params`).toEqual(expect.arrayContaining(['id', 'name', 'slug', 'featured', 'delivery_time', 'reviews']))
    expect(JSON.parse(query.get('where')).conditions, `${at} GET business asks for the featured stores`).toEqual([{ attribute: 'featured', value: true }])
    // four featured stores at least, as cards with their link
    expect(await page.locator('#landing-popular_stores h3 a').count(), `${at} store cards`).toBeGreaterThanOrEqual(4)

    // the cards are a grid of the column's width: columns of at least the theme's card width (media 5xl, 300px), each card filling its cell
    const grid = await page.locator('#landing-popular_stores h3').first().evaluate((h3) => {
      const cards = [...h3.closest('#landing-popular_stores').querySelectorAll('h3')].map((h) => h.closest('[class*=ContainerCard]') ?? h.parentElement)
      const rect = (el) => el.getBoundingClientRect()
      const column = rect(cards[0].parentElement)
      return { columns: new Set(cards.map((c) => Math.round(rect(c).left))).size, widths: cards.map((c) => Math.round(rect(c).width)), column: Math.round(column.width), inFirstRow: cards.filter((c) => rect(c).top === rect(cards[0]).top).length }
    })
    const minColumns = Math.max(1, Math.floor(grid.column / 316))
    expect(grid.columns, `${at} columns of store cards (${JSON.stringify(grid)})`).toBe(Math.min(minColumns, STORES.length))
    expect(Math.min(...grid.widths), `${at} each card fills its cell (${JSON.stringify(grid)})`).toBeGreaterThanOrEqual(grid.column / grid.columns - 24)

    await app.check(`landing ${theme}`)
    // the page itself writes nothing
    expect(writes, `${at} writes sent by the landing`).toEqual([])
    await shot(page, `landing-${theme}`)
  })
}

test('the three themes paint the page differently', async ({ page }) => {
  const rows = measured[page.viewportSize().width] ?? {}
  // skipped only when the matrix was filtered out of the run; a partial matrix is a failure
  test.skip(Object.keys(rows).length === 0, 'needs the matrix tests of the same run')
  expect(Object.keys(rows).sort(), 'every theme of the matrix was measured').toEqual([...THEMES].sort())
  for (const key of ['background', 'text', 'primary', 'heading', 'surface']) {
    expect(new Set(THEMES.map((theme) => rows[theme][key])).size, `${key} differs between themes: ${JSON.stringify(THEMES.map((theme) => rows[theme][key]))}`).toBeGreaterThanOrEqual(2)
  }
})

// ── keyboard ───────────────────────────────────────────────────────────────────────────────────────────────────────
// What is focused, how it is named, whether it shows a focus indicator (an outline or a ring) and where it sits.
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const style = getComputedStyle(el)
  // a stretched card link draws its ring on its ::after (the whole card)
  const drawn = (s) => (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'
  const ring = drawn(style) || drawn(getComputedStyle(el, '::after'))
  return {
    name: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('alt') || '').trim().replaceAll(/\s+/g, ' ').slice(0, 40),
    tag: el.tagName.toLowerCase(),
    focusVisible: el.matches(':focus-visible'),
    ring,
    zone: el.closest('[data-app-header]') ? 'app header' : el.closest('[role=banner], header') ? 'banner' : el.closest('main') ? 'main' : 'other'
  }
})

for (const theme of THEMES) {
  test(`marketplace landing, ${theme}: Tab walks the header, the hero, the categories, the stores and the partner link with a visible focus`, async ({ app, page }) => {
    await openLanding(app, page, { theme })
    await landingReady(page)
    await app.settle()
    const at = `[${theme} @ ${page.viewportSize().width}px]`
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0) })
    const walked = []
    for (let step = 0; step < 90; step++) {
      await page.keyboard.press('Tab')
      const now = await focused(page)
      if (now) walked.push(now)
      if (now?.name === 'Partner with us') break
    }
    const names = walked.map(({ name }) => name)
    // in the order of the page (the section's "See all" sits in its heading, before the cards)
    const expectedOrder = ['Sign in', 'Order now', 'Search', 'Restaurant', 'Coffee', 'See all', 'Synthetic Kitchen', 'Test Pizzeria', 'Partner with us']
    if (page.viewportSize().width >= MOBILE_WEB_MAX_WIDTH) expectedOrder.unshift('How it works', 'For restaurants')
    let from = 0
    for (const name of expectedOrder) {
      const at = names.indexOf(name, from)
      expect(at, `${theme}: Tab reaches "${name}" after the previous stop. Walked: ${names.join(' > ')}`).toBeGreaterThanOrEqual(0)
      from = at + 1
    }
    const bare = walked.filter(({ zone, ring }) => zone !== 'app header' && !ring).map(({ name, tag }) => `${tag} "${name}"`)
    expect(bare, `${at} stops of the page with no outline or ring while focused with the keyboard`).toEqual([])
    expect(walked.filter(({ zone, focusVisible }) => zone !== 'app header' && !focusVisible).map(({ name }) => name), `${at} stops that do not match :focus-visible`).toEqual([])
  })
}

test('marketplace landing: Esc closes the sign-in dialog and the focus returns to "Sign in"', async ({ app, page }) => {
  await openLanding(app, page)
  await landingReady(page)
  await app.settle()
  const signIn = banner(page).getByRole('button', { name: 'Sign in' })
  await signIn.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // autocomplete: false. The sign-in form is the app's LoginForm (not this page); its email field says autocomplete="on", the same in every entry that opens it
  await app.check('landing with the sign-in dialog open', { header: false, autocomplete: false })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(signIn).toBeFocused()
})

// ── the way to the stores ──────────────────────────────────────────────────────────────────────────────────────────
test('marketplace landing: Search with an address in the order opens /search with the stores that deliver there', async ({ app, page }) => {
  // the order (and its address) is the customer's: the fixture's order_options answers with a session
  const { requests } = await openLanding(app, page, { authenticated: true })
  await landingReady(page)
  await app.settle()
  const before = requests.length
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  // the order's address is the point: the URL carries no lat/lng
  await page.waitForURL((url) => url.pathname === '/search')
  await expect(page.getByRole('dialog'), 'no address form: the order already has its address').toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Synthetic Kitchen' }).first()).toBeVisible()
  const asked = requests.slice(before).filter(({ method, url }) => method === 'GET' && BUSINESSES.test(url))
  expect(asked.length, 'the search asked for the stores').toBeGreaterThan(0)
  expect(JSON.parse(new URL(asked[0].url, APP_ORIGIN).searchParams.get('location'))).toEqual({ lat: 30.2672, lng: -97.7431 })
})

// ── states ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('marketplace landing: a section with nothing to show does not exist', async ({ app, page }) => {
  await openLanding(app, page, { types: [], stores: [] })
  await expect(page.locator('#landing-how_it_works')).toBeVisible()
  await app.settle()
  await expect(page.locator('#landing-categories')).toHaveCount(0)
  await expect(page.locator('#landing-popular_stores')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Browse by craving' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Popular near you' })).toHaveCount(0)
  await expect(page.locator('[id^=landing-] h2')).toHaveCount(2)
  // the header links only to sections that exist (its links show from the tablet width)
  if (page.viewportSize().width >= MOBILE_WEB_MAX_WIDTH) {
    await expect(banner(page).getByRole('link', { name: 'How it works' })).toBeVisible()
    await expect(banner(page).getByRole('link')).toHaveCount(3)
  }
})

test('marketplace landing: a failing request shows the error with Retry, and Retry brings the stores', async ({ app, page }) => {
  // the first answer is a 500, the next ones are the stores
  await openLanding(app, page, {
    storesTransport: (stores) => ({
      responseSequence: [{ error: true, result: ['Internal synthetic failure'] }, pageOf(stores)],
      transport: { statusSequence: [500] }
    })
  })
  const section = page.locator('#landing-popular_stores')
  await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible()
  await expect(section.getByText("We couldn't load the stores")).toBeVisible()
  await expect(section.locator('h3 a')).toHaveCount(0)
  await app.check('landing with the stores failed')
  await section.getByRole('button', { name: 'Retry' }).click()
  await expect(section.locator('h3 a')).toHaveCount(STORES.length)
  await expect(section.getByRole('button', { name: 'Retry' })).toHaveCount(0)
})

test('marketplace landing: a skeleton shows while the stores load', async ({ app, page }) => {
  await openLanding(app, page, { storesTransport: (stores) => ({ response: pageOf(stores), transport: { delayMs: 2500 } }) })
  const section = page.locator('#landing-popular_stores')
  await expect(section).toHaveAttribute('aria-busy', 'true')
  await expect(section.locator('.react-loading-skeleton').first()).toBeVisible()
  await expect(section.getByRole('heading', { level: 2 }), 'no title while loading: a section that ends up empty leaves none').toHaveCount(0)
  await app.check('landing while the stores load')
  await expect(section.locator('h3 a')).toHaveCount(STORES.length, { timeout: 10000 })
  await expect(section).not.toHaveAttribute('aria-busy', 'true')
  await expect(section.getByRole('heading', { level: 2, name: 'Popular near you' })).toBeVisible()
})

test('marketplace landing: with a session there is no "Sign in" and no partner offer', async ({ app, page }) => {
  await openLanding(app, page, { authenticated: true })
  await landingReady(page)
  await app.settle()
  await expect(page.locator('#landing-how_it_works')).toBeVisible()
  await expect(banner(page).getByRole('button', { name: 'Sign in' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in' }), 'no Sign in anywhere in the page').toHaveCount(0)
  await expect(page.locator('#landing-partner')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Partner with us' })).toHaveCount(0)
  await expect(banner(page).getByRole('link', { name: 'For restaurants' })).toHaveCount(0)
  await expect(banner(page).getByRole('link', { name: 'Order now' })).toHaveAttribute('href', '/order')
  await app.check('landing with a session')
})

// ── Online Ordering Only keeps today's home ────────────────────────────────────────────────────────────────────────
test('ordering_only: "/" is still the ordering home, with no marketing sections', async ({ app, page }) => {
  await openLanding(app, page, { experience: 'ordering_only' })
  await app.settle()
  await expect(page.locator('main h1')).toHaveCount(0)
  await expect(page.locator('[data-landing-section]')).toHaveCount(0)
  await expect(page.locator('#landing-how_it_works, #landing-partner')).toHaveCount(0)
  expect(new URL(page.url()).pathname).not.toBe('/order')
  await app.check('ordering only home')
})

// ── touch ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// From each control's painted center, how many px the control (or its pseudo-element) answers up, down, left and right.
test('marketplace landing: with a coarse pointer every control answers in 44 x 44 px', async ({ app, page }) => {
  test.skip(page.viewportSize().width > 430, 'a phone width: that is where the pointer is coarse')
  await openLanding(app, page)
  await landingReady(page)
  await app.settle()
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the pointer is coarse').toBe(true)
  const controls = page.locator('[role=banner] :is(a[href], button), main :is(a[href], button)')
  const count = await controls.count()
  const small = []
  let measured = 0
  for (let index = 0; index < count; index++) {
    const control = controls.nth(index)
    if (!(await control.isVisible())) continue
    const found = await control.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'center' })
      const box = el.getBoundingClientRect()
      const cx = box.left + box.width / 2
      const cy = box.top + box.height / 2
      const mine = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && el.contains(hit) }
      const run = (dx, dy) => { let n = 0; while (n < 60 && mine(cx + dx * (n + 0.5), cy + dy * (n + 0.5))) n += 1; return n }
      return { name: (el.getAttribute('aria-label') || el.innerText || '').trim().replaceAll(/\s+/g, ' ').slice(0, 30), width: run(-1, 0) + run(1, 0), height: run(0, -1) + run(0, 1) }
    })
    measured += 1
    if (found.width < 43 || found.height < 43) small.push(`"${found.name}" ${found.width}x${found.height}`)
  }
  expect(measured, 'controls measured').toBeGreaterThanOrEqual(15)
  expect(small, 'controls that answer in less than 44 x 44 px').toEqual([])
})

// ── the header, the hero and the partner offer on the page's column ───────────────────────────────────────────────
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } })

for (const theme of THEMES) {
  test(`marketplace landing, ${theme}: the header sits on the sections' column, the offer is its own surface, the hero has one sign-in`, async ({ app, page }) => {
    await openLanding(app, page, { theme })
    await landingReady(page)
    await app.settle()
    const width = page.viewportSize().width
    const at = `[${theme} @ ${width}px]`

    // the logo (here the site's name) over the left edge of the titles; Order now over the right edge of the column
    const brand = await box(banner(page).locator('span[title]').first())
    const title = await box(page.locator('#landing-how_it_works h2'))
    expect(Math.abs(brand.left - title.left), `${at} the header's logo and the h2 start at ${brand.left} and ${title.left}`).toBeLessThanOrEqual(1)
    const offer = page.locator('#landing-partner h2').locator('xpath=ancestor::div[2]')
    const column = await box(offer)
    const orderNow = await box(banner(page).getByRole('link', { name: 'Order now' }))
    expect(Math.abs(orderNow.right - column.right), `${at} Order now ends at ${orderNow.right}, the column at ${column.right}`).toBeLessThanOrEqual(1)
    if (width >= MOBILE_WEB_MAX_WIDTH) {
      expect(column.width, `${at} the column is narrower than the screen`).toBeLessThan(width - 100)
      expect(brand.left, `${at} the logo is inset from the screen edge`).toBeGreaterThan(100)
    } else {
      expect(brand.left, `${at} the same gutter as the sections`).toBeCloseTo(title.left, 0)
    }

    // the offer: title and text on the left and the action on the right from the desktop, stacked on a phone
    const offerTitle = await box(page.locator('#landing-partner h2'))
    const offerText = await box(page.locator('#landing-partner p'))
    const cta = await box(page.getByRole('link', { name: 'Partner with us' }))
    if (width >= MOBILE_WEB_MAX_WIDTH) {
      expect(cta.left, `${at} the action is to the right of the text`).toBeGreaterThan(offerText.right)
      expect(Math.abs((cta.top + cta.bottom) / 2 - (offerTitle.top + offerText.bottom) / 2), `${at} the action is centred on the text`).toBeLessThanOrEqual(2)
      expect(column.right - cta.right, `${at} the action keeps the offer's padding at its right`).toBeGreaterThan(8)
    } else {
      expect(cta.top, `${at} the action is under the text`).toBeGreaterThanOrEqual(offerText.bottom)
      expect(Math.abs(cta.left - offerTitle.left), `${at} the action starts where the text does`).toBeLessThanOrEqual(1)
    }

    // the hero: no second sign-in block (the header's Sign in is the only one), and no space reserved for it
    const hero = page.locator('[data-doc-section=website-home-hero]')
    await expect(hero.getByText('Use your account')).toHaveCount(0)
    await expect(hero.getByRole('button', { name: /^(login|Sign up)$/i })).toHaveCount(0)
    await expect(banner(page).getByRole('button', { name: 'Sign in' })).toHaveCount(1)
    expect((await styleOf(page, hero, ['marginBottom'])).marginBottom, `${at} the hero reserves no space for the login block`).toBe('0px')
    await app.check(`landing ${theme} header and offer`)
    await shot(page, `landing-${theme}`)
  })
}
