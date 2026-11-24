// The layers that open above a screen: the legacy Popup (inside `#app-modals`) and
// the design system's Dialog and Sheet (Base UI renders them in a portal it marks
// with `data-base-ui-portal`, as a child of the body).
const OVERLAY_SELECTOR = '#app-modals, [data-base-ui-portal]'

// The same layers as the ancestor of a styled-components rule (`${IN_OVERLAY} { … }`)
export const IN_OVERLAY = OVERLAY_SELECTOR.split(', ').map((selector) => `${selector} &`).join(', ')

/**
 * Whether a click landed on an overlay layer. A popover that closes on a click
 * outside must not count a click on a modal opened over it as outside.
 */
export const isInsideOverlay = (target) => target instanceof Element && target.closest(OVERLAY_SELECTOR) !== null
