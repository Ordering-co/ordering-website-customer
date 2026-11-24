import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { themeSpace } from '~/utils/themeTokens'

/* The look of components.tooltip for a surface that is not the base Tooltip
   piece (the header's far-away message). Its surface (fill,
   text, radius, border, shadow, padding), its widest width, how far it sits
   from its control and its fade come from the theme. */

/**
 * The resolved base of components.tooltip.
 */
export const tooltipTheme = (theme) => getThemeComponent(theme, 'tooltip').base

/**
 * The tooltip's distance from its control (`base.offset`), as CSS.
 */
export const tooltipOffset = (theme) => getThemeCss(theme, 'tooltip').base.offset

/**
 * The declarations of the tooltip's surface: its fill, text color and style,
 * radius, border, shadow, padding and widest width (never wider than the
 * screen).
 */
export const tooltipSurfaceCss = (theme) => {
  const base = getThemeCss(theme, 'tooltip').base
  return [
    `background: ${base.background};`,
    `color: ${base.color};`,
    `border-radius: ${base.radius};`,
    `padding: ${base.padding};`,
    `border: ${base.border};`,
    `box-shadow: ${base.shadow.css};`,
    `max-width: min(${base.max_width}, calc(100vw - ${themeSpace(theme, 'xxl')}));`, // the screen less a gutter on each side (two lg: xxl)
    base.text.css
  ].join('\n')
}
