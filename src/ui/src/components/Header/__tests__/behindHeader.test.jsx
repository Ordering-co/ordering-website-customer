import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIDEBAR_MENU_ID } from '../../SidebarMenu/menuId'
import { focusHeaderEntry, watchBehindHeader } from '../behindHeader'

// What the observer says about a node, as the browser does: the rect and the root's (the viewport under the header)
class FakeObserver {
  static live = []
  constructor (callback) { this.callback = callback; FakeObserver.live.push(this) }
  observe () {}
  disconnect () {}
}
const report = (rect, isIntersecting = false) =>
  FakeObserver.live.at(-1).callback([{ isIntersecting, boundingClientRect: rect, rootBounds: { top: 64 } }])

describe('watchBehindHeader', () => {
  afterEach(() => {
    FakeObserver.live = []
    vi.unstubAllGlobals()
  })
  const watch = () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const onChange = vi.fn()
    const stop = watchBehindHeader(document.createElement('h1'), onChange)
    return { onChange, stop }
  }

  it('a node that left the view upwards is behind the header; one below the view, or in it, is not', () => {
    const { onChange, stop } = watch()
    report({ top: -40, width: 300, height: 30 })
    expect(onChange).toHaveBeenLastCalledWith(true)
    report({ top: 900, width: 300, height: 30 })
    expect(onChange).toHaveBeenLastCalledWith(false)
    report({ top: 100, width: 300, height: 30 }, true)
    expect(onChange).toHaveBeenLastCalledWith(false)
    stop()
  })

  it('a node with no box (display: none, or no size) is not behind the header: it has no place on the page', () => {
    const { onChange, stop } = watch()
    // what the browser reports for display: none: an all-zero rect
    report({ top: 0, width: 0, height: 0 })
    expect(onChange).toHaveBeenLastCalledWith(false)
    report({ top: -40, width: 300, height: 0 })
    expect(onChange).toHaveBeenLastCalledWith(false)
    stop()
  })
})

describe('focusHeaderEntry', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('without a logo, the focus goes to the button that controls the sidebar menu (its shared id)', () => {
    document.body.innerHTML = `<div data-app-header><button type="button">Other</button><button type="button" aria-controls="${SIDEBAR_MENU_ID}">Menu</button></div>`
    focusHeaderEntry()
    expect(document.activeElement).toHaveTextContent('Menu')
    expect(SIDEBAR_MENU_ID).toBe('sidebar_menu')
  })
})
