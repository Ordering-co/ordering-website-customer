import { themeFocusRing } from '~/utils/themeTokens'

/* The keyboard focus of every control is one ring of the theme
   (`tokens.focus_ring`): its width (a level of `tokens.border`, thick by
   default), its offset off the control (a level of `tokens.space`, xxs by
   default) and its color (a key of `tokens.color`, primary by default). An
   outline, so it takes no room and never moves the layout. A text field (input,
   textarea, search bar, select) whose theme gives it a focus border unlike its
   resting one shows that border instead (the base Input). */

/**
 * The declarations of the focus ring (`outline`, `outline-offset`), `important`
 * to win over the `outline: none` of a control's own CSS.
 */
export const focusRingCss = (theme, { important = false } = {}) => {
  const ring = themeFocusRing(theme)
  const flag = important ? ' !important' : ''
  return `outline: ${ring.width} solid ${ring.color}${flag}; outline-offset: ${ring.offset}${flag};`
}

/**
 * The focus ring drawn inside its control's edge (a negative offset of its
 * width), `important` over the global rule: for a control that fills a box that
 * clips (a scrolling bar, a card with overflow hidden), where the ring outside
 * would be cut.
 */
export const focusRingInsetCss = (theme) => {
  return `outline-offset: -${themeFocusRing(theme).width} !important;`
}

/**
 * How far the focus ring reaches out of its control (its width and its offset),
 * in px. The room a box that clips its content (overflow) leaves
 * around it so the ring of a control at its edge shows.
 */
export const focusRingReach = (theme) => {
  const ring = themeFocusRing(theme)
  return Math.ceil(parseFloat(ring.width) + parseFloat(ring.offset))
}

/**
 * For a box that clips its content (overflow hidden / auto), room for the focus
 * ring of the controls at its edges: it reaches out by the ring's reach
 * (negative margin) and pads its content back by as much, so the content keeps
 * its place and width.
 */
export const focusRingRoomCss = (theme) => {
  const reach = focusRingReach(theme)
  if (!reach) return ''
  return `margin: -${reach}px; padding: ${reach}px;`
}

/**
 * For a row that scrolls sideways (overflow, so it clips) and spans its
 * parent's width, room at its sides for the focus ring of its first and last
 * controls: it reaches out by the ring's reach and pads its content back, so
 * the content keeps its place and width. Its top and bottom are left as they
 * are.
 */
export const focusRingRoomXCss = (theme) => {
  const reach = focusRingReach(theme)
  if (!reach) return ''
  return `width: calc(100% + ${2 * reach}px); max-width: none; margin-left: -${reach}px; margin-right: -${reach}px; padding-left: ${reach}px; padding-right: ${reach}px;`
}

// What takes the keyboard focus: links, native controls, the elements with a
// control's role and anything focusable by tabindex (not the -1 ones, focused
// only by script: a modal's box)
const FOCUSABLE = [
  'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
  "[role='button']", "[role='link']", "[role='tab']", "[role='radio']", "[role='checkbox']",
  "[role='switch']", "[role='option']", "[role='menuitem']", "[tabindex]:not([tabindex='-1'])"
]

/**
 * The global rule of the focus ring, for every focusable element on keyboard
 * focus (`:focus-visible`).
 */
export const focusRingGlobalCss = (theme) => {
  return `:where(${FOCUSABLE.join(', ')}):focus-visible { ${focusRingCss(theme, { important: true })} }`
}
