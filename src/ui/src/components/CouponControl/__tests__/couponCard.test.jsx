import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CouponContainer, OfferCard } from '../styles'

describe('CouponContainer', () => {
  it('complete theme: a card (components.card); its entry row draws no box of its own', () => {
    const theme = themeWithValues((values) => {
      values.components.card = {
        ...values.components.card,
        base: { ...values.components.card.base, background: '#FAFAFA', radius: 12, border: { width: 1, color: '#2F3032', style: 'solid' }, shadow: null }
      }
      return values
    })
    const { getByTestId } = renderWith(theme, <CouponContainer data-testid='coupon'><button type='button'>Offers</button></CouponContainer>)
    const style = window.getComputedStyle(getByTestId('coupon'))
    expect(style.backgroundColor).toBe('rgb(250, 250, 250)')
    expect(style.border).toBe('1px solid rgb(47, 48, 50)')
    expect(style.borderRadius).toBe('12px')
    expect(style.overflow).toBe('hidden')
    // the row is the ghost Button of the theme: the card writes nothing over it (its ring inside the edge is the Button's `focusInset`)
    expect(injectedCss()).not.toMatch(/> button/)
  })
})

describe('OfferCard', () => {
  it('a card: surface under components.card, not the page background', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color = { ...values.tokens.color, background: '#F0F0F0', surface: '#FEFEFE' }
      values.components.card.base.background = '#FEFEFE'
      return values
    })
    const { getByText } = renderWith(theme, <OfferCard>Offer</OfferCard>)
    const css = cssFor(getByText('Offer'))
    expect(css).toContain('background:#FEFEFE')
    expect(css).not.toContain('#F0F0F0')
  })
})
