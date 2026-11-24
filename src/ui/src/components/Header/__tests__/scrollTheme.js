import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// A theme with components.header.base.scroll_behavior = `scroll` (absent when
// undefined). The theme's builder drops a key the schema does not know yet, so
// the value is set on the built theme: headerScrollBehavior reads `values`.
export const themedScroll = (scroll) => {
  const theme = themeWithValues()
  const base = { ...theme.values.components.header.base }
  if (scroll === undefined) delete base.scroll_behavior
  else base.scroll_behavior = scroll
  return { ...theme, values: { ...theme.values, components: { ...theme.values.components, header: { ...theme.values.components.header, base } } } }
}
