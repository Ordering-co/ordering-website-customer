import React from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '../../../../utils/appTheme'
import { buildCompleteValues, buildLocalTheme, envelope } from '../../../../utils/__tests__/fixtures/themeFixtures'
import { usePlatformTheme } from '../../../hooks/useThemePlatform'
import { getThemeCss } from '../../../../utils/themeCss'

// Shared helpers of the component tests, built from the schema's defaults
// (THEME_DEFAULTS of src/utils/appTheme.js).
// `local`: the test's own local images (buildAppTheme's first argument).
export const local = buildLocalTheme()

// The theme without a remote one: the defaults.
export const defaultTheme = buildAppTheme(local, null)

// The defaults as a complete v2 envelope, after `mutate` changes its values.
export const themeWithValues = (mutate = (values) => values) => {
  const values = buildCompleteValues()
  return buildAppTheme(local, envelope(mutate(values) ?? values))
}

// `theme` with its values changed by `mutate` (on a copy), built again, so
// its CSS view (`theme.css`) follows the new values. A theme spread by hand
// (`{ ...theme, values }`) keeps the CSS of the old values.
export const rebuildTheme = (theme, mutate = (values) => values) => {
  const values = JSON.parse(JSON.stringify(theme.values))
  return buildAppTheme(local, envelope(mutate(values) ?? values))
}

// The theme with the store page's `classic` template (Cover and tabs), the page the tests of its own pieces
// (tabs bar, header actions, the phone's cart bar at any width) read; the schema's default is the direct menu.
export const classicStoreTheme = () => themeWithValues((values) => {
  values.components.store_page.base.template = 'classic'
  return values
})

// The theme with the direct menu without the cart column (`menu_index_no_cart`): the desktop's cart is the header's drawer.
export const noCartColumnStoreTheme = () => themeWithValues((values) => {
  values.components.store_page.base.template = 'menu_index_no_cart'
  return values
})

// All CSS styled-components injected, as one string.
export const injectedCss = () => Array.from(document.querySelectorAll('style')).map((s) => s.textContent).join('\n')

// CSS rules of the element's own generated class.
export const cssFor = (el) => {
  const cls = el.className.split(' ').pop()
  return injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}')
}

// The theme for the window's platform, as the app's ThemeProvider passes it:
// below 576px themeVisible answers the phone's value.
export const PlatformThemeProvider = ({ theme, children }) => (
  <ThemeProvider theme={usePlatformTheme(theme)}>{children}</ThemeProvider>
)

export const renderWith = (theme, ui) => render(<PlatformThemeProvider theme={theme}>{ui}</PlatformThemeProvider>)

// The icon of a field (the search magnifier, a leading icon): `icon_color` and `icon_size` of
// components.input, as `component` (e.g. search_bar) overrides them, as CSS.
export const fieldIcon = (theme, component = 'input') => {
  const base = getThemeCss(theme, 'input').base
  const own = component === 'input' ? {} : getThemeCss(theme, component).base
  return { color: own.icon_color ?? base.icon_color, size: own.icon_size ?? base.icon_size }
}
