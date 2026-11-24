import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOG_LIMIT, VIEWPORT_DEBUG_ID, buildRows, computeDerived, createViewportDebug, formatTime } from '../core'
import { autoMountViewportDebug, shouldEnableViewportDebug } from '../autoMount'
import { mountViewportDebug } from '../mount'

const rect = (left, right, top, bottom) => ({ left, right, top, bottom, width: right - left, height: bottom - top })

// jsdom has no layout: the elements the overlay measures answer the rects that are given
const rects = new Map()
const originalRect = Element.prototype.getBoundingClientRect

const original = Object.getOwnPropertyDescriptor(window, 'visualViewport')
const visual = Object.assign(new EventTarget(), { width: 844, height: 390, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1 })

const targets = [
  { key: 'header', label: 'Cabecera', short: 'cabecera', find: (doc) => doc.querySelector('[data-app-header]'), right: true },
  { key: 'nav', label: 'Navegación inferior', short: 'nav', find: (doc) => doc.querySelector('#nav'), right: true, bottom: true }
]
const compact = [{ key: 'nav', label: 'nav', mode: 'rect' }, { key: 'header', label: 'cab', mode: 'right' }]

const metrics = (over = {}) => ({
  iw: 844,
  ih: 390,
  ow: 844,
  oh: 390,
  vv: { w: 844, h: 390, top: 0, left: 0, pageTop: 0, pageLeft: 0, scale: 1 },
  cw: 844,
  ch: 390,
  sw: 844,
  sh: 1200,
  screen: { w: 390, h: 844 },
  orientation: { type: 'landscape-primary', angle: 90 },
  windowOrientation: 90,
  portrait: false,
  dpr: 3,
  scrollX: 0,
  scrollY: 0,
  touch: true,
  metaViewport: 'width=device-width',
  keyboardOpen: false,
  probes: { vw100: 844, pct100: 844, vh100: 390, dvh100: 390, svh100: 390, lvh100: 390, bottom: 390 },
  rects: { header: rect(0, 844, 0, 60), nav: rect(0, 844, 325, 390) },
  ...over
})

describe('shouldEnableViewportDebug', () => {
  const store = (value) => ({ getItem: () => value })
  it('is false outside development, whatever the parameter or the storage say', () => {
    expect(shouldEnableViewportDebug({ dev: false, search: '?viewport_debug=1', storage: store('1') })).toBe(false)
    expect(shouldEnableViewportDebug({ dev: undefined, search: '?viewport_debug=1' })).toBe(false)
    expect(shouldEnableViewportDebug()).toBe(false)
  })

  it('turns on with the parameter, remembers it and turns off with 0', () => {
    expect(shouldEnableViewportDebug({ dev: true, search: '?viewport_debug=1' })).toBe(true)
    expect(shouldEnableViewportDebug({ dev: true, search: '', storage: store('1') })).toBe(true)
    expect(shouldEnableViewportDebug({ dev: true, search: '', storage: store(null) })).toBe(false)
    expect(shouldEnableViewportDebug({ dev: true, search: '?viewport_debug=0', storage: store('1') })).toBe(false)
  })

  it('survives a storage that throws', () => {
    const broken = { getItem: () => { throw new Error('denied') } }
    expect(shouldEnableViewportDebug({ dev: true, search: '', storage: broken })).toBe(false)
    expect(shouldEnableViewportDebug({ dev: true, search: '?viewport_debug=1', storage: broken })).toBe(true)
  })
})

describe('autoMountViewportDebug', () => {
  afterEach(() => { document.getElementById(VIEWPORT_DEBUG_ID)?.remove(); window.sessionStorage.clear() })

  it('mounts nothing outside development', async () => {
    window.history.pushState({}, '', '/?viewport_debug=1')
    expect(await autoMountViewportDebug({ dev: false })).toBe(false)
    expect(document.getElementById(VIEWPORT_DEBUG_ID)).toBeNull()
    expect(window.sessionStorage.getItem('viewport_debug')).toBeNull()
  })

  it('mounts with ?viewport_debug=1, remembers it and forgets it with 0', async () => {
    window.history.pushState({}, '', '/?viewport_debug=1')
    expect(await autoMountViewportDebug({ dev: true })).toBe(true)
    expect(document.getElementById(VIEWPORT_DEBUG_ID)).not.toBeNull()
    expect(window.sessionStorage.getItem('viewport_debug')).toBe('1')
    window.history.pushState({}, '', '/?viewport_debug=0')
    expect(await autoMountViewportDebug({ dev: true })).toBe(false)
    expect(window.sessionStorage.getItem('viewport_debug')).toBeNull()
    window.history.pushState({}, '', '/')
  })
})

describe('computeDerived', () => {
  it('the right gap of the header and the bottom gap of the nav, in the broken state of the Duo', () => {
    // layout of 670 inside a window of 844; the bottom bar 630 above the edge
    const m = metrics({ iw: 844, ih: 844, vv: { w: 844, h: 844, top: 0, left: 0, pageTop: 0, pageLeft: 0, scale: 1 }, rects: { header: rect(0, 670, 0, 60), nav: rect(0, 670, 149, 214) } })
    const d = computeDerived(m, targets)
    const item = (id) => d.items.find((i) => i.id === id)
    expect(item('right-header')).toMatchObject({ value: '174', warn: true })
    expect(item('right-nav')).toMatchObject({ value: '174', warn: true })
    expect(item('bottom-nav')).toMatchObject({ value: '630', warn: true })
    expect(item('bottom-vv-nav')).toMatchObject({ value: '630', warn: true })
    expect(d.warnings.length).toBeGreaterThanOrEqual(3)
  })

  it('the bottom gap also counts against the visual viewport (height + offsetTop)', () => {
    const m = metrics({ ih: 390, vv: { w: 844, h: 300, top: 25, left: 0, pageTop: 25, pageLeft: 0, scale: 1 }, rects: { header: rect(0, 844, 0, 60), nav: rect(0, 844, 325, 390) } })
    const d = computeDerived(m, targets)
    expect(d.items.find((i) => i.id === 'bottom-nav')).toMatchObject({ value: '0', warn: false })
    expect(d.items.find((i) => i.id === 'bottom-vv-nav')).toMatchObject({ value: '-65', warn: true })
  })

  it('does not warn within 2 px, nor when everything agrees', () => {
    const m = metrics({ screen: { w: 390, h: 844 }, rects: { header: rect(0, 842.5, 0, 60), nav: rect(0, 844, 325, 389) } })
    const d = computeDerived(m, targets)
    expect(d.items.find((i) => i.id === 'right-header').warn).toBe(false)
    expect(d.items.find((i) => i.id === 'bottom-nav')).toMatchObject({ value: '1', warn: false })
    expect(d.warnings).toEqual([])
  })

  it('innerWidth against the screen width of the orientation, and against visualViewport.width x scale', () => {
    const stale = computeDerived(metrics({ iw: 670, vv: { w: 844, h: 390, top: 0, left: 0, pageTop: 0, pageLeft: 0, scale: 1 }, cw: 670, sw: 670, probes: { ...metrics().probes, vw100: 670, pct100: 670 } }), targets)
    expect(stale.items.find((i) => i.id === 'screen')).toMatchObject({ warn: true })
    expect(stale.items.find((i) => i.id === 'scaled')).toMatchObject({ value: '-174', warn: true })
    const zoomed = computeDerived(metrics({ iw: 844, vv: { w: 422, h: 195, top: 0, left: 0, pageTop: 0, pageLeft: 0, scale: 2 } }), targets)
    expect(zoomed.items.find((i) => i.id === 'scaled')).toMatchObject({ value: '0', warn: false })
  })

  it('flags horizontal scroll and says "no encontrado" for a missing bar', () => {
    const m = metrics({ sw: 1000, rects: { header: null, nav: null } })
    const d = computeDerived(m, targets)
    expect(d.items.find((i) => i.id === 'overflow')).toMatchObject({ value: '156', warn: true })
    expect(d.items.find((i) => i.id === 'right-header')).toMatchObject({ value: 'n/d', warn: false })
    const rows = buildRows(m, d, targets)
    expect(rows.find((r) => r.id === 'rect-nav').fields[0].value).toBe('no encontrado')
  })
})

describe('createViewportDebug', () => {
  let probeRect
  const originalMatchMedia = window.matchMedia
  const portrait = Object.assign(new EventTarget(), { matches: true, media: '(orientation: portrait)' })
  beforeEach(() => {
    vi.useFakeTimers()
    portrait.matches = true
    window.matchMedia = vi.fn(() => portrait)
    rects.clear()
    probeRect = rect(0, 0, 0, 0)
    Element.prototype.getBoundingClientRect = function () { return rects.get(this.id || this.tagName) || (this.hasAttribute('data-app-header') ? rects.get('header') : null) || probeRect }
    Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true })
    window.innerWidth = 390
    window.innerHeight = 844
    Object.assign(visual, { width: 390, height: 844, offsetTop: 0, scale: 1 })
    document.body.innerHTML = '<div id="root"><header data-app-header></header><nav id="nav"></nav></div>'
    rects.set('header', rect(0, 390, 0, 60))
    rects.set('nav', rect(0, 390, 779, 844))
  })
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect
    window.matchMedia = originalMatchMedia
    if (original) Object.defineProperty(window, 'visualViewport', original)
    else delete window.visualViewport
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('mounts outside #root and unmounts leaving nothing, with every listener removed', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const addVv = vi.spyOn(visual, 'addEventListener')
    const removeVv = vi.spyOn(visual, 'removeEventListener')
    const addMq = vi.spyOn(portrait, 'addEventListener')
    const removeMq = vi.spyOn(portrait, 'removeEventListener')
    const unmount = mountViewportDebug()
    const root = document.getElementById(VIEWPORT_DEBUG_ID)
    expect(root).not.toBeNull()
    expect(root.parentElement).toBe(document.body)
    expect(document.getElementById('root').contains(root)).toBe(false)
    expect(add.mock.calls.length).toBeGreaterThan(0)
    unmount()
    expect(document.getElementById(VIEWPORT_DEBUG_ID)).toBeNull()
    const pairs = (spy) => spy.mock.calls.map(([type, fn]) => `${type}:${fn.name}`).sort()
    expect(pairs(remove)).toEqual(pairs(add))
    expect(removeVv.mock.calls.length).toBe(addVv.mock.calls.length)
    expect(addMq.mock.calls.length).toBe(1)
    expect(removeMq.mock.calls.length).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
    // a resize after unmounting writes nothing and does not throw
    window.dispatchEvent(new Event('resize'))
    expect(document.getElementById(VIEWPORT_DEBUG_ID)).toBeNull()
  })

  it('mounting twice does not duplicate the overlay', () => {
    const unmount = mountViewportDebug()
    mountViewportDebug()
    expect(document.querySelectorAll(`#${VIEWPORT_DEBUG_ID}`)).toHaveLength(1)
    unmount()
  })

  it('records a resize with its snapshot and the three later readings', () => {
    const api = createViewportDebug({ win: window, targets, compact })
    window.innerWidth = 844
    window.innerHeight = 390
    Object.assign(visual, { width: 844, height: 390 })
    rects.set('nav', rect(0, 844, 325, 390))
    window.dispatchEvent(new Event('resize'))
    const [entry] = api.getLog()
    expect(entry.event).toBe('resize')
    expect(entry.detail).toBe('sintético')
    expect(entry.snap.iw).toBe(844)
    expect(entry.snap.ih).toBe(390)
    expect(entry.snap.rects.nav).toMatchObject({ right: 844, bottom: 390 })
    expect(entry.snap.parts.join(' ')).toContain('iw 844×390')
    expect(entry.snap.parts.join(' ')).toContain('cab R390')
    expect(/^\d\d:\d\d:\d\d\.\d{3}$/.test(entry.time)).toBe(true)

    // the layout settles late: the +500ms reading shows the new header
    rects.set('header', rect(0, 844, 0, 60))
    vi.advanceTimersByTime(1600)
    expect(entry.follow.map((f) => f.delay)).toEqual([100, 500, 1500])
    expect(entry.follow[0].snap.rects.header.right).toBe(844)
    expect(root(api).textContent).toContain('+500ms')
    api.unmount()
  })

  it('logs the orientation media change and the visual viewport resize', () => {
    const api = createViewportDebug({ win: window, targets, compact })
    portrait.matches = false
    portrait.dispatchEvent(new Event('change'))
    visual.dispatchEvent(new Event('resize'))
    expect(api.getLog().map((e) => e.event)).toEqual(['visualViewport resize', 'matchMedia orientation change'])
    expect(api.getLog()[1].detail).toBe('portrait=false')
    api.unmount()
  })

  it('does not log a scroll that changes nothing measurable, and caps the log', () => {
    window.requestAnimationFrame = (fn) => { fn(); return 0 }
    const api = createViewportDebug({ win: window, targets, compact })
    window.dispatchEvent(new Event('scroll'))
    expect(api.getLog()).toHaveLength(0)
    visual.offsetTop = 40
    window.dispatchEvent(new Event('scroll'))
    expect(api.getLog().map((e) => e.event)).toEqual(['scroll'])
    for (let i = 0; i < LOG_LIMIT + 10; i++) api.record(`evento ${i}`)
    expect(api.getLog()).toHaveLength(LOG_LIMIT)
    expect(api.getLog()[0].event).toBe(`evento ${LOG_LIMIT + 9}`)
    api.unmount()
  })

  it('writes the experiments as before / after and shows the fallback when it cannot copy', async () => {
    const api = createViewportDebug({ win: window, targets, compact })
    const click = (label) => [...root(api).querySelectorAll('button')].find((b) => b.textContent === label).click()
    click('Forzar reflow')
    expect(api.getLog()[0].event).toContain('reflow')
    expect(document.body.style.display).toBe('')
    click('Reescribir meta viewport')
    expect(api.getLog()[0].detail).toContain('antes')
    click('Disparar resize')
    expect(api.getLog().map((e) => e.event)).toContain('resize')
    vi.advanceTimersByTime(600)
    expect(api.getLog().find((e) => e.event.startsWith('Prueba dispatch')).follow.map((f) => f.delay)).toEqual([100, 500])

    Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true })
    click('Copiar JSON')
    await Promise.resolve()
    const area = root(api).querySelector('textarea')
    expect(area).not.toBeNull()
    expect(JSON.parse(area.value).log.length).toBeGreaterThan(0)
    api.unmount()
  })

  it('minimizes into a pill and clears the log', () => {
    const api = createViewportDebug({ win: window, targets, compact })
    api.record('algo')
    const click = (label) => [...root(api).querySelectorAll('button')].find((b) => b.textContent === label).click()
    click('Minimizar')
    expect(root(api).querySelector('.vd-panel').hidden).toBe(true)
    expect(root(api).querySelector('.vd-pill').textContent).toContain('VP 390×844')
    root(api).querySelector('.vd-pill').click()
    click('Limpiar registro')
    expect(api.getLog()).toHaveLength(0)
    api.unmount()
  })
})

describe('formatTime', () => {
  it('is hh:mm:ss.mmm', () => {
    expect(formatTime(new Date(2026, 10, 23, 9, 5, 7, 42))).toBe('09:05:07.042')
  })
})

function root (api) { return api.root }
