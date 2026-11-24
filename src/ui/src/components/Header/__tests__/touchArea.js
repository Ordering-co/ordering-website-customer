// jsdom applies no @media rule to getComputedStyle, so the coarse-pointer
// touch area is read from the stylesheet itself: the element's styled class
// has a `pointer: coarse` rule that gives its pseudo-element at least 44 px.
export const coarseTouchArea = (el, pseudo) => {
  const sheet = [...document.querySelectorAll('style')].map((node) => node.textContent).join('')
  return [...el.classList].some((cls) => sheet.includes(`@media (pointer:coarse){.${cls}${pseudo}{min-width:44px;min-height:44px;}}`))
}

// Nothing from the element up to `stop` clips what sticks out of it (the
// touch area is a pseudo-element past the item's box).
export const clippedBy = (el, stop) => {
  for (let node = el; node && node !== stop?.parentElement; node = node.parentElement) {
    const style = window.getComputedStyle(node)
    if ([style.overflow, style.overflowX, style.overflowY].some((value) => ['hidden', 'auto', 'scroll', 'clip'].includes(value))) return node
  }
  return null
}
