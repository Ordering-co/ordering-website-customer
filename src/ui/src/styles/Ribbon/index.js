import { getThemeCss } from '~/utils/themeCss'
import { themeRadius } from '~/utils/themeTokens'

/* The ribbon of a product, a category or a business (`components.ribbon`). Its
   color, its text and its shape come from the data (`ribbon.color`,
   `ribbon.text`, `ribbon.shape`); the theme gives the rest: the text style, the
   inner space and the radius of the rounded shape. */

/**
 * The declarations of a ribbon of the theme: its text (`base.text`), inner
 * space (`padding_y` `padding_x`) and corners by the shape of the data:
 * `rounded` takes `base.radius`, `capsule` is a pill, a rectangle is square.
 * Appended last in the ribbon's block (its color stays the data's).
 */
export const ribbonCss = (theme, { rounded = false, capsule = false } = {}) => {
  const base = getThemeCss(theme, 'ribbon').base
  const corners = capsule ? themeRadius(theme, 'full') : rounded ? base.radius : '0'
  return [
    base.text.css,
    `padding: ${base.padding_y} ${base.padding_x};`,
    `border-radius: ${corners};`
  ].join('\n')
}
