import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { themeWithValues, renderWith, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { GiftCardContainer, HeroCard, HeroCopy } from '../GiftCardUI/styles'
import { CardLogo } from '../SingleGiftCard/styles'

// implementation notesthe gift card boxes use the media scale and fluid units, no fixed px.
const css = (Box) => {
  cleanup()
  const theme = themeWithValues()
  const { getByTestId } = renderWith(theme, <Box data-testid='box' />)
  return { theme, css: cssFor(getByTestId('box')) }
}

describe('gift card layout', () => {
  it('the page fills the screen less the measured header', () => {
    const { css: out } = css(GiftCardContainer)
    expect(out).toContain('min-height:calc(100dvh - 4 * var(--header-height,')
    expect(out).not.toContain('280px')
  })

  it('the hero card is the 5xl medium and the copy a reading measure', () => {
    const { theme, css: card } = css(HeroCard)
    expect(card).toContain(`width:${theme.values.components.media.base['5xl']}px;`)
    expect(css(HeroCopy).css).toContain('max-width:min(100%,70ch);')
  })

  it('the card logo is the sm medium on both sides', () => {
    const { theme, css: out } = css(CardLogo)
    const sm = `${theme.values.components.media.base.sm}px`
    expect(out).toContain(`width:${sm};`)
    expect(out).toContain(`height:${sm};`)
  })
})
