import { alpha, isTransparent } from '@orderingco/ordering-theme-engine/css'
import { legible } from '@orderingco/ordering-theme-engine/colors'

/**
 * Colors of the theme (`theme.values.tokens.color`).
 */

/** Text and icons over a primary background: `tokens.color.on_primary`. */
export const onPrimary = (theme) => themeColor(theme, 'on_primary')

/**
 * The primary as text or as an icon on the page's surfaces (action links,
 * prices and points, the active tab…): `tokens.color.primary_text` (api-core
 * keeps it at ≥4.5:1 against the background). Fills, borders and backgrounds
 * keep the primary.
 */
export const primaryText = (theme) => themeColor(theme, 'primary_text')

/**
 * The color with an alpha (0–1): `alpha` of the engine's css (a hex, rgb()
 * or rgba() color, its own alpha replaced). A color it cannot read yields
 * `fallback`, so no invalid value reaches the CSS.
 */
export const withAlpha = (color, amount, fallback = 'transparent') => alpha(color, amount, fallback)

/**
 * Whether a color paints nothing: `transparent`, or an alpha of 0
 * (`rgba(…,0)`, `#RRGGBB00`…), `isTransparent` of the engine's css. A
 * theme's color marked alpha may be one of them where the default says
 * `transparent`.
 */
export { isTransparent }

/**
 * `color` as text over the `background` it is really painted on: itself when it keeps AA (4.5:1), else the engine's
 * `legible` (the rule that derives `primary_text`): darker, or lighter over a dark background, until it does.
 * The theme's value is not changed; a color or a background it cannot read leaves `color` as it is.
 */
export const legibleOver = (color, background) => legible(color, background) ?? color

/**
 * A color of the theme (`tokens.color[token]`): a color the CSS can paint
 * (complete and valid: a hex, rgb() or rgba(), or `transparent`).
 */
export const themeColor = (theme, token) => theme.values.tokens.color[token]
