import { getThemeCss } from '~/utils/themeCss'

// components.accordion.base, as CSS (its view)
const accordionTheme = (theme) => getThemeCss(theme, 'accordion').base

/**
 * The box of an accordion's header (the button that opens it: the checkout's
 * summary and payment, a store in the cart, the date and time steps):
 * `header_padding` above and below its content (its sides stay the screen's),
 * `header_background`, and `header_hover` as its hover background.
 */
export const accordionHeaderBoxCss = (theme, { padding = true } = {}) => {
  const accordion = accordionTheme(theme)
  const space = accordion.header_padding
  return [
    padding ? `padding-top: ${space}; padding-bottom: ${space};` : '',
    `background: ${accordion.header_background};`,
    `&:hover { background: ${accordion.header_hover}; }`
  ].filter(Boolean).join('\n')
}

/**
 * The title of an accordion's header, `header_text` (its size, line, weight and
 * family).
 */
export const accordionHeaderTextCss = (theme) => accordionTheme(theme).header_text.css

/**
 * The header's `header_padding`, as CSS.
 */
export const accordionHeaderPadding = (theme) => accordionTheme(theme).header_padding

/**
 * The header's resting and hover backgrounds (`header_background`,
 * `header_hover`).
 */
export const accordionHeaderColors = (theme) => {
  const accordion = accordionTheme(theme)
  return { background: accordion.header_background, hover: accordion.header_hover }
}
