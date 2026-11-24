import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders, defaultTheme } from '../../../../../__tests__/helpers/testUtils'
import { AutoScroll, findScrollContainer, scrollableSides } from '../index'

// The scroll container's box (jsdom has no layout): its scrollWidth,
// clientWidth and scrollLeft, per element.
// The test's scroll container (data-testid='scroller') starts from `nextBox`.
const boxes = new WeakMap()
let nextBox = null
const boxOf = (element) => {
  if (!boxes.has(element)) {
    const initial = element.getAttribute?.('data-testid') === 'scroller' && nextBox
    boxes.set(element, { scrollWidth: 0, clientWidth: 0, scrollLeft: 0, ...initial })
  }
  return boxes.get(element)
}
const originals = {}
const stub = (name, setter) => {
  originals[name] = Object.getOwnPropertyDescriptor(Element.prototype, name)
  Object.defineProperty(Element.prototype, name, {
    configurable: true,
    get () { return boxOf(this)[name] },
    ...(setter && { set (value) { boxOf(this)[name] = value } })
  })
}

// A ResizeObserver that the test fires.
let resizeObservers = []
class FakeResizeObserver {
  constructor (callback) { this.callback = callback; this.targets = new Set(); resizeObservers.push(this) }
  observe (target) { this.targets.add(target) }
  unobserve (target) { this.targets.delete(target) }
  disconnect () { this.targets.clear() }
}
const fireResize = () => act(() => {
  resizeObservers.filter(observer => observer.targets.size).forEach(observer => observer.callback([]))
})

const OriginalResizeObserver = global.ResizeObserver
beforeEach(() => {
  stub('scrollWidth')
  stub('clientWidth')
  stub('scrollLeft', true)
  resizeObservers = []
  global.ResizeObserver = FakeResizeObserver
  window.ResizeObserver = FakeResizeObserver
})
afterEach(() => {
  Object.entries(originals).forEach(([name, descriptor]) => {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor)
    else delete Element.prototype[name]
  })
  global.ResizeObserver = OriginalResizeObserver
  window.ResizeObserver = OriginalResizeObserver
  vi.restoreAllMocks()
})

// A carousel in its scroll container (overflow-x: auto), of the given box.
const renderCarousel = ({ scrollWidth, clientWidth, scrollLeft = 0, items = 3, theme, ...props } = {}) => {
  const ui = (count) => (
    <div data-testid='scroller' style={{ overflowX: 'auto' }}>
      <div>
        <AutoScroll scrollId='carousel' {...props}>
          {[...Array(count).keys()].map(i => <div key={i}>item {i}</div>)}
        </AutoScroll>
      </div>
    </div>
  )
  // the box is there before the first measure (a layout effect)
  nextBox = { scrollWidth, clientWidth, scrollLeft }
  const utils = renderWithProviders(ui(items), theme ? { theme } : {})
  nextBox = null
  const container = utils.getByTestId('scroller')
  return {
    ...utils,
    container,
    box: boxOf(container),
    rerenderItems: (count) => utils.rerender(ui(count)),
    previous: () => utils.container.querySelector('.left-autoscroll'),
    next: () => utils.container.querySelector('.right-autoscroll')
  }
}

const isShown = (arrow) => !!arrow && !arrow.classList.contains('hidden')

describe('AutoScroll', () => {
  it('renders children inside the autoscroll container', () => {
    const { getByText } = renderWithProviders(
      <AutoScroll scrollId='test-scroll'>
        <span>scroll child</span>
      </AutoScroll>
    )
    expect(getByText('scroll child')).toBeInTheDocument()
  })

  it('shows no arrows when the content fits', () => {
    const { previous, next, queryByRole } = renderCarousel({ scrollWidth: 300, clientWidth: 300 })
    expect(previous()).toBeNull()
    expect(next()).toBeNull()
    expect(queryByRole('button')).toBeNull()
  })

  it('shows only Next when the content overflows to the right, at the start', () => {
    const { previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300 })
    expect(isShown(next())).toBe(true)
    expect(isShown(previous())).toBe(false)
  })

  it('a pixel of rounding is no overflow', () => {
    const { next } = renderCarousel({ scrollWidth: 301, clientWidth: 300 })
    expect(next()).toBeNull()
  })

  it('shows Previous after scrolling, and hides Next at the end', () => {
    const { container, box, previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300 })
    box.scrollLeft = 150
    fireEvent.scroll(container)
    expect(isShown(previous())).toBe(true)
    expect(isShown(next())).toBe(true)
    box.scrollLeft = 300
    fireEvent.scroll(container)
    expect(isShown(previous())).toBe(true)
    expect(isShown(next())).toBe(false)
    // within a pixel of the end: the end
    box.scrollLeft = 299.5
    fireEvent.scroll(container)
    expect(isShown(next())).toBe(false)
  })

  it('going back within a pixel of the start lands on it, leaving it does not', () => {
    const { container, box, previous } = renderCarousel({ scrollWidth: 600, clientWidth: 300 })
    box.scrollLeft = 0.5
    fireEvent.scroll(container)
    expect(box.scrollLeft).toBe(0.5)
    box.scrollLeft = 150
    fireEvent.scroll(container)
    box.scrollLeft = 0.5
    fireEvent.scroll(container)
    expect(box.scrollLeft).toBe(0)
    expect(isShown(previous())).toBe(false)
  })

  it('updates on a resize of the container or its content', () => {
    const { box, previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300 })
    expect(isShown(next())).toBe(true)
    // wider container: it all fits
    box.clientWidth = 600
    fireResize()
    expect(next()).toBeNull()
    expect(previous()).toBeNull()
    // the content grows (an image loads): it overflows again
    box.scrollWidth = 900
    fireResize()
    expect(isShown(next())).toBe(true)
  })

  it('updates when an image of an item loads', () => {
    const { box, next, getByText } = renderCarousel({ scrollWidth: 300, clientWidth: 300 })
    expect(next()).toBeNull()
    box.scrollWidth = 700
    act(() => { getByText('item 0').dispatchEvent(new Event('load')) })
    expect(isShown(next())).toBe(true)
  })

  it('updates when the items change', async () => {
    const { box, next, rerenderItems } = renderCarousel({ scrollWidth: 300, clientWidth: 300, items: 2 })
    expect(next()).toBeNull()
    box.scrollWidth = 900
    rerenderItems(6)
    await waitFor(() => expect(isShown(next())).toBe(true))
  })

  it('reads RTL: scrollLeft 0 at the start (right), negative toward the left', () => {
    const theme = { ...defaultTheme, rtl: true }
    const { container, box, previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300, theme })
    // at the start: only the left side has more
    expect(isShown(previous())).toBe(true)
    expect(isShown(next())).toBe(false)
    box.scrollLeft = -150
    fireEvent.scroll(container)
    expect(isShown(previous())).toBe(true)
    expect(isShown(next())).toBe(true)
    box.scrollLeft = -300
    fireEvent.scroll(container)
    expect(isShown(previous())).toBe(false)
    expect(isShown(next())).toBe(true)
  })

  it('hands the focus to the other arrow when the focused one hides', () => {
    const { container, box, previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300, scrollLeft: 150 })
    next().focus()
    expect(document.activeElement).toBe(next())
    box.scrollLeft = 300
    fireEvent.scroll(container)
    expect(isShown(next())).toBe(false)
    expect(document.activeElement).toBe(previous())
  })

  it('fires onHandleRightEnd once when the end is reached', () => {
    const onHandleRightEnd = vi.fn()
    const { container, box } = renderCarousel({ scrollWidth: 600, clientWidth: 300, onHandleRightEnd })
    box.scrollLeft = 300
    fireEvent.scroll(container)
    fireEvent.scroll(container)
    expect(onHandleRightEnd).toHaveBeenCalledTimes(1)
  })

  it('skips controls in column mode', () => {
    const { previous, next } = renderCarousel({ scrollWidth: 600, clientWidth: 300, isColumnMode: true })
    expect(previous()).toBeNull()
    expect(next()).toBeNull()
  })

  it('its arrows are buttons with a name that scroll from the keyboard too', () => {
    const { container, getByRole } = renderCarousel({ scrollWidth: 600, clientWidth: 300, scrollLeft: 150 })
    container.scrollBy = vi.fn()
    const previous = getByRole('button', { name: 'Previous' })
    const next = getByRole('button', { name: 'Next' })
    expect(previous).toHaveAttribute('type', 'button')
    // a click without a pointer (Enter / Space) scrolls
    fireEvent.click(next, { detail: 0 })
    expect(container.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }))
    fireEvent.mouseDown(previous)
    expect(container.scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -200 }))
  })
})

describe('findScrollContainer', () => {
  it('is the nearest ancestor that clips horizontally', () => {
    const outer = document.createElement('div')
    outer.style.overflowX = 'auto'
    const middle = document.createElement('div')
    const inner = document.createElement('span')
    outer.appendChild(middle)
    middle.appendChild(inner)
    document.body.appendChild(outer)
    expect(findScrollContainer(inner)).toBe(outer)
    outer.remove()
  })

  it('falls back to the grandparent without one', () => {
    const outer = document.createElement('div')
    const middle = document.createElement('div')
    const inner = document.createElement('span')
    outer.appendChild(middle)
    middle.appendChild(inner)
    expect(findScrollContainer(inner)).toBe(outer)
  })
})

describe('scrollableSides', () => {
  it('reads the legacy RTL model (positive, its maximum at the start)', () => {
    expect(scrollableSides({ scrollWidth: 600, clientWidth: 300, scrollLeft: 300 }, true)).toEqual({ left: true, right: false })
    expect(scrollableSides({ scrollWidth: 600, clientWidth: 300, scrollLeft: 100 }, true)).toEqual({ left: true, right: true })
  })

  it('nothing without a container', () => {
    expect(scrollableSides(null, false)).toEqual({ left: false, right: false })
  })
})
