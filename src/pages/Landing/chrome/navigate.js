// A click that the browser would open in a new tab or window is left alone.
export const isPlainClick = (event) => !event.defaultPrevented && (event.button ?? 0) === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)

/** Click handler of a link to an app path: navigates inside the SPA (the href stays for a new tab). */
export const goTo = (history, path) => (event) => {
  if (!isPlainClick(event)) return
  event.preventDefault()
  history.push(path)
}

/**
 * Scrolls to the section with `id`. The `#id` href stays for a new tab, but a
 * plain click never changes the hash: ScrollToTop (src/components/ScrollToTop)
 * scrolls to the top on every history change and would undo the jump.
 * The sticky header's room is the page's scroll padding (LandingHeader).
 */
export const scrollToSection = (id) => {
  const target = document.getElementById(id)
  if (!target?.scrollIntoView) return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

export const jumpTo = (id) => (event) => {
  if (!isPlainClick(event)) return
  event.preventDefault()
  scrollToSection(id)
}
