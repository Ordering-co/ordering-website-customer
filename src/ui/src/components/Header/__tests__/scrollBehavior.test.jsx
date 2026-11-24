import React, { useRef } from 'react'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Header, HEADER_LAYER } from '../styles'
import {
  HEADER_DOCK_ATTRIBUTE, HEADER_DOCK_EVENT, HEADER_OFFSET_VAR, HEADER_STATE_EVENT, HEADER_SCROLL_FIXED, HEADER_SCROLL_REVEAL, HEADER_STATE_HIDDEN, HEADER_STATE_SCROLLED, HEADER_STATE_TOP,
  headerScrollBehavior, headerVisibleBottom, nextHeaderState, useHeaderScroll
} from '../scrollBehavior'
import { injectedCss, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themedScroll } from './scrollTheme'

const HEIGHT = 70

// The motion header.base will have (implementation notes asks for it in the schema): the engine's own transition for it
const motion = vi.hoisted(() => ({ on: false }))
vi.mock('~/utils/themeMotion', async (original) => {
  const real = await original()
  const { transition } = await import('@orderingco/ordering-theme-engine/css')
  return {
    ...real,
    motionCss: (theme, component, properties) =>
      motion.on && component === 'header' ? transition({ ms: 200, easing: 'ease' }, properties) : real.motionCss(theme, component, properties)
  }
})

// The real header's row: the styled box with the hook, as Header/index.js wires them
const Row = ({ behavior }) => {
  const ref = useRef(null)
  useHeaderScroll(ref, behavior)
  return <Header ref={ref} data-app-header='' data-scroll-behavior={behavior}>Brand<button type='button'>Menu</button></Header>
}

let frames = []
let scrollY = 0
let reduced = false
const scrollTo = (y) => {
  scrollY = y
  act(() => {
    window.dispatchEvent(new Event('scroll'))
    const run = frames
    frames = []
    run.forEach((tick) => tick(0))
  })
}
const mount = (scroll) => {
  const theme = themedScroll(scroll)
  const view = renderWith(theme, <Row behavior={headerScrollBehavior(theme)} />)
  return { ...view, node: view.getByText('Brand'), button: view.getByText('Menu') }
}
const offset = () => document.documentElement.style.getPropertyValue(HEADER_OFFSET_VAR)

beforeEach(() => {
  frames = []
  scrollY = 0
  reduced = false
  motion.on = false
  vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => HEIGHT })
  window.matchMedia = (query) => ({ matches: reduced && query.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete HTMLElement.prototype.offsetHeight
  delete window.scrollY
})

describe('headerScrollBehavior', () => {
  it('is fixed unless the theme says reveal (missing and unknown values included)', () => {
    expect(headerScrollBehavior(themedScroll('reveal'))).toBe(HEADER_SCROLL_REVEAL)
    expect(headerScrollBehavior(themedScroll('fixed'))).toBe(HEADER_SCROLL_FIXED)
    expect(headerScrollBehavior(themedScroll(undefined))).toBe(HEADER_SCROLL_FIXED)
    expect(headerScrollBehavior(themedScroll('sideways'))).toBe(HEADER_SCROLL_FIXED)
    expect(headerScrollBehavior(themedScroll(null))).toBe(HEADER_SCROLL_FIXED)
  })
})

describe('nextHeaderState', () => {
  const at = (behavior, y, lastY, state = HEADER_STATE_TOP, focused = false) =>
    nextHeaderState({ behavior, y, lastY, height: HEIGHT, state, focused })

  it('is top at the top of the page, in both behaviors (and on an overscroll)', () => {
    expect(at(HEADER_SCROLL_FIXED, 0, 40)).toBe(HEADER_STATE_TOP)
    expect(at(HEADER_SCROLL_REVEAL, -20, 0)).toBe(HEADER_STATE_TOP)
  })

  it('fixed is scrolled over any scrolled page, going down or up', () => {
    expect(at(HEADER_SCROLL_FIXED, 500, 100)).toBe(HEADER_STATE_SCROLLED)
    expect(at(HEADER_SCROLL_FIXED, 100, 500)).toBe(HEADER_STATE_SCROLLED)
  })

  it('reveal stays while the page has not gone past the header\'s height, then hides going down', () => {
    expect(at(HEADER_SCROLL_REVEAL, HEIGHT, 10)).toBe(HEADER_STATE_SCROLLED)
    expect(at(HEADER_SCROLL_REVEAL, HEIGHT + 1, HEIGHT, HEADER_STATE_SCROLLED)).toBe(HEADER_STATE_HIDDEN)
  })

  it('reveal comes back at any move up, and keeps hidden while the page does not move', () => {
    expect(at(HEADER_SCROLL_REVEAL, 499, 500, HEADER_STATE_HIDDEN)).toBe(HEADER_STATE_SCROLLED)
    expect(at(HEADER_SCROLL_REVEAL, 500, 500, HEADER_STATE_HIDDEN)).toBe(HEADER_STATE_HIDDEN)
  })

  it('focus inside shows the header', () => {
    expect(at(HEADER_SCROLL_REVEAL, 600, 500, HEADER_STATE_HIDDEN, true)).toBe(HEADER_STATE_SCROLLED)
  })
})

describe('the header on a page that scrolls', () => {
  it('fixed: sticky on top, the shadow only over a scrolled page, never hidden', () => {
    const { node } = mount('fixed')
    expect(node).toHaveAttribute('data-scroll-behavior', 'fixed')
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_TOP)
    const css = injectedCss()
    expect(css).toContain('position:sticky;top:0;')
    expect(css).toContain(`z-index:${HEADER_LAYER};`)
    // the shadow is declared only for the scrolled state
    expect(css).toMatch(/\[data-scroll-state='scrolled'\]::after\{box-shadow:0px/)
    expect(offset()).toBe(`${HEIGHT}px`)

    scrollTo(30)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    scrollTo(900)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    expect(offset()).toBe(`${HEIGHT}px`)
    scrollTo(0)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_TOP)
  })

  it('reveal: hides going down past its height, comes back going up, in flow and with no shadow at the top', () => {
    const { node } = mount('reveal')
    expect(node).toHaveAttribute('data-scroll-behavior', 'reveal')
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_TOP)
    expect(offset()).toBe(`${HEIGHT}px`)
    expect(injectedCss()).toContain("[data-scroll-state='hidden']{-webkit-transform:translateY(-100%)")

    scrollTo(40)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    expect(offset()).toBe(`${HEIGHT}px`)
    scrollTo(300)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_HIDDEN)
    expect(offset()).toBe('0px')
    scrollTo(280)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    expect(offset()).toBe(`${HEIGHT}px`)
    scrollTo(400)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_HIDDEN)
    scrollTo(0)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_TOP)
    expect(offset()).toBe(`${HEIGHT}px`)
  })

  it('reveal: the keyboard focus inside a hidden header shows it, and it stays while the focus stays', () => {
    const { node, button } = mount('reveal')
    scrollTo(300)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_HIDDEN)
    act(() => { button.focus() })
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    expect(offset()).toBe(`${HEIGHT}px`)
    scrollTo(500)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_SCROLLED)
    // the focus leaves: the next scroll down hides it again
    act(() => { button.blur() })
    scrollTo(600)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_HIDDEN)
  })

  it('reveal: a focus that is not the keyboard\'s (a click with the mouse left it on a button) does not keep the header on view', () => {
    const { node, button } = mount('reveal')
    // jsdom has no focus-visible heuristic: a click leaves :focus-visible false
    const matches = Element.prototype.matches
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (selector) {
      return selector === ':focus-visible' ? false : matches.call(this, selector)
    })
    act(() => { button.focus() })
    scrollTo(300)
    expect(node).toHaveAttribute('data-scroll-state', HEADER_STATE_HIDDEN)
    expect(offset()).toBe('0px')
  })

  it('tells the page when its state changes, not on every scroll', () => {
    const changed = vi.fn()
    window.addEventListener(HEADER_STATE_EVENT, changed)
    mount('reveal')
    changed.mockClear()
    scrollTo(300)
    expect(changed).toHaveBeenCalledTimes(1)
    scrollTo(320)
    expect(changed).toHaveBeenCalledTimes(1)
    scrollTo(310)
    expect(changed).toHaveBeenCalledTimes(2)
    window.removeEventListener(HEADER_STATE_EVENT, changed)
  })

  it('takes its listener and its variable away when it leaves the page', () => {
    const { unmount } = mount('fixed')
    expect(offset()).toBe(`${HEIGHT}px`)
    unmount()
    expect(offset()).toBe('')
  })

  it('stops listening to the page when it leaves: a scroll afterwards schedules nothing', () => {
    const { unmount } = mount('reveal')
    // listening: a scroll asks for a frame
    act(() => { window.dispatchEvent(new Event('scroll')) })
    expect(frames).toHaveLength(1)
    frames = []
    unmount()
    act(() => { window.dispatchEvent(new Event('scroll')) })
    act(() => { window.dispatchEvent(new Event(HEADER_DOCK_EVENT)) })
    expect(frames).toHaveLength(0)
  })

  it('moves by the header\'s motion in the theme, and only where the system does not reduce motion', () => {
    motion.on = true
    mount('reveal')
    const css = injectedCss()
    // header.base has no `animated` yet (without it the helper answers `transition: none`); the declaration the
    // helper gives is inside the media query, never bare
    expect(css).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{\.[\w-]+\{[^}]*transition:transform 200ms ease/)
    expect(css.replace(/@media[^{]*\{[^{}]*\{[^}]*\}\}/g, '')).not.toContain('transform 200ms')
  })

  it('moves at once while the theme gives the header no motion', () => {
    mount('reveal')
    expect(injectedCss()).toContain('transition:none;')
  })
})

describe('headerVisibleBottom', () => {
  const place = (node, top) => { node.getBoundingClientRect = () => ({ top, bottom: top + HEIGHT }) }

  it('is 0 without a header on the page', () => {
    expect(headerVisibleBottom()).toBe(0)
  })

  it('is the height of a pegged header, and 0 while it is hidden', () => {
    const { node } = mount('reveal')
    place(node, 0)
    expect(headerVisibleBottom()).toBe(HEIGHT)
    scrollTo(300)
    expect(headerVisibleBottom()).toBe(0)
    scrollTo(290)
    // sliding back in: the transform is still on its way, the header already counts
    place(node, -HEIGHT + 10)
    expect(headerVisibleBottom()).toBe(HEIGHT)
  })

  it('counts a fixed header at any scroll', () => {
    const { node } = mount('fixed')
    place(node, 0)
    scrollTo(900)
    expect(headerVisibleBottom()).toBe(HEIGHT)
  })
})

// implementation noteswith a revealing header the bar docked under it (sticky, same motion) covers the page too: what the
// header covers is the bottom of both while it is pegged and in view
describe('the bar docked under a revealing header', () => {
  const DOCK = 118
  // `top` where the page has it: pegged (the header's bottom), or further down in the flow
  const dock = (top, height = DOCK) => {
    const bar = document.createElement('div')
    bar.setAttribute(HEADER_DOCK_ATTRIBUTE, '')
    Object.defineProperty(bar, 'offsetHeight', { configurable: true, get: () => height })
    bar.getBoundingClientRect = () => ({ top, bottom: top + height })
    document.body.appendChild(bar)
    return bar
  }
  const place = (node, top) => { node.getBoundingClientRect = () => ({ top, bottom: top + HEIGHT }) }
  afterEach(() => { document.querySelectorAll(`[${HEADER_DOCK_ATTRIBUTE}]`).forEach((bar) => bar.remove()) })

  it('reveal: the header\'s offset and its visible bottom are the bottom of the header and the bar', () => {
    dock(HEIGHT)
    const { node } = mount('reveal')
    place(node, 0)
    expect(offset()).toBe(`${HEIGHT + DOCK}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT + DOCK)
  })

  it('reveal: both leave with the header, and the bar counts again when it comes back', () => {
    dock(HEIGHT)
    const { node } = mount('reveal')
    scrollTo(300)
    expect(offset()).toBe('0px')
    expect(headerVisibleBottom()).toBe(0)
    scrollTo(290)
    place(node, 0)
    expect(offset()).toBe(`${HEIGHT + DOCK}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT + DOCK)
  })

  it('reveal: a bar still in the flow below the header (not pegged), or gone up out of view, does not count', () => {
    const bar = dock(HEIGHT + 40)
    const { node } = mount('reveal')
    place(node, 0)
    expect(offset()).toBe(`${HEIGHT}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT)
    bar.getBoundingClientRect = () => ({ top: -DOCK, bottom: 0 })
    scrollTo(1)
    expect(offset()).toBe(`${HEIGHT}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT)
  })

  it('fixed: the bar is in the flow, only the header counts', () => {
    dock(HEIGHT)
    const { node } = mount('fixed')
    place(node, 0)
    expect(offset()).toBe(`${HEIGHT}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT)
  })

  it('reveal: the bar still sliding back in under the returning header counts (its transform does not decide)', () => {
    // mid-transition the bar is 250px up: its box (rect) is out of view, its place in the layout is pegged
    vi.stubGlobal('DOMMatrixReadOnly', class { constructor (value) { this.m42 = Number(/,\s*(-?[\d.]+)\)$/.exec(value)[1]) } })
    const bar = dock(HEIGHT - 250)
    bar.style.transform = 'matrix(1, 0, 0, 1, 0, -250)'
    const { node } = mount('reveal')
    place(node, 0)
    expect(offset()).toBe(`${HEIGHT + DOCK}px`)
    expect(headerVisibleBottom()).toBe(HEIGHT + DOCK)
  })

  it('measures again when the bar appears or changes size', () => {
    mount('reveal')
    expect(offset()).toBe(`${HEIGHT}px`)
    dock(HEIGHT)
    act(() => {
      window.dispatchEvent(new Event(HEADER_DOCK_EVENT))
      const run = frames
      frames = []
      run.forEach((tick) => tick(0))
    })
    expect(offset()).toBe(`${HEIGHT + DOCK}px`)
  })
})
