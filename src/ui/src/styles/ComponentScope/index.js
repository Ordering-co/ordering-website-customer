import React, { useMemo } from 'react'
import { ThemeProvider, useTheme } from 'styled-components'
import { scopedTheme } from '~/utils/themeGroups'

/**
 * The controls inside take the components the group changes
 * (`components.<group>.scope`) instead of the global ones. Wrap only the
 * group's own controls: a modal or popover opened from inside would take the
 * group's look too (context crosses portals).
 */
export const ComponentScope = ({ group, children }) => {
  const theme = useTheme()
  const scoped = useMemo(() => scopedTheme(theme, group), [theme, group])
  return <ThemeProvider theme={scoped}>{children}</ThemeProvider>
}
