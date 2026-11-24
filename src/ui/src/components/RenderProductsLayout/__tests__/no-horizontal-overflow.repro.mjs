// implementation notesthe store page never scrolls sideways between 360 and 1024 px
// (and at 390, 1280, 1440), in Chromium and WebKit, in two themes. Not a
// vitest test (its include wants .test/.spec): a browser check against a
// running dev server, `DS_REVIEW=1 pnpm dev`. Run it from the repo root:
//   node src/ui/src/components/RenderProductsLayout/__tests__/no-horizontal-overflow.repro.mjs [baseUrl] [path]
// It prints the elements wider than the viewport (not clipped by an ancestor)
// and exits 1 when the page is wider than its viewport.
import { chromium, webkit } from '@playwright/test'

const base = process.argv[2] || 'http://localhost:3000'
const path = process.argv[3] || '/store/cha_sha'
const widths = [360, 390, 430, 600, 670, 700, 768, 820, 1024, 1280, 1440]
const themes = ['', 'forest']

const measure = () => {
  const cw = document.documentElement.clientWidth
  const offenders = []
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect()
    if (!rect.width || rect.right <= cw + 1) continue
    let parent = el.parentElement
    let clipped = false
    while (parent && parent !== document.body) {
      if (getComputedStyle(parent).overflowX !== 'visible' && parent.getBoundingClientRect().right <= cw + 1) { clipped = true; break }
      parent = parent.parentElement
    }
    if (!clipped) offenders.push(`${el.tagName.toLowerCase()}#${el.id}.${String(el.className).split(' ').slice(-1)} right=${Math.round(rect.right)}`)
  }
  return { cw, sw: document.documentElement.scrollWidth, offenders: offenders.slice(0, 5) }
}

let failed = 0
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  for (const theme of themes) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, ...(name === 'webkit' && width < 1024 && { isMobile: true, hasTouch: true }) })
      // the API is production's: nothing is written
      await page.route('**/*', route => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method()) ? route.abort() : route.continue())
      await page.goto(`${base}${path}${theme ? `?ds_theme=${theme}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('#businessProductList', { timeout: 45000 })
      await page.waitForTimeout(1500)
      const { cw, sw, offenders } = await page.evaluate(measure)
      const ok = sw <= cw
      if (!ok) failed++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${theme || 'defaults'} ${width}: scrollWidth=${sw} clientWidth=${cw}${offenders.length ? ` ${offenders.join(' | ')}` : ''}`)
      await page.close()
    }
  }
  await browser.close()
}
console.log(failed ? `${failed} case(s) scroll sideways` : 'no horizontal scroll')
process.exit(failed ? 1 : 0)
