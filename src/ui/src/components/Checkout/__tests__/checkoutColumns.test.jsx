import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CartContainer, Container, WrapperLeftContainer, WrapperRightContainer } from '../styles'

const flat = (el) => cssFor(el).replace(/\s+/g, ' ')

describe('checkout columns', () => {
  it('stacked, their sides are the page gutter', () => {
    const theme = themeWithValues((values) => {
      values.tokens.layout.page_gutter = 14
      return values
    })
    const left = renderWith(theme, <WrapperLeftContainer data-testid='left' />).getByTestId('left')
    const right = renderWith(theme, <WrapperRightContainer data-testid='right' />).getByTestId('right')
    expect(left).toHaveStyle({ paddingLeft: '14px', paddingRight: '14px' })
    expect(right).toHaveStyle({ paddingLeft: '14px', paddingRight: '14px' })
  })

  it('no motion of their own', () => {
    const theme = themeWithValues()
    ;[Container, WrapperLeftContainer, WrapperRightContainer].forEach((Column, i) => {
      const el = renderWith(theme, <Column data-testid={`c${i}`} />).getByTestId(`c${i}`)
      expect(flat(el)).not.toMatch(/transition: ?all/)
    })
  })

  // implementation notes round 5: the totals are plain rows of the summary card, a
  // gift card cart's too (no card padding); its subtotal cells keep none
  it('a gift card cart\'s totals: plain rows (no card padding), its subtotal cells without padding', () => {
    const theme = themeWithValues((values) => {
      values.components.checkout.base.totals_padding = 18
      return values
    })
    const el = renderWith(theme, <CartContainer data-testid='cart' hideProductList isGiftCardCart />).getByTestId('cart')
    expect(el).not.toHaveStyle({ padding: '18px' })
    expect(cssFor(el).replace(/\s+/g, '')).toMatch(/table\.subtotaltd\{padding:0px;\}/)
  })
})
