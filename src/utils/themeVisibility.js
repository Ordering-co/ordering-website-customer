import { MOBILE_WEB_MAX_WIDTH } from './themeCss'

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * Whether the theme shows an element of `visibility` (product.schema.json).
 *
 * A key has one value on every screen, `theme.values.visibility[key]`, and a
 * platform may show it otherwise: on a phone (`theme.platform` is
 * `mobile_web`, set by the theme providers below MOBILE_WEB_MAX_WIDTH, see
 * themeForWidth) `theme.values.platforms.mobile_web.visibility[key]` wins
 * when the theme has it. That one is the theme's override there, or the
 * schema's default for the platform (a key whose node says
 * `co.ordering.platforms`, `business.header.logo` hidden on phones), as
 * api-core serves it and buildAppTheme merges it. A key the schema does not
 * know is shown.
 */
export const themeVisible = (theme, key) => {
  const own = theme.platform ? theme.values.platforms[theme.platform].visibility?.[key] : undefined
  if (typeof own === 'boolean') return own
  return theme.values.visibility[key] !== false
}

/**
 * Whether the theme hides an element of `visibility` (the opposite of
 * themeVisible).
 */
export const themeHidden = (theme, key) => !themeVisible(theme, key)

/** The platform of a screen width: `mobile_web` below MOBILE_WEB_MAX_WIDTH, else null. */
export const platformOfWidth = (width) => (typeof width === 'number' && width < MOBILE_WEB_MAX_WIDTH ? 'mobile_web' : null)

/**
 * The theme for a platform (`mobile_web` or null): the same object when it
 * already is (a theme without a platform stays untouched on wide screens),
 * else a copy with `platform` set. themeVisible reads it.
 */
export const themeForPlatform = (theme, platform) => {
  if (!isObject(theme)) return theme
  if ((theme.platform ?? null) === (platform ?? null)) return theme
  return { ...theme, platform: platform ?? null }
}

/** The theme for a screen width (see platformOfWidth and themeForPlatform). */
export const themeForWidth = (theme, width) => themeForPlatform(theme, platformOfWidth(width))
