import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessLogoWrapper, ButtonWrapper, Content } from '../styles'

// implementation notesthe card's sizes come from the theme and fluid units, not 95px / 100px / a 0.5 black veil.
describe('SingleOrderCard: layout without fixed pixels', () => {
  it('a closed business logo is veiled with the theme overlay (not rgba 0.5)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.overlay = 'rgba(10, 20, 30, 0.7)'
      return values
    })
    const view = renderWith(theme, <BusinessLogoWrapper isClosed bgimage='logo.png' data-testid='logo' />)
    const image = view.getByTestId('logo').style.backgroundImage
    expect(image).toContain('linear-gradient(rgba(10, 20, 30, 0.7), rgba(10, 20, 30, 0.7))')
    expect(image).not.toContain('0.5')
  })

  it('an open business logo has no veil', () => {
    const view = renderWith(themeWithValues(), <BusinessLogoWrapper bgimage='logo.png' data-testid='logo' />)
    expect(view.getByTestId('logo').style.backgroundImage).not.toContain('linear-gradient')
  })

  it('the actions column keeps 1.75 times the xl size, and each action 13ch', () => {
    const theme = themeWithValues((values) => {
      values.tokens.size.xl = 60
      return values
    })
    const content = cssFor(renderWith(theme, <Content data-testid='content' />).getByTestId('content')).replace(/\s+/g, '')
    expect(content).toContain('min-height:calc(1.75*60px)')
    const buttons = cssFor(renderWith(theme, <ButtonWrapper data-testid='buttons' />).getByTestId('buttons')).replace(/\s+/g, '')
    expect(buttons).toContain('minmax(13ch,max-content)')
    expect(buttons).not.toMatch(/100px/)
  })
})
