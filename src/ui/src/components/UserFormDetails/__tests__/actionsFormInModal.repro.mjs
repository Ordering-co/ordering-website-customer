// implementation notesActionsForm sticky bar inside a modal, and the card brand logo,
// in a real Chromium. `node src/ui/src/components/UserFormDetails/__tests__/actionsFormInModal.repro.mjs`
// Bundles the fixture in memory (same aliases as e2e/design/bundle.js), loads it
// with setContent, prints each assertion and exits 1 if any fails.
// DS_REVIEW blocks writes, so there is no real cart: the layout is the real
// components with plain fields.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { build } from 'vite'
import { chromium } from '@playwright/test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..')
const SHOTS = process.env.REPRO_SHOTS

const bundle = async () => {
  const result = await build({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'scheduler'],
      alias: [
        { find: /^~components\//, replacement: path.join(ROOT, 'src/@/components/src') + '/' },
        { find: /^~components$/, replacement: path.join(ROOT, 'src/@/components/src') },
        { find: /^~ui\//, replacement: path.join(ROOT, 'src/ui') + '/' },
        { find: /^~ui$/, replacement: path.join(ROOT, 'src/ui') },
        { find: /^~ui-icon$/, replacement: path.join(ROOT, 'src/ui/src/components/Icon') },
        { find: /^~\//, replacement: path.join(ROOT, 'src') + '/' }
      ]
    },
    esbuild: { loader: 'jsx', include: /(src|e2e)\/.*\.jsx?$/, exclude: [] },
    define: { global: 'globalThis', 'process.env': {}, 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: path.join(HERE, 'actionsFormInModal.fixture.jsx'), formats: ['iife'], name: 'Fixture', fileName: 'fixture' }
    }
  })
  const [{ output }] = [result].flat()
  return {
    js: output.find((f) => f.type === 'chunk').code,
    css: String(output.find((f) => f.fileName.endsWith('.css'))?.source ?? '')
  }
}

let failures = 0
const check = (label, ok, detail) => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`)
}
const f = (n) => Math.round(n * 10) / 10

const { js, css } = await bundle()
const browser = await chromium.launch()

const open = async (scene, themeId, width) => {
  const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body></body></html>`)
  await page.addScriptTag({ content: js })
  await page.evaluate(([s, t]) => window.mountScene(s, t), [scene, themeId])
  await page.locator('#last-field, [data-brand]').first().waitFor()
  if (errors.length) throw new Error(errors.join('; '))
  return page
}

// scrolls the nearest scrolling ancestor of the bar (the page when none) to `where`
// and returns the bar, the last field and the visible area of that scroller.
const measure = (page, where) => page.evaluate((at) => {
  const bar = document.querySelector('#actions')
  const scroller = (() => {
    for (let el = bar.parentElement; el; el = el.parentElement) {
      const { overflowY } = getComputedStyle(el)
      if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight) return el
    }
    return null
  })()
  const max = scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - innerHeight
  const top = at === 'end' ? max : Math.round(max / 2)
  if (scroller) scroller.scrollTop = top
  else scrollTo(0, top)
  const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: innerHeight }
  const visible = { top: Math.max(box.top, 0), bottom: Math.min(box.bottom, innerHeight) }
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right } }
  const save = document.querySelector('#save')
  const sb = save.getBoundingClientRect()
  const hit = document.elementFromPoint(sb.left + sb.width / 2, sb.top + sb.height / 2)
  return {
    scrollable: !!scroller,
    bar: r(bar),
    last: r(document.querySelector('#last-field')),
    visible,
    nav: window.__nav,
    style: { position: getComputedStyle(bar).position, bottom: getComputedStyle(bar).bottom },
    saveReachable: hit === save || save.contains(hit),
    inner: innerHeight
  }
}, where)

for (const themeId of ['defaults', 'grill']) {
  for (const width of [390, 1440]) {
    const tag = `${themeId}@${width}`

    for (const scene of ['modal-checkout', 'modal-verification']) {
      const page = await open(scene, themeId, width)
      const end = await measure(page, 'end')
      check(`${tag} ${scene}: scrollable`, end.scrollable, '')
      check(`${tag} ${scene} end: bar.top >= last field.bottom (no overlap)`, end.bar.top >= end.last.bottom - 0.5, `bar.top=${f(end.bar.top)} last.bottom=${f(end.last.bottom)} overlap=${f(Math.max(0, end.last.bottom - end.bar.top))}`)
      check(`${tag} ${scene} end: bar inside the visible area`, end.bar.bottom <= end.visible.bottom + 0.5 && end.bar.top >= end.visible.top - 0.5, `bar=[${f(end.bar.top)},${f(end.bar.bottom)}] visible=[${f(end.visible.top)},${f(end.visible.bottom)}]`)
      // from 769px the bar is in flow (not sticky): it is reached by scrolling to the end
      const mid = await measure(page, 'mid')
      if (width < 769) check(`${tag} ${scene} mid: bar visible and Save reachable`, mid.bar.bottom <= mid.visible.bottom + 0.5 && mid.bar.top >= mid.visible.top - 0.5 && mid.saveReachable, `bar=[${f(mid.bar.top)},${f(mid.bar.bottom)}] visible=[${f(mid.visible.top)},${f(mid.visible.bottom)}] reachable=${mid.saveReachable} ${mid.style.position}/${mid.style.bottom}`)
      if (SHOTS && scene === 'modal-checkout' && themeId === 'defaults') {
        await measure(page, 'end')
        await page.screenshot({ path: path.join(SHOTS, `1318-${process.env.REPRO_TAG}-${width}.png`) })
      }
      await page.close()
    }

    // outside a modal implementation notes stays: lifted by the NavigationBar height below 576px
    const page = await open('page', themeId, width)
    const mid = await measure(page, 'mid')
    const small = width < 576
    check(`${tag} page: bottom = bottomNavHeight (${mid.nav}) ${small ? 'below' : 'above'} 576px`, small ? mid.style.bottom === `${mid.nav}px` && mid.nav > 0 : mid.style.position === 'sticky' ? mid.style.bottom === '0px' : true, `position=${mid.style.position} bottom=${mid.style.bottom}`)
    if (small) check(`${tag} page mid: bar bottom sits nav above the viewport bottom`, Math.abs(mid.bar.bottom - (mid.inner - mid.nav)) < 1, `bar.bottom=${f(mid.bar.bottom)} expected=${mid.inner - mid.nav}`)
    await page.close()

    const flow = await open('inflow', themeId, width)
    const fm = await measure(flow, 'mid')
    check(`${tag} inflow: stays static`, width >= 769 ? true : fm.style.position === 'static', `position=${fm.style.position} bottom=${fm.style.bottom}`)
    await flow.close()

    // the card brand logo, measured on every brand
    if (width === 390) {
      const card = await open('card', themeId, width)
      const rows = await card.$$eval('[data-brand]', (items) => items.map((item) => {
        const img = item.querySelector('.brand img')
        const style = getComputedStyle(img)
        const b = img.getBoundingClientRect()
        return { brand: item.dataset.brand, fit: style.objectFit, w: b.width, h: b.height, nw: img.naturalWidth, nh: img.naturalHeight }
      }))
      for (const row of rows) {
        const natural = row.nh ? row.nw / row.nh : 0
        // contain keeps the natural ratio inside the box; fill would paint the box ratio (1)
        check(`${tag} card ${row.brand}: object-fit contain, box ${f(row.w)}x${f(row.h)}`, row.fit === 'contain', `object-fit=${row.fit} natural=${row.nw}x${row.nh} (ratio ${f(natural * 100) / 100}) painted ratio=${row.fit === 'contain' ? f(natural * 100) / 100 : f((row.w / row.h) * 100) / 100}`)
      }
      await card.close()
    }
  }
}

await browser.close()
console.log(failures ? `\n${failures} assertion(s) FAILED` : '\nall assertions passed')
process.exit(failures ? 1 : 0)
