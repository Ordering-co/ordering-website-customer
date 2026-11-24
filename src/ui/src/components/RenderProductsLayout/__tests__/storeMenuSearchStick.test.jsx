import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor } from '../../../styles/__tests__/themeTestUtils'
import { scrollFieldIntoView } from '~ui/hooks/useKeyboardOpen'
import { StoreMenu } from '../StoreMenu'
import { stickBar } from '../useMenuBars'

// implementation noteson a touch screen the search field takes the page to where its bar sticks, so the results are above the
// keyboard; the results keep the height that holds the bar there.

vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 390, height: 844 }) }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ options: { type: 2, moment: null } }, {}] }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: ({ content }) => <div>{content}</div> }))

const products = [
  { id: 11, name: 'Cheeseburger', price: 9, category_id: 1, images: 'a.jpg' },
  { id: 21, name: 'Lemonade', price: 3, category_id: 2, images: 'c.jpg' }
]
const base = {
  categories: [{ id: 1, name: 'Burgers' }, { id: 2, name: 'Drinks' }],
  business: { id: 1 },
  currentCart: {},
  categoryState: { products, loading: false },
  searchValue: '',
  handleChangeSearch: vi.fn(),
  onClickCategory: vi.fn(),
  onProductClick: vi.fn(),
  onProductAdd: vi.fn()
}
const STICKY_TOP = 70
const BARS = ['business-menu-bar', 'business-menu-categories']

describe('the store search on a touch screen', () => {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  let barTop
  const pointer = (coarse) => Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query) => ({ matches: coarse && query === '(pointer: coarse)', media: query, addEventListener () {}, removeEventListener () {} })
  })
  const mount = (props = {}, variant = 'menu') => {
    const view = renderWithProviders(<StoreMenu {...base} variant={variant} {...props} />)
    document.querySelector('[data-doc-section=business-menu]').style.setProperty('--categories-sticky-top', `${STICKY_TOP}px`)
    return view
  }
  const focusSearch = () => act(() => { screen.getByRole('textbox', { name: 'Search Products' }).focus() })
  const results = () => document.querySelector('#businessProductList > div:last-child')

  beforeEach(() => {
    vi.useFakeTimers()
    barTop = 400
    window.scrollBy = vi.fn()
    pointer(true)
    const rect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return BARS.includes(this.getAttribute('data-doc-section')) ? { top: barTop, bottom: barTop + 100, height: 100, left: 0, right: 390, width: 390 } : rect.call(this)
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
    else delete window.matchMedia
  })

  it('scrolls to stick the bar under the header when the field takes the focus and the bar is still down the page', () => {
    mount()
    focusSearch()
    act(() => { vi.advanceTimersByTime(50) })
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
    expect(window.scrollBy).toHaveBeenCalledWith({ top: barTop - STICKY_TOP, behavior: 'instant' })
  })

  it('moves nothing when the bar is already stuck, at the focus or once the keyboard has settled', () => {
    barTop = STICKY_TOP
    mount()
    focusSearch()
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('measures again once the keyboard has settled: a page the browser moved after the first run is stuck without a second jump', () => {
    mount()
    focusSearch()
    act(() => { vi.advanceTimersByTime(50) })
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
    barTop = STICKY_TOP // the page went there
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
  })

  it('does nothing if the focus has left the field when the timers run', () => {
    mount()
    focusSearch()
    act(() => screen.getByRole('textbox', { name: 'Search Products' }).blur())
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('does nothing with a mouse', () => {
    pointer(false)
    mount()
    focusSearch()
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).not.toHaveBeenCalled()
    expect(cssFor(results())).toContain('display:contents')
  })

  it('the showcase: its field opens from the chip with the focus and the page goes to the chips bar', () => {
    mount({}, 'showcase')
    act(() => { screen.getByRole('button', { name: 'Search Products' }).click() })
    act(() => { vi.advanceTimersByTime(50) })
    expect(screen.getByRole('textbox', { name: 'Search Products' })).toHaveFocus()
    expect(window.scrollBy).toHaveBeenCalledWith({ top: barTop - STICKY_TOP, behavior: 'instant' })
  })

  it('a focus that is not the search field (a tab) does not scroll', () => {
    mount()
    act(() => { screen.getAllByRole('tab')[0].focus() })
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('the results keep the height that holds the bar while the field has the focus, and only then', () => {
    const view = mount()
    // no search: the sections have no box of their own, the layout is the one they always had
    expect(cssFor(results())).toContain('display:contents')
    expect(cssFor(results())).not.toContain('min-height')
    focusSearch()
    expect(cssFor(results())).toContain('min-height:calc(var(--visual-viewport-height,100dvh) - var(--categories-sticky-top,0px))')
    act(() => screen.getByRole('textbox', { name: 'Search Products' }).blur())
    expect(cssFor(results())).not.toContain('min-height')
    view.unmount()
    // a search value with the keyboard closed (no focus) looks as it always did
    mount({ searchValue: 'lemon' })
    expect(cssFor(results())).toContain('display:contents')
    expect(cssFor(results())).not.toContain('min-height')
  })

  it('with a mouse the results never get that height, searching or not', () => {
    pointer(false)
    mount({ searchValue: 'lemon' })
    focusSearch()
    expect(cssFor(results())).not.toContain('min-height')
  })

  it('typing does not move the bar again (the first scroll stuck it)', () => {
    mount()
    focusSearch()
    act(() => { vi.advanceTimersByTime(50) })
    barTop = STICKY_TOP
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Products' }), { target: { value: 'lem' } })
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
  })
})

describe('stickBar', () => {
  const root = (top) => { const el = document.createElement('div'); if (top !== undefined) el.style.setProperty('--categories-sticky-top', `${top}px`); return el }
  const bar = (top) => ({ getBoundingClientRect: () => ({ top }) })
  beforeEach(() => { window.scrollBy = vi.fn() })

  it('scrolls the distance to the sticky place, rounded up, instantly', () => {
    stickBar(root(70), bar(400.4))
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 331, behavior: 'instant' })
  })

  it('no sticky top written is the top of the page', () => {
    stickBar(root(), bar(200))
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 200, behavior: 'instant' })
  })

  it('a bar that is stuck (or a pixel off it) or above it stays', () => {
    stickBar(root(70), bar(70))
    stickBar(root(70), bar(71))
    stickBar(root(70), bar(-20))
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('without a bar or a root it does nothing', () => {
    stickBar(null, bar(300))
    stickBar(root(70), null)
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('after it the field is whole in the visible box, and the keyboard hook\'s scrollFieldIntoView has nothing to do', () => {
    // the bar is stuck at 70 and holds the field: the visible area above a 336px keyboard is 508px tall
    const field = { getBoundingClientRect: () => ({ top: 82, bottom: 122 }), getAttribute: () => null, parentElement: null }
    scrollFieldIntoView(field, { offsetTop: 0, height: 508 })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })
})
