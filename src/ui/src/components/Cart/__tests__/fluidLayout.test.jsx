import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { DeliveryTooltipAnchor, LoyaltyContainer } from '../styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('Cart: fluid layout', () => {
  it('the delivery explanation is 35 characters wide at most and the loyalty strip a multiple of the theme size', () => {
    const theme = themeWithValues()
    const tip = css(renderWith(theme, <DeliveryTooltipAnchor data-testid='t' />).getByTestId('t'))
    expect(tip).toContain('max-width:min(35ch,85vw);')
    expect(tip).not.toContain('280px')
    const loyalty = css(renderWith(theme, <LoyaltyContainer data-testid='l' />).getByTestId('l'))
    expect(loyalty).toContain(`min-height:calc(1.3*${theme.css.tokens.size.xl});`)
    expect(loyalty).not.toContain('73px')
  })
})
