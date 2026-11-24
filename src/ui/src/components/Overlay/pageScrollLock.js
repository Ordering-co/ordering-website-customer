/* The page scroll lock shared by the open modals and bottom sheets (its own
   module, so a light component locks the page without loading the Modal). */

// The page scroll lock shared by the open modals: the first one saves the
// body's overflow and padding and locks it (padding in place of the scrollbar,
// so the page does not shift); closing one on top of another keeps the lock;
// the last one restores what the body had.
let pageScrollLocks = 0
let pageScrollSaved = null

export const lockPageScroll = () => {
  const { body } = document
  if (pageScrollLocks === 0) {
    pageScrollSaved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    const scrollbarWidth = Math.max(0, window.innerWidth - body.clientWidth)
    const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0
    if (scrollbarWidth) body.style.paddingRight = `${padding + scrollbarWidth}px`
    body.style.overflow = 'hidden'
  }
  pageScrollLocks += 1
  return true
}

export const unlockPageScroll = () => {
  if (pageScrollLocks === 0) return
  pageScrollLocks -= 1
  if (pageScrollLocks > 0 || !pageScrollSaved) return
  document.body.style.overflow = pageScrollSaved.overflow
  document.body.style.paddingRight = pageScrollSaved.paddingRight
  pageScrollSaved = null
}
