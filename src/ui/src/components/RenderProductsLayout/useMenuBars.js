import { useEffect, useRef, useState } from 'react'

import { activeCategoryId } from '~ui/src/components/BusinessProductsCategories/scrollToCategory'
import { SETTLE_MS, touchInput } from '~ui/hooks/useKeyboardOpen'
import { HEADER_DOCK_EVENT, HEADER_STATE_EVENT, headerVisibleBottom } from '~ui/src/components/Header/scrollBehavior'

// The category the page is reading (the one under the fixed bars), kept while the page scrolls, the header
// comes or goes and the window changes size.
export const useActiveCategory = (ids) => {
  const [active, setActive] = useState(null)
  const key = ids.join()
  useEffect(() => {
    // a frame later: the bars that answer the same event (the sticky top, a revealing header) have moved by then
    // (one pending frame at a time, cancelled when the layout goes)
    let frame = null
    const update = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        setActive(activeCategoryId(ids))
      })
    }
    update()
    // the name bar fixes or frees itself after the scroll event (a revealing header): measure again then
    const name = document.getElementById('business_name_bar')
    const observer = name && typeof MutationObserver === 'function' ? new MutationObserver(update) : null
    observer?.observe(name, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.addEventListener(HEADER_STATE_EVENT, update)
    window.addEventListener(HEADER_DOCK_EVENT, update)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener(HEADER_STATE_EVENT, update)
      window.removeEventListener(HEADER_DOCK_EVENT, update)
    }
  }, [key])
  return active
}

// What the bars stick under: the header while it is on view and the business name once it is fixed (what the
// groceries list does for its own box). It is written on `root` (`--categories-sticky-top`, which the bars and
// the lists read) and `bar` gets `is-stuck` once it touches them (its shadow).
export const useStickyBars = (rootRef, barRef, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined
    const name = document.getElementById('business_name_bar')
    const place = () => {
      const root = rootRef.current
      if (!root) return
      const nameBottom = name?.classList.contains('fixed-name') ? name.getBoundingClientRect().bottom : 0
      const top = Math.max(0, Math.round(Math.max(headerVisibleBottom(), nameBottom)))
      root.style.setProperty('--categories-sticky-top', `${top}px`)
      const bar = barRef.current
      bar?.classList.toggle('is-stuck', window.scrollY > 0 && bar.getBoundingClientRect().top <= top + 1)
    }
    place()
    const observer = name && typeof MutationObserver === 'function' ? new MutationObserver(place) : null
    observer?.observe(name, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place)
    window.addEventListener(HEADER_STATE_EVENT, place)
    window.addEventListener(HEADER_DOCK_EVENT, place)
    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
      window.removeEventListener(HEADER_STATE_EVENT, place)
      window.removeEventListener(HEADER_DOCK_EVENT, place)
    }
  }, [enabled])
}

/**
 * Scrolls the page until `bar` is where it sticks (under the header: `--categories-sticky-top` of `root`, written by
 * useStickyBars). Only when it is still below that place: a bar that is already stuck, or above it, stays. Instant,
 * whatever the page's scroll-behavior says.
 */
export const stickBar = (root, bar) => {
  if (!root || !bar) return
  const top = parseFloat(root.style.getPropertyValue('--categories-sticky-top')) || 0
  const delta = bar.getBoundingClientRect().top - top
  if (delta > 1) window.scrollBy({ top: Math.ceil(delta), behavior: 'instant' })
}

/**
 * implementation notesthe store's search field (the one in `bar`) with the keyboard up. On a touch screen the keyboard
 * covers the lower half of the screen, so the results under a bar that is still down the page are behind it: on
 * focus the page scrolls to stick the bar under the header (stickBar), and the results fill what is left, which
 * lets the person read them.
 *   - It runs a frame after the focus (the browser has done its own scroll to the field by then; where the field
 *     is already in view it does none) and again once the keyboard has settled (SETTLE_MS, what useKeyboardOpen
 *     waits for): stickBar measures where the bar is at that moment and does nothing when it is stuck, so the
 *     second run is a no-op unless the browser moved the page after the first. Afterwards the field is whole in the
 *     visible area, so the hook's scrollFieldIntoView (it runs while `data-keyboard-open`) has nothing left to do.
 *   - `room`: the results keep at least the height of what is visible under the header while the field has the
 *     focus on a touch screen (the keyboard is up). A filter that leaves two products shortens the page, the
 *     browser clips the scroll and the bar would come down again. Without the focus (the keyboard closed, even with
 *     a search value) or with a mouse, no room: the store looks as it always did.
 * `handlers` go on a wrapper of the bar (React's focus events bubble).
 */
export const useSearchStick = (rootRef, barRef) => {
  const [focused, setFocused] = useState(false)
  const timers = useRef({ frame: 0, settle: 0 })
  const cancel = () => {
    cancelAnimationFrame(timers.current.frame)
    clearTimeout(timers.current.settle)
  }
  useEffect(() => cancel, [])
  const isSearchField = (target) => !!target?.matches?.('input') && !!barRef.current?.contains(target)
  const onFocus = (event) => {
    const field = event.target
    if (!isSearchField(field)) return
    setFocused(true)
    if (!touchInput()) return
    cancel()
    const stick = () => {
      if (document.activeElement === field) stickBar(rootRef.current, barRef.current)
    }
    timers.current.frame = requestAnimationFrame(stick)
    timers.current.settle = setTimeout(stick, SETTLE_MS)
  }
  const onBlur = (event) => {
    if (!isSearchField(event.target)) return
    setFocused(false)
    cancel()
  }
  return { room: touchInput() && focused, handlers: { onFocus, onBlur } }
}
