// implementation notestap a category and its title must land just under the fixed bars.
// Browser reproduction (Playwright); vitest does not pick it up (not *.test|spec).
//
//   node src/ui/src/components/BusinessProductsCategories/__tests__/scroll-offset.repro.mjs
//   BASE_URL=http://host:port STORE=cha_sha node ...   (defaults below)
//
// Runs against a dev server that is already up (it starts none). The store API
// is production: every POST/PUT/PATCH/DELETE is blocked, never orders or payments.
// For each width (390, 1440) and theme (defaults, forest) it taps the first
// category, one of the middle, the last, and the first again (scrolling up) and asserts
//   title.top >= categoriesBar.bottom - 1
//   title.top - categoriesBar.bottom <= 4   (when the page can scroll that far)
//   the tab with data-doc-active='true' is the tapped category
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://100.92.126.87:3111'
const STORE = process.env.STORE || 'cha_sha'
const WIDTHS = [390, 1440]
const THEMES = [undefined, 'forest']
const TABS = "[data-doc-control='business-category-tab']"

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// the scroll (smooth or instant, with its final correction) is over when the
// position stays put
const settled = async (page) => {
  let last = -1
  let still = 0
  for (let i = 0; i < 60 && still < 4; i++) {
    await sleep(100)
    const y = await page.evaluate(() => window.scrollY)
    still = y === last ? still + 1 : 0
    last = y
  }
}

const measure = (page, id) => page.evaluate((categoryId) => {
  const bar = document.getElementById('category-lists').getBoundingClientRect()
  const section = document.querySelector(`[data-doc-section='business-category-products'][data-doc-category-id='${categoryId}']`)
  const title = (section?.querySelector('.category-title') || section)?.getBoundingClientRect()
  const tab = document.querySelector(`[data-doc-control='business-category-tab'][data-doc-category-id='${categoryId}']`)
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  return {
    barBottom: bar.bottom,
    titleTop: title?.top,
    atEnd: window.scrollY >= scrollable - 1,
    active: tab?.getAttribute('data-doc-active'),
    scrollY: Math.round(window.scrollY)
  }
}, id)

const browser = await chromium.launch()
let failures = 0

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    await page.route('**/*', route => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())
      ? route.abort()
      : route.continue())
    await page.goto(`${BASE_URL}/store/${STORE}${theme ? `?ds_theme=${theme}` : ''}`, { waitUntil: 'networkidle' })
    await page.waitForSelector(TABS, { timeout: 30000 })
    const ids = await page.$$eval(TABS, tabs => tabs.map(tab => tab.getAttribute('data-doc-category-id')))
    const targets = [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1], ids[0]]

    for (const id of targets) {
      await page.locator(`${TABS}[data-doc-category-id='${id}']`).click()
      await settled(page)
      const m = await measure(page, id)
      const gap = m.titleTop - m.barBottom
      const problems = []
      if (m.titleTop === undefined) problems.push('no title in the page')
      if (gap < -1) problems.push(`title under the bar by ${(-gap).toFixed(1)}px`)
      if (!m.atEnd && gap > 4) problems.push(`title ${gap.toFixed(1)}px below the bar`)
      if (m.active !== 'true') problems.push(`active tab is not ${id}`)
      if (problems.length) failures++
      console.log(`${problems.length ? 'FAIL' : 'PASS'} ${width}px ${theme || 'defaults'} category ${id}: title.top=${m.titleTop?.toFixed(1)} bar.bottom=${m.barBottom.toFixed(1)} gap=${gap.toFixed(1)} scrollY=${m.scrollY}${m.atEnd ? ' (page end)' : ''}${problems.length ? ` <- ${problems.join('; ')}` : ''}`)
    }
    await page.close()
  }
}

await browser.close()
console.log(failures ? `\n${failures} case(s) failed` : '\nall cases passed')
process.exit(failures ? 1 : 0)
