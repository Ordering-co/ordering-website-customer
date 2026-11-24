import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installViewportResync } from '../viewportResync'

const ORIGINAL = 'width=device-width, initial-scale=1, interactive-widget=resizes-content'
const root = document.documentElement
const define = (target, name, get) => Object.defineProperty(target, name, { configurable: true, get })

describe('installViewportResync', () => {
  let meta
  let uninstall
  let layout // what the layout viewport reads
  let metaWrites
  let coarse
  let scale
  let fixOnNudge

  const flush = () => vi.advanceTimersByTime(50) // frames (16ms) of the nudge
  const turn = () => window.dispatchEvent(new Event('resize'))

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    meta = document.createElement('meta')
    meta.name = 'viewport'
    meta.content = ORIGINAL
    document.head.appendChild(meta)
    metaWrites = []
    const setAttribute = meta.setAttribute.bind(meta)
    meta.setAttribute = (name, value) => {
      metaWrites.push(value)
      setAttribute(name, value)
      if (value !== ORIGINAL && fixOnNudge) layout = { width: 669, height: 749 }
    }
    coarse = true
    scale = 1
    fixOnNudge = false
    layout = { width: 871, height: 547 } // stale: the window is already 669x749
    define(window, 'innerWidth', () => 669)
    define(window, 'innerHeight', () => 749)
    define(root, 'clientWidth', () => layout.width)
    define(root, 'clientHeight', () => layout.height)
    window.matchMedia = vi.fn((query) => ({ matches: query === '(pointer: coarse)' ? coarse : false }))
    define(window, 'visualViewport', () => Object.assign(new EventTarget(), { get scale () { return scale } }))
  })

  afterEach(() => {
    uninstall?.()
    uninstall = undefined
    meta.remove()
    root.removeAttribute('data-keyboard-open')
    root.removeAttribute('data-text-entry')
    delete root.clientWidth
    delete root.clientHeight
    vi.useRealTimers()
  })

  const install = () => { uninstall = installViewportResync({ win: window }) }

  it('on a mismatch rewrites the meta viewport and restores the exact original', () => {
    install()
    turn()
    expect(metaWrites).toEqual([`${ORIGINAL}, maximum-scale=10`])
    flush()
    expect(metaWrites).toEqual([`${ORIGINAL}, maximum-scale=10`, ORIGINAL])
    expect(meta.getAttribute('content')).toBe(ORIGINAL)
  })

  it('stops once the layout matches: no reflow after the meta step fixed it', () => {
    install()
    const display = vi.spyOn(root.style, 'display', 'set')
    fixOnNudge = true
    turn()
    flush()
    expect(display).not.toHaveBeenCalled()
  })

  it('when the meta step does not fix it, forces one reflow of html and restores its display', () => {
    root.style.display = 'block'
    install()
    const display = vi.spyOn(root.style, 'display', 'set')
    turn()
    flush()
    expect(display.mock.calls.map(([value]) => value)).toEqual(['none', 'block'])
    root.style.display = ''
  })

  it('does nothing when the window and the layout viewport agree (tolerance 2px)', () => {
    layout = { width: 671, height: 747 }
    install()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toEqual([])
  })

  it.each(['data-keyboard-open', 'data-text-entry'])('does nothing while html has %s', (attribute) => {
    root.setAttribute(attribute, '')
    install()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toEqual([])
  })

  it('does nothing while the page is pinch-zoomed', () => {
    scale = 2
    install()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toEqual([])
  })

  it('does not install with a fine pointer (desktop)', () => {
    coarse = false
    install()
    expect(uninstall).toBeUndefined()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toEqual([])
  })

  it('installs once', () => {
    install()
    expect(installViewportResync({ win: window })).toBeUndefined()
  })

  it('does not loop: one cycle for a window size, the retries at 300ms and 1000ms do not repeat it', () => {
    install()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toHaveLength(2)
    turn() // the same size again, still stale
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toHaveLength(2)
  })

  it('a new window size gets its own cycle', () => {
    install()
    turn()
    vi.advanceTimersByTime(2000)
    define(window, 'innerWidth', () => 871)
    define(window, 'innerHeight', () => 547)
    layout = { width: 669, height: 749 }
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toHaveLength(4)
  })

  it('a height-only difference (Safari collapsing its toolbar on scroll) is left alone', () => {
    layout = { width: 669, height: 700 }
    install()
    turn()
    vi.advanceTimersByTime(2000)
    expect(metaWrites).toEqual([])
  })

  it('checks again after the event: a mismatch that appears at 300ms is repaired', () => {
    layout = { width: 669, height: 749 }
    install()
    turn()
    expect(metaWrites).toEqual([])
    layout = { width: 871, height: 547 }
    vi.advanceTimersByTime(300)
    expect(metaWrites[0]).toBe(`${ORIGINAL}, maximum-scale=10`)
  })
})
