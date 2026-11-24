import { useEffect } from 'react'
import { themeValue } from '~/utils/themeTokens'

// How the header behaves when the page scrolls, one value for
// the phone and the desktop: components.header.base.scroll_behavior.
//   fixed  (default): the header's row is sticky on top, always there
//   reveal: it hides going down past its own height and comes back going up
export const HEADER_SCROLL_FIXED = 'fixed'
export const HEADER_SCROLL_REVEAL = 'reveal'

// Where the header is: at the top of the page, pegged over a scrolled page,
// or (reveal only) out of view
export const HEADER_STATE_TOP = 'top'
export const HEADER_STATE_SCROLLED = 'scrolled'
export const HEADER_STATE_HIDDEN = 'hidden'

// What the header covers right now, in px, on the root (0 while it is hidden):
// a bar that docks under the header reads var(--header-offset, 0px). With a
// revealing header it is the bottom of the header and of the bar docked under
// it, while that one is pegged and in view
export const HEADER_OFFSET_VAR = '--header-offset'

// Fired on `window` when the header's state changes (a bar that sticks under
// it measures again: its own scroll handler runs before the header's frame)
export const HEADER_STATE_EVENT = 'header-scroll-state'

// The bar docked under a revealing header (OrderContextUI isDocked) carries
// it; it tells the header when it appears, goes or changes size, on `window`
export const HEADER_DOCK_ATTRIBUTE = 'data-header-dock'
export const HEADER_DOCK_EVENT = 'header-dock-change'

// The header's root carries it (a stable hook for CSS and for code that measures it)
export const HEADER_ATTRIBUTE = 'data-app-header'
export const HEADER_SELECTOR = `[${HEADER_ATTRIBUTE}]`

// An unknown or missing value is `fixed`
export const headerScrollBehavior = (theme) =>
  themeValue(theme, 'header', 'base.scroll_behavior') === HEADER_SCROLL_REVEAL ? HEADER_SCROLL_REVEAL : HEADER_SCROLL_FIXED

/**
 * The header's state after the page moved to `y` from `lastY`. Reveal hides
 * once the page is past the header's own height (no px of its own: that is
 * the threshold) going down and shows it at any move up, or while the
 * keyboard's focus is inside it; a page that did not move keeps the state.
 */
export const nextHeaderState = ({ behavior, y, lastY, height, state, focused = false }) => {
  if (y <= 0) return HEADER_STATE_TOP
  if (behavior !== HEADER_SCROLL_REVEAL || focused) return HEADER_STATE_SCROLLED
  if (y > lastY && y > height) return HEADER_STATE_HIDDEN
  if (y < lastY) return HEADER_STATE_SCROLLED
  return state === HEADER_STATE_HIDDEN ? HEADER_STATE_HIDDEN : HEADER_STATE_SCROLLED
}

// The bar docked under a revealing header (sticky: it goes and comes with the
// header); with a fixed header it scrolls with the page, so it is none
const dockNode = (header) =>
  header.getAttribute('data-scroll-behavior') === HEADER_SCROLL_REVEAL ? document.querySelector(`[${HEADER_DOCK_ATTRIBUTE}]`) : null

// Its height while it is pegged under `headerBottom` and in view; 0 when it is
// in the flow lower down or out of view above. Decided by where the bar sits in
// the layout: its box (getBoundingClientRect) carries the transform of its slide
// with the header, and halfway through the slide back it would read as gone.
const dockedBarHeight = (header, headerBottom) => {
  const dock = dockNode(header)
  if (!dock) return 0
  const { top, bottom } = dock.getBoundingClientRect()
  const transform = window.getComputedStyle(dock).transform
  const slide = transform && transform !== 'none' && typeof DOMMatrixReadOnly !== 'undefined' ? new DOMMatrixReadOnly(transform).m42 : 0
  return Math.round(top - slide) <= headerBottom && bottom - slide > headerBottom ? dock.offsetHeight : 0
}

/** What a revealing header covers once it is back: its height and its bar's (the box, wherever it is now). */
export const headerBlockHeight = (header) => header.offsetHeight + (dockNode(header)?.offsetHeight ?? 0)

/**
 * The bottom edge (viewport px) of the header while it is pegged on top and
 * visible, 0 while it is hidden or not on the page: what a scroll to an
 * element must leave free, with a revealing header the bar docked under it
 * included (dockedBarHeight). Read at the moment of the scroll. It adds the
 * layout height to the position, not the box's bottom, so a header still
 * sliding in (a transform in motion) counts as there.
 */
export const headerVisibleBottom = () => {
  const node = document.querySelector(HEADER_SELECTOR)
  if (!node || node.getAttribute('data-scroll-state') === HEADER_STATE_HIDDEN) return 0
  const bottom = Math.max(0, node.getBoundingClientRect().top) + node.offsetHeight
  return bottom + dockedBarHeight(node, bottom)
}

/**
 * Keeps `data-scroll-state` on the header's node and HEADER_OFFSET_VAR on the
 * root up to date from the page's scroll (passive listener, once per frame).
 * Written on the DOM, not in state: a scroll does not render the header.
 */
export const useHeaderScroll = (ref, behavior) => {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const root = document.documentElement
    let lastY = window.scrollY
    let frame = 0
    const apply = () => {
      frame = 0
      // keyboard focus inside keeps it on view; a click with the mouse leaves
      // the focus on a button too, and that one lets it hide
      const active = document.activeElement
      const focused = node.contains(active) && active.matches(':focus-visible')
      const y = window.scrollY
      const height = node.offsetHeight
      const state = nextHeaderState({ behavior, y, lastY, height, state: node.getAttribute('data-scroll-state'), focused })
      lastY = y
      const changed = state !== node.getAttribute('data-scroll-state')
      node.setAttribute('data-scroll-state', state)
      root.style.setProperty(HEADER_OFFSET_VAR, `${state === HEADER_STATE_HIDDEN ? 0 : height + dockedBarHeight(node, height)}px`)
      if (changed) window.dispatchEvent(new Event(HEADER_STATE_EVENT))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener(HEADER_DOCK_EVENT, schedule)
    node.addEventListener('focusin', apply)
    // the header's height changes (a wrapped row, the order context moving in) or the bar docked under it does
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    observer?.observe(node)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener(HEADER_DOCK_EVENT, schedule)
      node.removeEventListener('focusin', apply)
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      root.style.removeProperty(HEADER_OFFSET_VAR)
    }
  }, [ref, behavior])
}
