import { getThemeComponent, getThemeCss, resolveThemeProps } from '~/utils/themeCss'

/* A banner (components.banner): a block that promotes something on a page,
   apart from its content: the custom order invitation (variant promo), the
   rewards an order earns (variant rewards) and the images of the page
   banners (their radius). Its box, padding, the gap between its title and
   its text, and their text styles come from the theme. */

export const BANNER_VARIANTS = ['promo', 'rewards']

/**
 * The resolved props of a banner: base merged with its variant (an unknown
 * variant is promo).
 */
const bannerKey = (variant) => (BANNER_VARIANTS.includes(variant) ? variant : 'promo')

export const bannerTheme = (theme, variant = 'promo') => resolveThemeProps(getThemeComponent(theme, 'banner'), { variant: bannerKey(variant) })

// The same props as CSS (its view)
const bannerLook = (theme, variant) => resolveThemeProps(getThemeCss(theme, 'banner'), { variant: bannerKey(variant) })

/**
 * The box of a banner: its fill, radius, border and shadow.
 */
export const bannerBoxCss = (theme, variant) => {
  const props = bannerLook(theme, variant)
  return [
    `background: ${props.background};`,
    `border-radius: ${props.radius};`,
    `border: ${props.border};`,
    `box-shadow: ${props.shadow.css};`
  ].join('\n')
}

/**
 * A value of a banner (`padding`, `gap`, `radius`), as CSS.
 */
export const bannerSpace = (theme, variant, key) => bannerLook(theme, variant)[key]

/**
 * The text style of a banner's `title` or `text`.
 */
export const bannerTextCss = (theme, variant, key) => bannerLook(theme, variant)[key].css
