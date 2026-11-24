import { THEME_DEFAULTS } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import {
  themeBorderWidth, themeFocusRing, themeFontFamily, themeIconSize, themeOpacity, themeRadius,
  themeShadow, themeSize, themeSpace, themeTextParts
} from '~/utils/themeTokens'
import { catalogEntries, keysFromTokens } from './catalog.mjs'

// What each group reads from the theme: always a helper, so Identity applies
// (`border` follows the theme-wide width; `border_fixed` is the one a control
// that draws a shape keeps). Motion is left out: a bare duration would ignore
// `motion_style.enabled` and reduced motion; components keep `motionCss`.
const reader = (theme) => (group, key) => ({
  color: () => themeColor(theme, key),
  radius: () => themeRadius(theme, key),
  space: () => themeSpace(theme, key),
  size: () => themeSize(theme, key),
  icon: () => themeIconSize(theme, key),
  shadow: () => themeShadow(theme, key),
  border: () => themeBorderWidth(theme, key),
  border_fixed: () => themeBorderWidth(theme, key, { fixed: true }),
  opacity: () => themeOpacity(theme, key),
  typography: () => {
    const text = themeTextParts(theme, key)
    return { size: text['font-size'], line: text['line-height'], weight: text['font-weight'] }
  },
  font: () => themeFontFamily(theme, key),
  focus_ring: () => themeFocusRing(theme)[key]
})[group]()

const keysOf = keysFromTokens(THEME_DEFAULTS.tokens)

// One object per theme (its CSS view is built once per theme, like appTheme).
const cache = new WeakMap()

/** Every `--ot-*` variable of the theme, `{ '--ot-color-primary': '#…' }`. */
export const themeCssVariables = (theme) => {
  if (!cache.has(theme.css)) {
    cache.set(theme.css, Object.fromEntries(catalogEntries(keysOf, reader(theme)).map(({ ot, value }) => [ot, value])))
  }
  return cache.get(theme.css)
}
