import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { fixedBarsBottom, scrollToCategory } from '../scrollToCategory'
import { BusinessProductsCategories } from '../index'
import { HEADER_DOCK_EVENT, HEADER_STATE_EVENT } from '../../Header/scrollBehavior'

// implementation notesa tapped category's title lands just under what stays fixed on
// top, measured from the DOM (rects simulated here; the browser run is
// scroll-offset.repro.mjs).

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div /> }))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))
vi.mock('~components/components/BusinessProductsCategories', () => ({
  BusinessProductsCategories: ({ UIComponent, ...rest }) => (
    <UIComponent
      categories={[{ id: 1, name: 'Drinks' }, { id: 2, name: 'Food' }, { id: 3, name: 'Dessert' }]}
      categorySelected={{ id: 1, name: 'Drinks' }}
      handlerClickCategory={vi.fn()}
      business={businessFixture}
      isSkeleton={false}
      {...rest}
    />
  )
}))

const rect = (top, height = 0) => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top })

// A page: `scrollY` is the window's; each element answers its rect from `view`
// (viewport px, so it moves with the scroll like the browser's).
let scrollY
let view
const place = (el, name) => {
  el.getBoundingClientRect = () => view[name]()
  return el
}
const add = (id, className = '', parent = document.body) => {
  const el = document.createElement('div')
  if (id) el.id = id
  el.className = className
  parent.appendChild(el)
  return el
}

const PAGE_TITLE_TOP = 1000 // the title's top in the page
const NAME_BAR = 70 // the name bar's height once fixed
const BAR = 40 // the categories bar's height

let scrollSpy
let scrollBySpy
let frames

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

const flushFrame = () => { const run = frames; frames = []; run.forEach(cb => cb()) }

// the title as the browser sees it: its page top less the scroll
const title = () => place(add('category1'), 'title')
const docked = () => {
  place(add('business_name_bar', 'fixed-name'), 'name')
  const bar = place(add('category-lists', 'sticky-prod-cat'), 'bar')
  view.name = () => rect(0, NAME_BAR)
  view.bar = () => rect(NAME_BAR, BAR)
  return bar
}

describe('fixedBarsBottom', () => {
  it('docked: the bottom of the categories bar (the name bar above it counted)', () => {
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(NAME_BAR + BAR)
  })

  it('without the name bar fixed (the kiosk, a page without a header): only the categories bar', () => {
    const bar = place(add('category-lists', 'sticky-prod-cat'), 'bar')
    view.bar = () => rect(0, BAR)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(bar).toBeTruthy()
    expect(fixedBarsBottom(title())).toBe(BAR)
  })

  it('no bars: nothing fixed', () => {
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(0)
  })

  it('the bar not docked yet counts, as tall as it is, for what lies below its place', () => {
    const wrapper = add('', '')
    const bar = place(add('category-lists', '', wrapper), 'bar')
    place(wrapper, 'place')
    Object.defineProperty(bar, 'offsetHeight', { value: BAR })
    view.place = () => rect(600 - scrollY)
    view.bar = () => rect(600 - scrollY, BAR)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(BAR)
    view.title = () => rect(500 - scrollY) // above the bar's place
    expect(fixedBarsBottom(title())).toBe(0)
  })
})

describe('scrollToCategory', () => {
  it('the title ends at the bars\' bottom; the old offsetTop - 60 left it under the bar', () => {
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    const oldTop = PAGE_TITLE_TOP - 60
    expect(PAGE_TITLE_TOP - oldTop).toBeLessThan(NAME_BAR + BAR)

    scrollToCategory(title())
    expect(scrollSpy).toHaveBeenCalledWith({ top: PAGE_TITLE_TOP - (NAME_BAR + BAR), left: 0, behavior: 'instant' })
    expect(PAGE_TITLE_TOP - scrollY).toBe(NAME_BAR + BAR)
  })

  it('from the top of the page the name bar and the bar are not fixed yet: it measures the name bar and corrects after the bars dock', () => {
    scrollY = 0
    const name = place(add('business_name_bar'), 'name')
    place(add('business_name'), 'businessName')
    const wrapper = place(add('wrapper'), 'place')
    const bar = place(add('category-lists', '', wrapper), 'bar')
    Object.defineProperty(bar, 'offsetHeight', { value: BAR })
    view.businessName = () => rect(300 - scrollY)
    view.place = () => rect(600 - scrollY)
    // the name bar has a size only fixed
    view.name = () => (name.classList.contains('fixed-name') ? rect(0, NAME_BAR) : rect(0))
    view.bar = () => (bar.classList.contains('sticky-prod-cat') ? rect(NAME_BAR, BAR) : rect(600 - scrollY, BAR))
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)

    scrollToCategory(title())
    // estimated with the name bar measured by fixing it for an instant
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (NAME_BAR + BAR))
    expect(name.classList.contains('fixed-name')).toBe(false)

    // the page grew above it while the bars docked: the rest is measured and moved
    name.classList.add('fixed-name')
    bar.classList.add('sticky-prod-cat')
    view.title = () => rect(PAGE_TITLE_TOP + 25 - scrollY)
    flushFrame()
    expect(scrollBySpy).toHaveBeenCalledWith({ top: 25, left: 0, behavior: 'instant' })
    expect(PAGE_TITLE_TOP + 25 - scrollY).toBe(NAME_BAR + BAR)
  })

  it('no correction when it already sits there (under a pixel)', () => {
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('smooth only when the theme animates and the system does not reduce motion', () => {
    docked()
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    const animated = themeWithValues()
    const still = themeWithValues((values) => {
      values.tokens.motion_style.enabled = false
      return values
    })
    scrollToCategory(title(), animated)
    expect(scrollSpy.mock.calls.at(-1)[0].behavior).toBe(animated.values.tokens.motion_style.enabled ? 'smooth' : 'instant')

    scrollToCategory(title(), still)
    expect(scrollSpy.mock.calls.at(-1)[0].behavior).toBe('instant')

    const themeOn = themeWithValues((values) => {
      values.tokens.motion_style.enabled = true
      return values
    })
    scrollToCategory(title(), themeOn)
    expect(scrollSpy.mock.calls.at(-1)[0].behavior).toBe('smooth')

    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    scrollToCategory(title(), themeOn)
    expect(scrollSpy.mock.calls.at(-1)[0].behavior).toBe('instant')
  })
})

// implementation notesthe header on top (fixed: always; reveal: only while it is on view) is part of what stays fixed.
// The page's header, as the Header leaves it on its root: its behavior, its state, its height.
const HEADER = 60
const header = (behavior, state = 'scrolled') => {
  const el = add('', '')
  el.setAttribute('data-app-header', '')
  el.setAttribute('data-scroll-behavior', behavior)
  el.setAttribute('data-scroll-state', state)
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: HEADER })
  el.getBoundingClientRect = () => rect(0, HEADER)
  return el
}
// the bars hang under what the header covers: the name bar right under it, the categories under both
const dockedUnder = (covered) => {
  place(add('business_name_bar', 'fixed-name'), 'name')
  place(add('category-lists', 'sticky-prod-cat'), 'bar')
  view.name = () => rect(covered, NAME_BAR)
  view.bar = () => rect(covered + NAME_BAR, BAR)
}

describe.each(['fixed', 'reveal'])('fixedBarsBottom with a %s header', (behavior) => {
  it('visible, nothing else fixed: the header\'s bottom', () => {
    header(behavior)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER)
  })

  it('visible, the name bar and the categories docked under it: the categories\' bottom', () => {
    header(behavior)
    dockedUnder(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER + NAME_BAR + BAR)
  })

  it('visible, only the categories docked (the name bar still in the flow): they hang under the header', () => {
    header(behavior)
    place(add('category-lists', 'sticky-prod-cat'), 'bar')
    view.bar = () => rect(HEADER, BAR)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER + BAR)
  })
})

describe('fixedBarsBottom with a revealing header out of view', () => {
  it('hidden: it counts for nothing, the bars go up to the top', () => {
    header('reveal', 'hidden')
    dockedUnder(0)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(NAME_BAR + BAR)
  })

  it('hidden and nothing else fixed: 0', () => {
    header('reveal', 'hidden')
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(0)
  })
})

describe('scrollToCategory with the header', () => {
  it('fixed: the title ends under the header and the bars', () => {
    header('fixed')
    dockedUnder(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy).toHaveBeenCalledWith({ top: PAGE_TITLE_TOP - (HEADER + NAME_BAR + BAR), left: 0, behavior: 'instant' })
  })

  it('reveal, going down: the header will have left when it ends, so it is not counted (no second step after the scroll)', () => {
    header('reveal', 'scrolled')
    dockedUnder(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (NAME_BAR + BAR))
    // the header hid and the bars went up: the page is where it must be, nothing to correct
    document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'hidden')
    view.name = () => rect(0, NAME_BAR)
    view.bar = () => rect(NAME_BAR, BAR)
    flushFrame()
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  // instant (reduced motion): the frame that follows the scroll can run before the header's own handler, with the
  // header still as it was; the correction waits for the frame after it, where the header and its bars are as they end up
  it('reveal, going down, instant: no correction measured with the header not hidden yet (no jump)', () => {
    header('reveal', 'scrolled')
    dockedUnder(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
    // the header's handler runs: it hides and the bars go up
    document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'hidden')
    view.name = () => rect(0, NAME_BAR)
    view.bar = () => rect(NAME_BAR, BAR)
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('reveal, going up, instant: the same with the header still hidden in the first frame', () => {
    scrollY = 3000
    header('reveal', 'hidden')
    dockedUnder(0)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
    document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'scrolled')
    view.name = () => rect(HEADER, NAME_BAR)
    view.bar = () => rect(HEADER + NAME_BAR, BAR)
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('reveal, going up: the header will be back, so it is counted even if it is hidden now', () => {
    scrollY = 3000
    header('reveal', 'hidden')
    dockedUnder(0)
    // above the viewport (going up)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (HEADER + NAME_BAR + BAR))
    document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'scrolled')
    view.name = () => rect(HEADER, NAME_BAR)
    view.bar = () => rect(HEADER + NAME_BAR, BAR)
    flushFrame()
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })
})

describe('scrollToCategory: a newer call, the user or a gone element end the correction', () => {
  // an element `pageTop` down the page, in the docked bars' page
  const at = (id, pageTop) => {
    const el = add(id)
    el.getBoundingClientRect = () => rect(pageTop - scrollY)
    return el
  }

  it('tap A then B: only B corrects', () => {
    docked()
    const a = at('categoryA', PAGE_TITLE_TOP)
    const b = at('categoryB', PAGE_TITLE_TOP + 500)
    scrollToCategory(a)
    scrollToCategory(b)
    // the page moved under both (a dock, an image): each would have a rest
    a.getBoundingClientRect = () => rect(PAGE_TITLE_TOP + 30 - scrollY)
    b.getBoundingClientRect = () => rect(PAGE_TITLE_TOP + 500 + 20 - scrollY)
    flushFrame()
    expect(scrollBySpy).toHaveBeenCalledTimes(1)
    expect(scrollBySpy.mock.calls[0][0].top).toBe(20) // B's rest, A's 30 never
  })

  it.each(['wheel', 'touchstart', 'keydown'])('a %s of the user: no correction more', (type) => {
    docked()
    const a = at('categoryA', PAGE_TITLE_TOP)
    scrollToCategory(a)
    a.getBoundingClientRect = () => rect(PAGE_TITLE_TOP + 30 - scrollY)
    window.dispatchEvent(new Event(type))
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('an element that left the page: no correction', () => {
    docked()
    const a = at('categoryA', PAGE_TITLE_TOP)
    scrollToCategory(a)
    a.getBoundingClientRect = () => rect(PAGE_TITLE_TOP + 30 - scrollY)
    a.remove()
    flushFrame()
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('it lets go of the user\'s inputs when it ends', () => {
    docked()
    const remove = vi.spyOn(window, 'removeEventListener')
    const a = at('categoryA', PAGE_TITLE_TOP)
    scrollToCategory(a)
    flushFrame()
    expect(remove.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['wheel', 'touchstart', 'keydown']))
    remove.mockRestore()
  })
})

describe('tapping a category tab', () => {
  beforeEach(() => {
    const style = document.createElement('style')
    style.id = 'styles'
    Object.defineProperty(style, 'sheet', {
      value: { cssRules: [], insertRule: vi.fn(), deleteRule: vi.fn() }
    })
    document.head.appendChild(style)
  })

  afterEach(() => {
    document.getElementById('styles')?.remove()
  })

  it('its title ends under the fixed bars (the old offsetTop - 60 left it at 60px, under the bar)', () => {
    const { getByText, container } = renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
    const bar = container.querySelector('#category-lists')
    // the bars are docked; the page shows the section of "Food" and its title
    bar.classList.add('sticky-prod-cat')
    bar.getBoundingClientRect = () => rect(NAME_BAR, BAR)
    const section = add('category2')
    const sectionTitle = add('', 'category-title', section)
    sectionTitle.getBoundingClientRect = () => rect(PAGE_TITLE_TOP - scrollY)
    section.getBoundingClientRect = () => rect(PAGE_TITLE_TOP - scrollY)

    fireEvent.click(getByText('Food'))
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (NAME_BAR + BAR))
    expect(PAGE_TITLE_TOP - scrollY).toBe(NAME_BAR + BAR)
  })
})

describe('scroll-spy: the active tab follows the page (handleScroll)', () => {
  // sections of 500, 500 and 100 px (the last one short), contiguous from page y 100
  const SECTIONS = [[1, 100, 500], [2, 600, 500], [3, 1100, 100]]
  const active = (container) => Array.from(container.querySelectorAll("[data-doc-control='business-category-tab']"))
    .filter(tab => tab.getAttribute('data-doc-active') === 'true')
    .map(tab => Number(tab.getAttribute('data-doc-category-id')))
  const setPage = ({ height, viewport = 800 }) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport })
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: height })
  }
  const sections = () => SECTIONS.forEach(([id, top, height]) => {
    const el = add(`category${id}`)
    el.getBoundingClientRect = () => rect(top - scrollY, height)
  })
  // the bar is 40px tall and its place is above the sections (undocked, as at
  // rest: the spy counts it as the bars)
  const render = () => {
    sections()
    const original = HTMLDivElement.prototype.getBoundingClientRect
    // the place of the bar (its parent), before the mount's own measure
    vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return this.firstElementChild?.id === 'category-lists' ? rect(50 - scrollY) : original.call(this)
    })
    return renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
  }
  const scroll = (y) => act(() => {
    scrollY = y
    fireEvent.scroll(window)
  })

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get () { return this.id === 'category-lists' ? BAR : 0 } })
    const style = document.createElement('style')
    style.id = 'styles'
    Object.defineProperty(style, 'sheet', { value: { cssRules: [], insertRule: vi.fn(), deleteRule: vi.fn() } })
    document.head.appendChild(style)
    setPage({ height: 1500 })
  })

  afterEach(() => {
    delete HTMLElement.prototype.offsetHeight
    vi.restoreAllMocks()
    document.getElementById('styles')?.remove()
  })

  it('reached: its top at the bars\' bottom plus the tolerance (4px) or above', () => {
    const { container } = render()
    scroll(556) // the second one\'s top is at 44 = 40 + 4
    expect(active(container)).toEqual([2])
    scroll(555) // 45: not yet, the first still holds the bars
    expect(active(container)).toEqual([1])
  })

  it('the first category', () => {
    const { container } = render()
    scroll(60)
    expect(active(container)).toEqual([1])
  })

  it('a short last category at the end of the page: the last is the active one', () => {
    setPage({ height: 1200 })
    const { container } = render()
    scroll(400) // the page ends: 400 + 800 = 1200
    expect(active(container)).toEqual([3])
  })

  it('a short page that fits the viewport at scrollY 0: none active, not the last', () => {
    setPage({ height: 700 })
    scrollY = 0
    const { container } = render()
    scroll(0)
    expect(active(container)).toEqual([])
  })

  it('on mount, with the scroll restored: the active tab is right without a scroll event', () => {
    scrollY = 556
    const { container } = render()
    expect(active(container)).toEqual([2])
  })
})

describe('the categories stick under the header (--categories-sticky-top)', () => {
  beforeEach(() => {
    const style = document.createElement('style')
    style.id = 'styles'
    Object.defineProperty(style, 'sheet', { value: { cssRules: [], insertRule: vi.fn(), deleteRule: vi.fn() } })
    document.head.appendChild(style)
  })
  afterEach(() => {
    document.getElementById('styles')?.remove()
  })
  const stickyTop = (container) => container.querySelector('#category-lists').style.getPropertyValue('--categories-sticky-top')
  const mount = () => renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })

  it('with a header on view: its bottom, no 56 written in the code', () => {
    header('fixed', 'scrolled')
    expect(stickyTop(mount().container)).toBe(`${HEADER}px`)
  })

  it('a revealing header hidden: the top of the page', () => {
    header('reveal', 'hidden')
    expect(stickyTop(mount().container)).toBe('0px')
  })

  it('the name bar fixed under the header: the lower of the two (the name bar\'s bottom)', () => {
    header('reveal', 'scrolled')
    place(add('business_name_bar', 'fixed-name'), 'name')
    view.name = () => rect(HEADER, NAME_BAR)
    expect(stickyTop(mount().container)).toBe(`${HEADER + NAME_BAR}px`)
  })

  it('the name bar fixed with the header hidden: the name bar\'s bottom alone', () => {
    header('reveal', 'hidden')
    place(add('business_name_bar', 'fixed-name'), 'name')
    view.name = () => rect(0, NAME_BAR)
    expect(stickyTop(mount().container)).toBe(`${NAME_BAR}px`)
  })

  const kiosk = () => renderWithProviders(<BusinessProductsCategories useKioskApp />, { theme: themeWithValues() }).container

  it('the kiosk: its header is on the page too (everywhere but its home), the categories hang under it', () => {
    header('fixed', 'scrolled')
    expect(stickyTop(kiosk())).toBe(`${HEADER}px`)
  })

  it('the kiosk without a header (its home): the top', () => {
    expect(stickyTop(kiosk())).toBe('0px')
  })

  it('it measures again when the header changes state, without a scroll event', () => {
    const node = header('reveal', 'scrolled')
    const { container } = mount()
    expect(stickyTop(container)).toBe(`${HEADER}px`)
    node.setAttribute('data-scroll-state', 'hidden')
    act(() => { window.dispatchEvent(new Event(HEADER_STATE_EVENT)) })
    expect(stickyTop(container)).toBe('0px')
  })

  it('it measures again when the bar docked under the header changes size, and stops listening when it leaves', () => {
    const node = header('reveal', 'scrolled')
    const { container, unmount } = mount()
    expect(stickyTop(container)).toBe(`${HEADER}px`)
    node.setAttribute('data-scroll-state', 'hidden')
    act(() => { window.dispatchEvent(new Event(HEADER_DOCK_EVENT)) })
    expect(stickyTop(container)).toBe('0px')
    const removed = vi.spyOn(window, 'removeEventListener')
    unmount()
    expect(removed.mock.calls.map(([type]) => type)).toContain(HEADER_DOCK_EVENT)
    removed.mockRestore()
  })
})

// implementation noteswith a revealing header, the bar docked under it (sticky, it goes and comes with it) is part of what
// stays fixed on top: the categories and the scroll to a category hang under both
describe('the header and the bar docked under it (reveal)', () => {
  const DOCK = 118
  const dock = (top) => {
    const el = add('', '')
    el.setAttribute('data-header-dock', '')
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: DOCK })
    el.getBoundingClientRect = () => rect(top, DOCK)
    return el
  }

  it('fixedBarsBottom: the bottom of the bar, under the header, when nothing else is fixed', () => {
    header('reveal')
    dock(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER + DOCK)
  })

  it('fixed: the bar scrolls with the page, only the header counts', () => {
    header('fixed')
    dock(HEADER)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    expect(fixedBarsBottom(title())).toBe(HEADER)
  })

  it('going up: the header and its bar will be back, so both are counted even if they are hidden now', () => {
    scrollY = 3000
    header('reveal', 'hidden')
    dock(-DOCK)
    view.title = () => rect(PAGE_TITLE_TOP - scrollY)
    scrollToCategory(title())
    expect(scrollSpy.mock.calls[0][0].top).toBe(PAGE_TITLE_TOP - (HEADER + DOCK))
  })

  describe('the categories stick under them', () => {
    beforeEach(() => {
      const style = document.createElement('style')
      style.id = 'styles'
      Object.defineProperty(style, 'sheet', { value: { cssRules: [], insertRule: vi.fn(), deleteRule: vi.fn() } })
      document.head.appendChild(style)
    })
    afterEach(() => {
      document.getElementById('styles')?.remove()
    })
    it('--categories-sticky-top is the bottom of the header and its bar', () => {
      header('reveal', 'scrolled')
      dock(HEADER)
      const { container } = renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
      expect(container.querySelector('#category-lists').style.getPropertyValue('--categories-sticky-top')).toBe(`${HEADER + DOCK}px`)
    })
  })
})
