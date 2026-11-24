import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activeCategoryId, fixedBarsBottom, MENU_BAR_ID, scrollToCategory } from '../scrollToCategory'

// implementation noteswhat stays fixed on top now also counts (a) the "Menu" bar of the menu_index template (sticky, in the
// flow) and (b) the tabs bar of `classic` as tall as 44 px (its touch floor with a coarse pointer), with a fixed and a
// revealing header. Rects are simulated (jsdom has no layout); the browser run is e2e/design/store-page.spec.js.

const rect = (top, height = 0) => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top })
const PAGE_TITLE_TOP = 1000
const HEADER = 60
const NAME_BAR = 70
const MENU_BAR = 52
const TABS_BAR = 44

let scrollY
let view
let frames
let scrollSpy
let scrollBySpy

const add = (id, className = '', parent = document.body) => {
  const el = document.createElement('div')
  if (id) el.id = id
  el.className = className
  parent.appendChild(el)
  return el
}
const place = (el, name) => {
  el.getBoundingClientRect = () => view[name]()
  return el
}
const header = (behavior, state = 'scrolled') => {
  const el = add('', '')
  el.setAttribute('data-app-header', '')
  el.setAttribute('data-scroll-behavior', behavior)
  el.setAttribute('data-scroll-state', state)
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: HEADER })
  el.getBoundingClientRect = () => rect(0, HEADER)
  return el
}
const title = () => place(add('category1'), 'title')
const flushFrame = () => { const run = frames; frames = []; run.forEach(cb => cb()) }

beforeEach(() => {
  scrollY = 200
  view = {}
  frames = []
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  scrollSpy = vi.fn(({ top }) => { scrollY = top })
  scrollBySpy = vi.fn(({ top }) => { scrollY += top })
  window.scroll = scrollSpy
  window.scrollBy = scrollBySpy
  vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

// the Menu bar sticks under what the header covers (and the fixed name bar); its box is where it is now
const menuBar = (top) => {
  const bar = place(add(MENU_BAR_ID), 'bar')
  Object.defineProperty(bar, 'offsetHeight', { value: MENU_BAR })
  view.bar = () => rect(top, MENU_BAR)
  return bar
}

describe.each(['fixed', 'reveal'])('the Menu bar, with a %s header', (behavior) => {
  it('stuck under the header and the fixed name: what is below it ends under the bar', () => {
    header(behavior)
    place(add('business_name_bar', 'fixed-name'), 'name')
    view.name = () => rect(HEADER, NAME_BAR)
    menuBar(HEADER + NAME_BAR)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER + NAME_BAR + MENU_BAR)
    scrollToCategory(title())
    // a revealing header will have left when the scroll ends (going down), and the bars go up with it
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (behavior === 'reveal' ? NAME_BAR + MENU_BAR : HEADER + NAME_BAR + MENU_BAR))
  })

  it('not stuck yet (in the flow, under the header): it will be, so it counts as tall as it is', () => {
    header(behavior)
    menuBar(500 - scrollY + 400)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER + MENU_BAR)
  })

  it('a section above the bar counts nothing of it', () => {
    header(behavior)
    menuBar(300)
    view.title = () => rect(100)
    expect(fixedBarsBottom(title())).toBe(HEADER)
  })
})

describe('a tabs bar of 44 px (the classic bar with a coarse pointer): the title ends right under it', () => {
  const docked = () => {
    place(add('business_name_bar', 'fixed-name'), 'name')
    place(add('category-lists', 'sticky-prod-cat'), 'bar')
    view.name = () => rect(HEADER, NAME_BAR)
    view.bar = () => rect(HEADER + NAME_BAR, TABS_BAR)
  }

  it('fixed header: header, name bar and the 44 px bar are all covered', () => {
    header('fixed')
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy).toHaveBeenCalledWith({ top: PAGE_TITLE_TOP - (HEADER + NAME_BAR + TABS_BAR), left: 0, behavior: 'instant' })
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
    expect(PAGE_TITLE_TOP - scrollY).toBe(HEADER + NAME_BAR + TABS_BAR)
  })

  it('revealing header going down: it will have left, the name bar and the 44 px bar go up with it', () => {
    header('reveal')
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (NAME_BAR + TABS_BAR))
    document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'hidden')
    view.name = () => rect(0, NAME_BAR)
    view.bar = () => rect(NAME_BAR, TABS_BAR)
    flushFrame()
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
    expect(PAGE_TITLE_TOP - scrollY).toBe(NAME_BAR + TABS_BAR)
  })
})

describe('activeCategoryId: the category under the fixed bars', () => {
  const SECTIONS = [[1, 100, 500], [2, 600, 500], [3, 1100, 100]]
  const setPage = ({ height = 5000 } = {}) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: height })
    SECTIONS.forEach(([id, top, height]) => {
      const el = add(`category${id}`)
      el.getBoundingClientRect = () => rect(top - scrollY, height)
    })
  }

  it('the one that crosses the bars\' bottom', () => {
    setPage()
    header('fixed')
    menuBar(HEADER)
    scrollY = 450
    expect(activeCategoryId([1, 2, 3])).toBe(1)
    // the first one ends under the stuck bar (100 < 60 + 52): it is covered, the second is the one read
    scrollY = 500
    expect(activeCategoryId([1, 2, 3])).toBe(2)
    scrollY = 560
    expect(activeCategoryId([1, 2, 3])).toBe(2)
  })

  it('at the end of the page the last one, though it is too short to reach the bars', () => {
    setPage({ height: 1300 })
    scrollY = 500 // 800 + 500 >= 1300
    expect(activeCategoryId([1, 2, 3])).toBe(3)
  })

  it('none while the page is above every section', () => {
    setPage()
    scrollY = 0
    expect(activeCategoryId([1, 2, 3])).toBeNull()
  })
})
