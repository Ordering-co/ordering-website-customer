import React from 'react'
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, ThemeProvider } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { BackLink } from '../BackLink'
import { MobileCartActions, ProductsContainer } from '../styles'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

describe('MobileCartActions', () => {
  it('retains the desktop total typography, aligned with the progress message above it', () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToString(sheet.collectStyles(<ThemeProvider theme={themeWithValues()}><MobileCartActions><span>$12</span></MobileCartActions></ThemeProvider>))
      const css = sheet.getStyleTags()
      expect(css).toContain('@media (min-width:1200px)')
      expect(css).toContain('font-size:18px')
      // aligned with the free delivery box above it: no padding of its own
      expect(css).not.toContain('padding-left:20px')
    } finally {
      sheet.seal()
    }
  })
})

describe('BackLink (the back arrow of the store)', () => {
  it('a button of the theme (business_header.slots.back, ghost neutral icon)', () => {
    const theme = themeWithValues()
    const link = renderWith(theme, <BackLink label='Back' />).getByRole('link', { name: 'Back' })
    expect(link).toHaveAttribute('href', '/search')
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link.style.getPropertyValue('--ui-button-height')).toBe(`${theme.values.components.button.sizes.md.height}px`)
  })

  it('the slot decides its look (a solid primary back)', () => {
    const theme = themeWithValues((values) => {
      values.components.business_header.slots.back = { ...values.components.business_header.slots.back, appearance: 'solid', color: 'primary' }
      return values
    })
    const link = renderWith(theme, <BackLink label='Back' />).getByRole('link', { name: 'Back' })
    expect(link.style.getPropertyValue('--ui-button-background')).toBe(theme.values.components.button.variants.primary.solid.background)
  })
})

describe('ProductsContainer (the store\'s box)', () => {
  const flat = (text) => text.replace(/\s+/g, '')
  const box = (theme, props = {}) => renderWith(theme, <ProductsContainer data-testid='box' singleBusinessRedirect {...props} />).getByTestId('box')

  it('xl under the header (the back arrow and the banner are not glued to it)', () => {
    const theme = themeWithValues()
    expect(flat(cssFor(box(theme)))).toContain(`margin-top:${theme.values.tokens.space.xl}px`)
  })

  it('with the order context docked under the header: its margin is the room, none of its own', () => {
    expect(flat(cssFor(box(themeWithValues(), { $docked: true })))).not.toMatch(/margin-top:\d/)
  })
})
