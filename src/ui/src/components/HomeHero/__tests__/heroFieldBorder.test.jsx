import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaDefault, schemaEntry } from '~/utils/themeSchema'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { WrapInput } from '../styles'

const withCardBorder = (border) => themeWithValues((values) => {
  values.components.home_hero.base = { ...values.components.home_hero.base, card_border: border }
  return values
})

const fieldCss = (theme) => {
  const { getByRole } = renderWith(theme, <WrapInput>Address</WrapInput>)
  return getByRole('button').style.getPropertyValue('--ui-home-hero-card-border')
}

describe('the hero\'s address field border (home_hero.base.card_border)', () => {
  it('the schema default is no border, as the default Identity (border width none) paints it today', () => {
    expect(schemaEntry('components.home_hero.base.card_border')).toMatchObject({ type: 'border', value: null })
    expect(schemaDefault('tokens.border_style.width')).toBe('none')
    expect(fieldCss(themeWithValues())).toBe('none')
  })

  it('the theme\'s border, at rest and hovered or pressed (no hover of its own)', () => {
    const css = fieldCss(withCardBorder({ width: 2, color: '#123456', style: 'dashed' }))
    expect(css).toBe('2px dashed #123456')
  })
})
