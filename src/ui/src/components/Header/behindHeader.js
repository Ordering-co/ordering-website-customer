import { SIDEBAR_MENU_ID } from '~ui/src/components/SidebarMenu/menuId'
import { HEADER_SELECTOR } from './scrollBehavior'

// The header's slot for the store's back arrow and name (implementation notes, fixed
// header): the store page portals them into it from BusinessStickyHeader, and
// the header's logo gives its place up while the slot has something in it
export const HEADER_STORE_SLOT_ATTRIBUTE = 'data-header-store-slot'
export const HEADER_STORE_SLOT_SELECTOR = `[${HEADER_STORE_SLOT_ATTRIBUTE}]`

// The header's logo button: where the focus goes when the store's back arrow,
// which had it in the slot, leaves (BusinessStickyHeader)
export const HEADER_LOGO_ATTRIBUTE = 'data-header-logo'

/**
 * Gives the focus to the header's way in: its logo, or the menu button when
 * it has none (the two are the row's first controls).
 */
export const focusHeaderEntry = () => {
  const header = document.querySelector(HEADER_SELECTOR)
  const entry = header?.querySelector(`[${HEADER_LOGO_ATTRIBUTE}]`) || header?.querySelector(`[aria-controls='${SIDEBAR_MENU_ID}']`)
  entry?.focus({ preventScroll: true })
}

/**
 * Calls `onChange(true | false)` whenever `node` goes behind the header (it
 * left the view upwards, under what the header covers) or comes back. The
 * observer's top margin is the header's own height, read now and again when
 * the window resizes (it wraps): no px of ours. A node below the viewport, or one
 * with no box (display: none, no size), is not behind it. Returns the function that stops watching; without
 * IntersectionObserver there is nothing to watch.
 */
export const watchBehindHeader = (node, onChange) => {
  if (!node || typeof IntersectionObserver === 'undefined') return () => {}
  let observer
  const watch = () => {
    observer?.disconnect()
    const height = document.querySelector(HEADER_SELECTOR)?.offsetHeight || 0
    observer = new IntersectionObserver(([entry]) => {
      const rect = entry.boundingClientRect
      // a node with no box (display: none, no size) has no place to be behind
      const hasBox = !rect || (rect.width !== 0 && rect.height !== 0)
      const above = !rect || rect.top < (entry.rootBounds?.top ?? 0)
      onChange(hasBox && !entry.isIntersecting && above)
    }, { rootMargin: `-${height}px 0px 0px 0px` })
    observer.observe(node)
  }
  watch()
  window.addEventListener('resize', watch)
  return () => {
    window.removeEventListener('resize', watch)
    observer.disconnect()
  }
}
