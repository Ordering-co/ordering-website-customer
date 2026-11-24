import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { withAlpha } from '~/utils/themeColors'
import { CardContainer, soldOutTintCss } from '../styles'

// A sold-out card keeps the theme's background (components.product_card)
// with the tint over it, not under it: the background shorthand of the theme
// would otherwise cover the tint, leaving only the opacity.
const CARD = '#FFEEDD'
const MUTED = '#336699'
const theme = themeWithValues((values) => {
  values.tokens.color.text_muted = MUTED
  values.components.product_card.base.background = CARD
  return values
})
const tight = (css) => css.replace(/\s+/g, '')
const cardCss = (props) => tight(cssFor(renderWith(theme, <CardContainer data-testid='card' {...props} />).getByTestId('card')))
const TINT = tight(withAlpha(MUTED, 51 / 255))

describe('the sold-out tint of the product card', () => {
  it('is the muted text at 20%, a layer over the background', () => {
    expect(tight(soldOutTintCss(theme))).toBe(`background-image:linear-gradient(${TINT},${TINT});`)
  })

  it('shows over the theme background, after it (its shorthand resets the image)', () => {
    const css = cardCss({ soldOut: true })
    const background = css.lastIndexOf(`background:${CARD};`)
    const tint = css.indexOf(`background-image:linear-gradient(${TINT},${TINT});`)
    expect(background).toBeGreaterThan(-1)
    expect(tint).toBeGreaterThan(background)
    // and the sold-out opacity of components.product_card still applies
    expect(css).toContain('opacity:0.5;')
  })

  it('a card on sale keeps the theme background alone', () => {
    const css = cardCss({})
    expect(css).toContain(`background:${CARD};`)
    expect(css).not.toContain('background-image:linear-gradient')
    expect(css).not.toContain('opacity:0.5;')
  })
})
