import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessContainer, BusinessLogo } from '../styles'

// The store header's cover and logo (components.card)
describe('store header: cards (cover, logo)', () => {
  it('the banner and the logo are cards too', () => {
    const theme = themeWithValues((values) => {
      values.components.card = {
        ...values.components.card,
        base: { ...values.components.card.base, background: '#FAFAFA', radius: 12, border: { width: 1, color: '#2F3032', style: 'solid' }, shadow: null }
      }
      return values
    })
    const { getByTestId } = renderWith(theme, <><BusinessContainer data-testid='banner' /><BusinessLogo data-testid='logo' /></>)
    ;['banner', 'logo'].forEach((id) => {
      const style = window.getComputedStyle(getByTestId(id))
      expect(style.border).toBe('1px solid rgb(47, 48, 50)')
      expect(style.borderRadius).toBe('12px')
    })
  })
})
