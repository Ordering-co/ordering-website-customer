import { getThemeComponent, getThemeCss, getThemeMobileOverrides } from './themeCss'

/**
 * Reads of the product modal, the product card and the cart of the theme
 * (`components.product_modal`, `product_card`, `cart`).
 */

/** `components.<component>.base`. */
export const themeBase = (theme, component) => getThemeComponent(theme, component).base

/**
 * The text style `base[key]` of a component as CSS (its view's declarations:
 * size, line, family, letter spacing, transform), without its weight: the
 * weight the spot declares today stays (the bold a text has is respected, as
 * themeText does).
 */
export const themeTextKeepWeight = (theme, component, key) =>
  getThemeCss(theme, component).base[key].css.replace(/font-weight: [^;]*;\n?/, '')

/** The number `base[key]` of a component (a size, a width, a count of lines). */
export const themeBaseNumber = (theme, component, key) => themeBase(theme, component)[key]

/** The space `base[key]` of a component, as CSS (its view). */
export const themeBaseSpace = (theme, component, key) => getThemeCss(theme, component).base[key]

// The ratios the product's gallery may take (`product_modal.base.gallery_ratio`)
export const GALLERY_RATIOS = { '4:3': '4 / 3', '1:1': '1 / 1', '3:2': '3 / 2', '16:9': '16 / 9' }

/**
 * The CSS aspect-ratio of the product's gallery
 * (`product_modal.base.gallery_ratio`). `mobile` reads its small-screen value:
 * the one a theme sets in `platforms.mobile_web`, or null when it sets none
 * (the phone keeps the gallery's ratio).
 */
export const galleryRatio = (theme, { mobile = false } = {}) => {
  const ratio = mobile
    ? getThemeMobileOverrides(theme, 'product_modal')?.base?.gallery_ratio
    : themeBase(theme, 'product_modal').gallery_ratio
  return ratio ? GALLERY_RATIOS[ratio] : null
}
