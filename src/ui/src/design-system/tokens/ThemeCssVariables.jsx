import React from 'react'
import { createGlobalStyle } from 'styled-components'
import { themeCssVariables } from './variables'
import { ALIASES, aliasVar } from './aliases.mjs'

// The dashboard's names (`--ds-*`) on :root too, for styled-components: each
// points to its runtime variable, so it follows the theme like the catalog.
const ALIAS_DECLARATIONS = Object.entries(ALIASES).map(([name, ot]) => `${aliasVar(name)}:var(${ot});`).join('')

// The whole catalog on :root (not on a wrapper: a portal under <body> sees it),
// from the theme styled-components gives, so a theme swap repaints. Mount it
// next to the ThemeProvider.
const Variables = createGlobalStyle`
  :root { ${({ theme }) => Object.entries(themeCssVariables(theme)).map(([name, value]) => `${name}:${value};`).join('')}${ALIAS_DECLARATIONS} }
`

export const ThemeCssVariables = () => <Variables />
