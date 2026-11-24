import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OfferWrapper, BusinessLogo } from '../styles'

// implementation notesthe logo box is the 3xs media level and the offer tile a multiple of the theme's size
const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('Promotions: media and fluid layout', () => {
  it('the logo box is the 3xs level at every width, with the store\'s own value', () => {
    const theme = themeWithValues((values) => {
      values.components.media = { base: { '3xs': 77 } }
      return values
    })
    const out = css(renderWith(theme, <BusinessLogo data-testid='l' />).getByTestId('l'))
    expect(out).toContain('width:77px;height:77px;')
    expect(out).toContain('min-height:77px;')
  })

  it('the offer tile keeps two and a half of the largest control height', () => {
    const theme = themeWithValues()
    const out = css(renderWith(theme, <OfferWrapper data-testid='o' />).getByTestId('o'))
    expect(out).toContain(`min-height:calc(2.5*${theme.css.tokens.size.xl});`)
    expect(out).not.toContain('140px')
  })
})
