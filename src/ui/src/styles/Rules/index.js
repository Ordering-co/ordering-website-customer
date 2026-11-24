/* Rules, not design values. Each one is a number the platform or a browser
   dictates, so no store theme can change it, and each is named here with its
   reason. The `literal` guard (scripts/design/guards/literal.mjs) accepts
   `1px`, `8px`, `12px` and `16px` in THIS file only; anywhere else they are a finding.
   Do not add a value that a theme could own (a color, a space, a size, a
   duration of the UI): that is a token or a TOKEN-GAP, never a rule. */

// iOS Safari zooms the page when a field with text under 16px gets focus.
// The floor is on phones only; a bigger theme text keeps its size. The design
// system's pieces read the same number as `--ui-field-min-text`
// (design-system/styles.css, kept equal by a test) and src/index.css repeats it
// for every field the pieces do not paint.
export const MOBILE_FIELD_MIN_TEXT = '16px'

/**
 * Text only a screen reader reads (a title the theme hides, the status of a
 * loading page): out of the flow, clipped to a pixel. The 1px and -1px are the
 * pattern's own; any other box size would show or move the text. For a form
 * control that must stay focusable use `visuallyHiddenControlCss`.
 */
export const srOnlyCss = `
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

/**
 * A native checkbox or radio under a drawn control (stars, dots, a row): not
 * seen, but it keeps the keyboard, the focus and the form value. It is
 * `srOnlyCss` plus a zero opacity.
 */
export const visuallyHiddenControlCss = `
  ${srOnlyCss}
  opacity: 0;
`

// The z-index of the layers that already existed before the design system.
// They stack by number: a base Dialog (#app-modals) sits at the old Popup's
// layer so legacy outside-click code keeps working, and a Sheet above it. Not
// design values and not a theme choice; a new layer takes a number in the
// gaps, here, never in a screen. The pieces write them as whole Tailwind
// classes (`ui:z-20002`) that Tailwind must see in components/, so a test keeps
// those classes equal to these numbers.
export const LEGACY_LAYERS = {
  popover: 10002,
  popup: 20001, // the submodule's Popup (src/@/components): a layer the web does not own
  dialog: 20002,
  sheet: 20601,
  selectList: 20602,
  shareMenu: 9999999
}

// The height of the pointer of an anchored menu (Categories' popover arrow). Fixed artwork on
// purpose, not a spacing: the arrow keeps its 14 by 8 px (width is this height at 7:4) whatever the
// store's `tokens.space`, and e2e/design/pieces-pz1.spec.js ("the Categories arrow keeps its
// geometry despite larger store spacing") holds it there. The Popover reads it as a variable.
export const POPOVER_ARROW_HEIGHT = '8px'

// The error cue of a product option group (components.product_option). Both are
// fixed on purpose, not a theme scale: the reserve keeps the room of an error
// outline in a group with a background and no border, and a store's
// `tokens.border.thin` of 0 or 4 would erase the outline or resize the group;
// the spread is the optical reach of the error pulse, and `tokens.space.md`
// (8 to 20 in a store) would change how far it paints. The pulse's duration and
// its reduced-motion switch stay themed. e2e/design/product-modal.spec.js (Z5 M1)
// keeps both fixed across theme scales.
export const OPTION_ERROR_RESERVE = '1px'
export const OPTION_ERROR_SPREAD = '12px'

// One turn of a loading ring, and the slow one of the sizes that keep turning
// with reduced motion. There is no motion token for a loop (`tokens.motion`
// is the speed of a state change), so the cadence is fixed here: the legacy
// Spinner, the Button's loading ring and their tests share it.
export const SPINNER_TURN_MS = 800
export const SPINNER_SLOW_TURN_MS = 2400
export const SPINNER_TURN = `${SPINNER_TURN_MS}ms`
export const SPINNER_SLOW_TURN = `${SPINNER_SLOW_TURN_MS}ms`

// The pulse of an indeterminate progress bar: a loop, so no `tokens.motion` speed applies
// (components.progress governs the width transition). Off with reduced motion.
export const PROGRESS_PULSE_MS = 1600
export const PROGRESS_PULSE = `${PROGRESS_PULSE_MS}ms`
