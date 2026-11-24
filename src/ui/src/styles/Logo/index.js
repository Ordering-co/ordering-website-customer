import { css } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'

/**
 * The boxes of the site logo (decision T6 of docs/theme-v2/imagenes-tamanos.md
 * §3.4). A logo is never stretched: it is fitted with `object-fit: contain` in
 * a box defined by its height, and its width follows the image up to a maximum.
 *
 * The sizes come from `components.header.base`: `logo_height` / `logo_width`
 * (the header and the headers of its overlays) and `screen_logo_height` /
 * `screen_logo_width` (standalone screens).
 */
const LOGO_KEYS = {
  // the header and the headers of its overlays (SearchProducts)
  header: { height: 'logo_height', maxWidth: 'logo_width' },
  // standalone screens (ResetPassword, the site out of service)
  screen: { height: 'screen_logo_height', maxWidth: 'screen_logo_width' },
  // over the mobile home hero: up to the screen logo's height, never filled
  hero: { maxHeight: 'screen_logo_height' }
}

// The sizes of a logo box of `kind` in `base` (components.header.base)
const logoSizes = (base, kind) => {
  const keys = LOGO_KEYS[kind]
  if (!keys) return keys
  return Object.fromEntries(Object.entries(keys).map(([box, key]) => [box, base[key]]))
}

/**
 * The box of a logo (`header`, `screen` or `hero`) with the sizes of the theme
 * (`components.header.base`), in px.
 */
export const logoBox = (theme, kind) => logoSizes(theme.values.components.header.base, kind)

// A logo box of CSS lengths
export const logoBoxCss = ({ height, maxHeight, maxWidth } = {}) => css`
  width: auto;
  height: ${height || 'auto'};
  ${maxHeight && `max-height: ${maxHeight};`}
  max-width: ${maxWidth || '100%'};
  object-fit: contain;
`

// The CSS of a logo box of the theme (see logoBox; its view)
export const themeLogoBoxCss = (theme, kind) => logoBoxCss(logoSizes(getThemeCss(theme, 'header').base, kind))
