import { scrollBehavior } from '~/utils/themeMotion'
import { HEADER_SCROLL_REVEAL, HEADER_SELECTOR, headerBlockHeight, headerVisibleBottom } from '~ui/src/components/Header/scrollBehavior'

// Within this many px of the fixed bars' bottom a category counts as reached.
export const REACHED_TOLERANCE = 4

// The bar of the `menu_index` template on a phone ("Menu · category"): sticky under the header and the name bar
// (the tabs bar's place in `classic`, which has no `#category-lists` there). The template's index on desktop is
// a column beside the menu, it covers no section, so it is not measured.
export const MENU_BAR_ID = 'category-menu-bar'

/**
 * The bottom edge (viewport px) of what stays fixed on top while the page is
 * read, measured from the DOM: the business name bar once it is fixed and the
 * categories bar once it docks. The bar docks when the page moves past its
 * place, so for an element below that place it counts, as tall as it is, even
 * before it docks. With `probe`, the name bar not yet fixed counts too (for
 * an element below the business name), measured by fixing it for an instant
 * (no paint in between), so a scroll starts toward the right place. The
 * header on top counts while it is on view; the name bar and the
 * categories hang under it, so the lowest of them is what is covered. Never a
 * number of the theme or of the code.
 */
export const fixedBarsBottom = (element, probe = false) => {
  const name = document.getElementById('business_name_bar')
  const bar = document.getElementById('category-lists')
  const menuBar = document.getElementById(MENU_BAR_ID)
  const top = element?.getBoundingClientRect().top
  let nameBottom = headerVisibleBottom()
  if (name?.classList.contains('fixed-name')) {
    nameBottom = Math.max(nameBottom, name.getBoundingClientRect().bottom)
  } else if (probe && name && top > (document.getElementById('business_name')?.getBoundingClientRect().top ?? Infinity)) {
    name.classList.add('fixed-name')
    nameBottom = Math.max(nameBottom, name.getBoundingClientRect().bottom)
    name.classList.remove('fixed-name')
  }
  // sticky in the flow (its own box is its place): what is below it will have it on top, as tall as it is;
  // once stuck under what is above, it covers what starts above it too
  const menu = menuBar?.getBoundingClientRect()
  if (menuBar) return Math.max(nameBottom + (top > menu.top ? menuBar.offsetHeight : 0), menu.top <= nameBottom + 1 ? menu.bottom : 0)
  if (!bar) return nameBottom
  if (bar.classList.contains('sticky-prod-cat')) return Math.max(nameBottom, bar.getBoundingClientRect().bottom)
  const placeTop = bar.parentElement?.getBoundingClientRect().top ?? Infinity
  return nameBottom + (top > placeTop ? bar.offsetHeight : 0)
}

/**
 * The id of the category whose section is the one under the fixed bars (the one the page is reading), from the
 * `ids` in the order of the page; null when none is. Same rule as the tabs bar's: its top is at the bars' bottom
 * or above and its end below; at the end of the page the last one with a section.
 */
export const activeCategoryId = (ids) => {
  const reached = (id) => {
    const section = document.getElementById(`category${id}`)
    if (!section) return false
    const barsBottom = fixedBarsBottom(section) + REACHED_TOLERANCE
    const { top, bottom } = section.getBoundingClientRect()
    return top <= barsBottom && bottom > barsBottom
  }
  const atPageEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1
  if (atPageEnd) {
    const last = [...ids].reverse().find(id => document.getElementById(`category${id}`))
    if (last !== undefined) return last
  }
  return ids.find(reached) ?? null
}

// What the header will cover once the scroll to `element` is over: a fixed
// header what it covers now; a revealing one hides going down and comes back
// going up (with the bar docked under it, which goes and comes with it).
// Everything fixed hangs under the header, so the first measure
// (taken with the header as it is) moves by the difference.
const headerShift = (element) => {
  const header = document.querySelector(HEADER_SELECTOR)
  if (header?.getAttribute('data-scroll-behavior') !== HEADER_SCROLL_REVEAL) return 0
  return (element.getBoundingClientRect().top > 0 ? 0 : headerBlockHeight(header)) - headerVisibleBottom()
}

// Frames the page must stay put for a smooth scroll to count as over (it has
// no end of its own to wait for: the page also grows while images load), the
// cap on the wait, and the corrections that follow it.
const STILL_FRAMES = 5
// An instant scroll is over at once, but a revealing header answers it in a
// frame it schedules from the scroll event, after the one that follows the
// scroll: the second frame is the first one that sees the header (and what
// hangs under it) as it ends up, so the first correction does not undo the
// header's part. Without a revealing header the first frame is enough.
const INSTANT_FRAMES = 1
const INSTANT_REVEAL_FRAMES = 2
const MAX_FRAMES = 300
const CORRECTIONS = 3

// The newest call is the only one that corrects: a later one, the user's
// input (wheel, touch, keys), or the element leaving the page ends the rest.
let latest = 0
const USER_INPUTS = ['wheel', 'touchstart', 'keydown']

const whenStill = (stillFrames, alive, done, last = window.scrollY, still = 0, frames = 0) => {
  requestAnimationFrame(() => {
    if (!alive()) return done(false)
    const y = window.scrollY
    const nowStill = y === last ? still + 1 : 0
    if (nowStill >= stillFrames || frames >= MAX_FRAMES) done(true)
    else whenStill(stillFrames, alive, done, y, nowStill, frames + 1)
  })
}

/**
 * Scrolls the page so `element` (a category's title or section) sits just
 * under the fixed bars: smooth when the theme allows motion (and the system
 * does not reduce it), at once otherwise. The bars dock while the page moves
 * (the name bar, the categories) and the page can grow, so the bottom
 * measured at the start can be short: each time the page stops it measures
 * again and moves the rest, unless a newer call, the user or the element's
 * removal ended it.
 */
export const scrollToCategory = (element, theme) => {
  if (!element) return
  const mine = ++latest
  let interrupted = false
  const interrupt = () => { interrupted = true }
  USER_INPUTS.forEach(type => window.addEventListener(type, interrupt, { passive: true, once: true }))
  const release = () => USER_INPUTS.forEach(type => window.removeEventListener(type, interrupt))
  const alive = () => mine === latest && !interrupted && element.isConnected
  const behavior = theme && scrollBehavior(theme) === 'smooth' ? 'smooth' : 'instant'
  const toBars = () => element.getBoundingClientRect().top - fixedBarsBottom(element)
  // instant: the scroll handlers dock the bars before the next frame paints
  const instantFrames = () =>
    document.querySelector(HEADER_SELECTOR)?.getAttribute('data-scroll-behavior') === HEADER_SCROLL_REVEAL ? INSTANT_REVEAL_FRAMES : INSTANT_FRAMES
  const settle = (left) => whenStill(behavior === 'smooth' ? STILL_FRAMES : instantFrames(), alive, (ok) => {
    const rest = ok ? toBars() : 0
    if (Math.abs(rest) < 1 || left === 0) return release()
    window.scrollBy({ top: rest, left: 0, behavior })
    settle(left - 1)
  })
  window.scroll({ top: window.scrollY + element.getBoundingClientRect().top - (fixedBarsBottom(element, true) + headerShift(element)), left: 0, behavior })
  settle(CORRECTIONS)
}
