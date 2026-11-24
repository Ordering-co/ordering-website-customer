import { getThemeComponent, getThemeCss, resolveThemeProps } from '~/utils/themeCss'

/* An icon tile (components.icon_tile): the small box an icon (or a short
   value, as an offer's rate) sits in next to a text, as the coupon's and the
   payment card's. Sizes sm | md | lg (each its width, height and icon size)
   and variants subtle | outline | primary (fill, color, border, shadow). */

export const ICON_TILE_SIZES = ['sm', 'md', 'lg']
export const ICON_TILE_VARIANTS = ['subtle', 'outline', 'primary']

/**
 * The resolved props of an icon tile (base, then its variant and its size; an
 * unknown one is subtle / sm).
 */
const tileSelection = ({ size = 'sm', variant = 'subtle' } = {}) => ({
  size: ICON_TILE_SIZES.includes(size) ? size : 'sm',
  variant: ICON_TILE_VARIANTS.includes(variant) ? variant : 'subtle'
})

export const iconTileTheme = (theme, options) => resolveThemeProps(getThemeComponent(theme, 'icon_tile'), tileSelection(options))

// The same props as CSS (its view)
const iconTileLook = (theme, options) => resolveThemeProps(getThemeCss(theme, 'icon_tile'), tileSelection(options))

/**
 * The declarations of an icon tile (see iconTileTheme): a box of its size with its
 * content centered, its fill, color, border, shadow, radius and text, and its
 * icon (svg) at the size's icon size in its color. A tile is not a control: it
 * does not move.
 */
export const iconTileCss = (theme, options) => {
  const props = iconTileLook(theme, options)
  const { width, height, icon_size: icon } = props
  return [
    'display: inline-flex;',
    'align-items: center;',
    'justify-content: center;',
    'flex: 0 0 auto;',
    'box-sizing: border-box;',
    'transform: none;',
    'transition: none;',
    `width: ${width}; min-width: ${width};`,
    `height: ${height}; min-height: ${height};`,
    `border-radius: ${props.radius};`,
    `background: ${props.background};`,
    `color: ${props.color};`,
    `border: ${props.border};`,
    `box-shadow: ${props.shadow.css};`,
    props.text.css,
    '&:hover { transform: none; }',
    `svg { color: inherit; transform: none; transition: none; width: ${icon}; height: ${icon}; font-size: ${icon}; }`
  ].join('\n')
}

/**
 * iconTileCss of a spot drawn by its own element, over its current rules:
 * `&& { … }`.
 */
export const iconTileRules = (theme, options, { specificity = 2 } = {}) => {
  return `${'&'.repeat(Math.max(specificity, 1))} { ${iconTileCss(theme, options)} }`
}
