/**
 * Where a piece of content scrolls, and what covers the top of it: for the
 * sticky bars that navigate a scrolling form (the product form's option
 * navigation) and the scrolls that must land below them.
 */

const SCROLLS = /(auto|scroll|overlay)/

/** Whether `container` is the page itself (the window scrolls it). */
export const isPageScroll = (container) => typeof document !== 'undefined' &&
  (container === document.scrollingElement || container === document.documentElement || container === document.body)

/**
 * The element that scrolls `el` vertically: its nearest ancestor whose
 * overflow scrolls (the product modal's `.popup-dialog`, a modal's outer
 * box…), else the page.
 */
export const scrollParent = (el) => {
  let node = el?.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    if (SCROLLS.test(window.getComputedStyle(node).overflowY)) return node
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

/** The viewport y where the container's visible box starts (0 for the page). */
export const containerTop = (container) => (isPageScroll(container) ? 0 : container.getBoundingClientRect().top)

/**
 * The px of the container's top that what it pins there covers: its children
 * and grandchildren (its own chrome, e.g. the modal's close row on small
 * screens) that are `position: fixed` and start at its top (closer to it than
 * their own height), down to the lowest edge of them. Not `own` nor what
 * holds it; 0 for the page.
 */
export const pinnedTopInset = (container, own) => {
  if (!container || isPageScroll(container)) return 0
  const top = containerTop(container)
  let inset = 0
  Array.from(container.children)
    .flatMap((child) => [child, ...Array.from(child.children)])
    .forEach((el) => {
      if (own && (el === own || el.contains(own) || own.contains(el))) return
      if (window.getComputedStyle(el).position !== 'fixed') return
      const rect = el.getBoundingClientRect()
      if (!rect.height || rect.bottom <= top || rect.top - top >= rect.height) return
      inset = Math.max(inset, rect.bottom - top)
    })
  return Math.round(inset)
}

/**
 * The px from the container's visible top to the bottom of what covers it
 * while it scrolls: what it pins over its top (`pinnedTopInset`) plus the
 * sticky bars inside it marked with `data-sticky-top` (stacked, those this
 * container scrolls: not a nested scroller's), 0 for none. The line where
 * a scroll to some content lands it, under all of that.
 */
export const stickyTopBottom = (container) => {
  if (!container) return 0
  const bars = Array.from(container.querySelectorAll('[data-sticky-top]'))
    .filter((bar) => scrollParent(bar) === container)
  const handleInset = parseFloat(getComputedStyle(container).getPropertyValue('--sheet-handle-target')) || 0
  // a bar sticks at the container's content edge plus its resolved `top`: the computed value, since
  // the custom property it is built from reads back unresolved (`max(calc(20px + 40px), 0px)`)
  const padding = isPageScroll(container) ? 0 : parseFloat(getComputedStyle(container).paddingTop) || 0
  const inset = bars.reduce((largest, bar) => {
    const offset = padding + (parseFloat(getComputedStyle(bar).top) || 0)
    return Math.max(largest, offset)
  }, Math.max(handleInset, pinnedTopInset(container)))
  return inset + bars.reduce((sum, bar) => sum + (bar.offsetHeight || 0), 0)
}

/**
 * The section the reader is in: the last one whose top reached `line` (a
 * viewport y: below the sticky bar), the first before any did, the last at
 * the end of the scroll (a short last section never reaches the line).
 * `sections`: elements, in order. Null without any.
 */
export const activeSection = (container, sections, line) => {
  if (!sections.length) return null
  const scrollable = container.scrollHeight > container.clientHeight
  if (scrollable && container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
    return sections[sections.length - 1]
  }
  let active = sections[0]
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= line) active = section
  })
  return active
}
