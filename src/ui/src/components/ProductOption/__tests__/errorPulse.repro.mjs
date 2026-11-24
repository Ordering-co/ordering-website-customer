// implementation notes repro: the error pulse of a required option group (Cha Sha,
// "Samosa Chaat", group "Preparation Choice") is seen whole, restarts on each
// click and respects reduced motion.
//
// Needs a dev server with DS_REVIEW=1 (writes blocked; `?ds_theme=` picks the
// theme). BASE=http://host:port (default http://localhost:3119). The store
// may be closed at the time (the product then shows "Schedule for later"
// instead of "Add to cart"), so the script answers the business request with
// `open: true`; nothing is written.
// SHOT_DIR=<dir> SHOT_TAG=<tag> saves the frozen pulse of each width (grill).
// ONLY=stack,restart runs those scenarios only (stack, landing, restart,
// reduced, regress). Exit code != 0 when an assertion fails.
//
//   BASE=http://<host>:3119 node errorPulse.repro.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3119'
const WIDTHS = [390, 1440]
const THEMES = ['defaults', 'grill']
const RING = 12 // px the pulse expands (errorPulse in ProductOption/styles.js)
const GROUP = '[data-doc-section="product-option"]'
const HEADER = `${GROUP} > div`

let failed = 0
const check = (scenario, name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} [${scenario}] ${name}${detail ? ` -- ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const newContext = (browser, width, reducedMotion = 'no-preference') =>
  browser.newContext({ viewport: { width, height: width > 500 ? 900 : 800 }, reducedMotion })

async function openProduct (browser, width, theme, reducedMotion) {
  const ctx = await newContext(browser, width, reducedMotion)
  // the store can be closed (no "Add to cart"): the menu request answers open
  await ctx.route('**/business/cha_sha?*ignore_menu_schedule*', async (route) => {
    const response = await route.fetch()
    const json = await response.json()
    if (json?.result) json.result.open = true
    await route.fulfill({ response, json })
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/store/cha_sha?ds_theme=${theme}`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '[data-ds-review]{display:none !important}' })
  const open = async () => {
    // the menu loads as it scrolls into view on a phone
    const card = page.getByText('Samosa Chaat').first()
    for (let i = 0; i < 25 && !(await card.count()); i++) {
      await page.mouse.wheel(0, 500)
      await sleep(400)
    }
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await page.locator(GROUP).first().waitFor()
    await sleep(600)
  }
  await open()
  return { ctx, page, open }
}

const addToCart = (page) => page.getByRole('button', { name: 'Add to cart' }).click()

// the pulse animation(s) running on the group's header
const pulses = (page) => page.locator(HEADER).first().evaluate((el) =>
  el.getAnimations().map((a) => ({ t: a.currentTime, d: a.effect.getTiming().duration })))

const snapped = (page) => page.evaluate(() => !!document.querySelector('[data-just-snapped]'))

// waits for the dialog's scroll (smooth) to stop
const settle = (page) => page.evaluate(async () => {
  const el = document.querySelector('[data-doc-section="product-option"]')
  let node = el.parentElement
  while (node && !/(auto|scroll)/.test(getComputedStyle(node).overflowY)) node = node.parentElement
  let last = -1
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (node.scrollTop === last) return
    last = node.scrollTop
  }
})

// pixels of `clip` that differ between two screenshots (decoded in a blank page)
async function differing (decoder, a, b) {
  return decoder.evaluate(async ([x, y]) => {
    const load = async (b64) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const c = new OffscreenCanvas(bmp.width, bmp.height)
      const g = c.getContext('2d')
      g.drawImage(bmp, 0, 0)
      return g.getImageData(0, 0, bmp.width, bmp.height).data
    }
    const [p, q] = [await load(x), await load(y)]
    let n = 0
    for (let i = 0; i < p.length; i += 4) {
      if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 24) n++
    }
    return { total: p.length / 4, differing: n }
  }, [a.toString('base64'), b.toString('base64')])
}

// The pulse frozen at its strongest visible moment, its whole ring in view.
// (The keyframe at 70% already has alpha 0, so the frozen frame is earlier:
// 30% of the duration, whose spread and alpha are read from the computed
// box-shadow.) The cards of the options come after the header: they must not
// hide the band under it or its lower corners. The band above the header, which
// nothing covers, is the reference of what a visible ring paints.
async function stacking (browser, width, theme, scenario) {
  const { ctx, page } = await openProduct(browser, width, theme)
  // the pulse's own timer would take the attribute (and the frozen pulse) away
  await page.evaluate(() => {
    const set = window.setTimeout
    window.setTimeout = (fn, ms, ...rest) => (ms >= 1000 ? 0 : set(fn, ms, ...rest))
  })
  await addToCart(page)
  const anims = await pulses(page)
  check(scenario, 'the pulse animates the header', anims.length === 1, `animations=${anims.length}`)
  if (anims.length !== 1) return ctx.close()
  const spread = await page.locator(HEADER).first().evaluate((el) => {
    const a = el.getAnimations()[0]
    a.pause()
    a.currentTime = 0.3 * a.effect.getTiming().duration
    return parseFloat(getComputedStyle(el).boxShadow.match(/([\d.]+)px\s*$/)?.[1] || '0')
  })
  await settle(page)
  const r = await page.locator(HEADER).first().evaluate((el) => {
    const h = el.getBoundingClientRect()
    const card = el.parentElement.querySelector('[role=radio]')?.getBoundingClientRect()
    return { left: h.left, right: h.right, top: h.top, bottom: h.bottom, cardTop: card?.top, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 }
  })
  const s = Math.max(2, Math.floor(spread) - 1) // inside the ring, off its soft edge
  const c = Math.ceil(r.radius)
  const x = Math.max(0, Math.floor(r.left) - s)
  const w = Math.ceil(r.right) + s - x
  const clips = {
    'band above the header (reference)': { x, y: Math.floor(r.top) - s, width: w, height: s },
    'band under the header (over the first option)': { x, y: Math.ceil(r.bottom), width: w, height: s },
    // a corner: the ring's arc around the header's rounded corner
    'top-left corner (reference)': { x, y: Math.floor(r.top) - s, width: s + c, height: s + c },
    'bottom-left corner': { x, y: Math.ceil(r.bottom) - c, width: s + c, height: s + c },
    'top-right corner (reference)': { x: Math.ceil(r.right) - c, y: Math.floor(r.top) - s, width: s + c, height: s + c },
    'bottom-right corner': { x: Math.ceil(r.right) - c, y: Math.ceil(r.bottom) - c, width: s + c, height: s + c }
  }
  const shoot = async () => Object.fromEntries(await Promise.all(Object.entries(clips).map(async ([k, clip]) => [k, await page.screenshot({ clip })])))
  const frozen = await shoot()
  if (process.env.SHOT_DIR && theme === 'grill') {
    await page.screenshot({ path: `${process.env.SHOT_DIR}/1308-${process.env.SHOT_TAG || 'run'}-${width}.png` })
  }
  // the same clips without the animation
  await page.locator(HEADER).first().evaluate((el) => el.getAnimations().forEach((a) => a.cancel()))
  const plain = await shoot()
  const decoder = await ctx.newPage()
  const share = {}
  for (const k of Object.keys(clips)) {
    const d = await differing(decoder, frozen[k], plain[k])
    share[k] = d.differing / d.total
  }
  await decoder.close()
  const pct = (k) => `${(share[k] * 100).toFixed(0)}%`
  check(scenario, 'the frozen ring paints the band above the header (reference)', share['band above the header (reference)'] >= 0.6,
    `spread=${spread.toFixed(1)}px, ${pct('band above the header (reference)')} painted`)
  for (const [k, ref] of [
    ['band under the header (over the first option)', 'band above the header (reference)'],
    ['bottom-left corner', 'top-left corner (reference)'],
    ['bottom-right corner', 'top-right corner (reference)']
  ]) {
    check(scenario, `ring visible in the ${k}`, share[ref] > 0 && share[k] >= 0.85 * share[ref],
      `${pct(k)} painted vs ${pct(ref)} of the reference; firstCardTop=${Math.round(r.cardTop)} headerBottom=${Math.round(r.bottom)}`)
  }

  // the fixed layers stay above the ring when the group passes under them
  // (the pulse is still on: the timer was held back); a short window, so the
  // form scrolls far enough
  await page.setViewportSize({ width, height: 420 })
  await sleep(500)
  check(scenario, 'the pulse attribute is still on for the layers test', await snapped(page))
  const layer = (name, place) => page.evaluate(([n, p]) => {
    const group = document.querySelector('[data-doc-section="product-option"]')
    const header = group.firstElementChild
    let box = group.parentElement
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
    const bar = n === 'tabs'
      ? document.querySelector('[data-sticky-top]')
      : [...box.querySelectorAll('div')].find((d) => getComputedStyle(d).position === 'sticky' && getComputedStyle(d).bottom === '0px')
    if (!bar) return { missing: true }
    const b = bar.getBoundingClientRect()
    const h = header.getBoundingClientRect()
    // the header's edge goes 6px into the bar
    box.scrollTo({ top: box.scrollTop + (p === 'top' ? h.top - (b.top + 6) : h.bottom - (b.bottom - 6)), behavior: 'instant' })
    const h2 = header.getBoundingClientRect()
    const b2 = bar.getBoundingClientRect()
    const overlaps = h2.top < b2.bottom && h2.bottom > b2.top
    const y = p === 'top' ? b2.top + 6 : b2.bottom - 6
    const at = document.elementFromPoint((h2.left + h2.right) / 2, y)
    return { overlaps, onTop: !!at && bar.contains(at), tag: at?.tagName }
  }, [name, place])
  for (const [name, place] of [['tabs', 'top'], ['actions bar', 'bottom']]) {
    const res = await layer(name, place)
    if (res.missing) check(scenario, `${name} found`, false)
    else if (!res.overlaps) console.log(`SKIP [${scenario}] ${name} over the group: the scroll cannot put the header under it`)
    else check(scenario, `${name} stays above the pulsing header`, res.onTop, `element at the point: ${res.tag}`)
  }
  await ctx.close()
}

// The ring's top edge lands below the tabs (the scroll to the error leaves the room)
async function landing (browser, width, theme, scenario) {
  const { ctx, page } = await openProduct(browser, width, theme)
  await addToCart(page)
  await settle(page)
  const r = await page.evaluate(() => {
    const nav = document.querySelector('[data-sticky-top]')
    const h = document.querySelector('[data-doc-section="product-option"]').firstElementChild.getBoundingClientRect()
    return { navBottom: nav ? nav.getBoundingClientRect().bottom : 0, top: h.top }
  })
  check(scenario, 'the ring top edge (header top - 12px) is below the tabs', r.top - RING >= r.navBottom - 0.5,
    `headerTop=${Math.round(r.top)} navBottom=${Math.round(r.navBottom)} room=${Math.round(r.top - r.navBottom)}px`)
  await ctx.close()
}

// Each click starts the pulse again and none is cut before it ends
async function restarts (browser, width, theme, scenario) {
  const { ctx, page } = await openProduct(browser, width, theme)
  let duration = 0
  for (let i = 1; i <= 3; i++) {
    await addToCart(page)
    const a = await pulses(page)
    duration = a[0]?.d || duration
    if (i > 1) check(scenario, `click ${i} starts a new pulse`, a.length === 1 && a[0].t < 200, `currentTime=${a[0] ? Math.round(a[0].t) : 'none'}ms`)
    if (i < 3) await sleep(300)
  }
  const t0 = Date.now()
  await sleep(Math.max(0, duration - 200))
  check(scenario, 'the pulse is not cut before the last one ends', (await snapped(page)) && (await pulses(page)).length === 1,
    `${Date.now() - t0}ms after the last click, duration=${duration}ms`)
  await sleep(500)
  check(scenario, 'the attribute is gone after the last pulse', !(await snapped(page)))
  await ctx.close()
}

// Reduced motion: nothing animates and the group is still marked as an error
async function reduced (browser, width, theme, scenario) {
  const { ctx, page } = await openProduct(browser, width, theme, 'reduce')
  const marks = () => page.evaluate(() => {
    const g = document.querySelector('[data-doc-section="product-option"]')
    const limit = [...g.querySelectorAll('span')].find((s) => /^(Choose|Max|Min)/i.test(s.textContent.trim()))
    return { state: g.dataset.docState, border: getComputedStyle(g).borderColor, limit: limit ? getComputedStyle(limit).color : '' }
  })
  const before = await marks()
  await addToCart(page)
  await sleep(300)
  const anims = await pulses(page)
  const name = await page.locator(HEADER).first().evaluate((el) => getComputedStyle(el).animationName)
  check(scenario, 'no animation on the header', anims.length === 0 && name === 'none', `animations=${anims.length} animation-name=${name}`)
  const after = await marks()
  const visible = after.state === 'invalid' && (after.border !== before.border || after.limit !== before.limit)
  check(scenario, 'the group still shows the error (border or limit color changes)', visible,
    `border ${before.border} -> ${after.border}; limit ${before.limit} -> ${after.limit}`)
  await ctx.close()
}

// No regression: opens, tabs stick, Esc closes, a chosen option adds with no error
async function regression (browser, width, theme, scenario) {
  const { ctx, page, open } = await openProduct(browser, width, theme)
  check(scenario, 'the modal opens with the group', (await page.locator(GROUP).count()) > 0)
  await page.setViewportSize({ width, height: 420 }) // a short window: the form scrolls past its tabs
  await sleep(500)
  const stuck = await page.evaluate(async () => {
    const nav = document.querySelector('[data-sticky-top]')
    let box = nav.parentElement
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
    // the bar sticks inside its section: scroll it just past its own place
    box.scrollTo({ top: box.scrollTop + nav.getBoundingClientRect().top - box.getBoundingClientRect().top + 30, behavior: 'instant' })
    await new Promise((resolve) => setTimeout(resolve, 200))
    // (on a phone it sticks below the modal's pinned close row: its `top`)
    return { sticky: getComputedStyle(nav).position === 'sticky', gap: nav.getBoundingClientRect().top - box.getBoundingClientRect().top, top: parseFloat(getComputedStyle(nav).top) || 0 }
  })
  check(scenario, 'tabs stay stuck at the top while scrolling', stuck.sticky && Math.abs(stuck.gap - stuck.top) <= 1, `gap=${Math.round(stuck.gap)}px, its top=${Math.round(stuck.top)}px`)
  await page.keyboard.press('Escape')
  await sleep(600)
  check(scenario, 'Esc closes the modal', (await page.locator(GROUP).count()) === 0)
  await open()
  await page.getByRole('radio', { name: /Regular/ }).click()
  await addToCart(page)
  await sleep(300)
  const valid = await page.evaluate(() => document.querySelector('[data-doc-section="product-option"]')?.dataset.docState)
  check(scenario, 'with an option chosen, Add to cart shows no pulse or error',
    !(await snapped(page)) && (await pulses(page)).length === 0 && valid !== 'invalid', `state=${valid}`)
  await ctx.close()
}

const browser = await chromium.launch()
try {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const tag = `${width}px ${theme}`
      for (const [fn, label] of [[stacking, 'stack'], [landing, 'landing'], [restarts, 'restart'], [reduced, 'reduced'], [regression, 'regress']]) {
        if (process.env.ONLY && !process.env.ONLY.split(',').includes(label)) continue
        try {
          await fn(browser, width, theme, `${tag} ${label}`)
        } catch (error) {
          check(`${tag} ${label}`, 'the scenario ran', false, String(error.message).split('\n')[0])
        }
      }
    }
  }
} finally {
  await browser.close()
}
console.log(failed ? `\n${failed} assertion(s) FAILED` : '\nall assertions passed')
process.exit(failed ? 1 : 0)
