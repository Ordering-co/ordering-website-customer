import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaEntry } from '~/utils/themeSchema'
import { cssShadow } from '~/utils/themeCss'
import { CardLogo, WrapLogo } from '../styles'

// The last box-shadow the element's own rules declare (the one that wins)
const lastShadow = (rules) => [...rules.matchAll(/box-shadow: ?([^;]+);/g)].map((m) => m[1].trim()).pop()

const cssOf = (theme, Component, props = {}) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props} />)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

const withImageShadow = (shadow) => themeWithValues((values) => {
  values.components.product_card.base.image_shadow = shadow
  // the card's own shadow never reaches its image
  values.components.product_card.base.shadow = { x: 0, y: 9, blur: 9, spread: 0, color: '#FF0000', opacity: 1 }
  return values
})

describe('product card: the image\'s shadow (components.product_card.base.image_shadow)', () => {
  it('in the schema it is a shadow of the sm level, like the store logo\'s', () => {
    const entry = schemaEntry('components.product_card.base.image_shadow')
    expect(entry).toMatchObject({ type: 'shadow', value: '{shadow.sm}' })
    expect(entry.value).toBe(schemaEntry('components.business_header.base.logo_shadow').value)
  })

  it('by default the image has the store logo\'s shadow', () => {
    const t = themeWithValues()
    const shadow = lastShadow(cssOf(t, CardLogo, { bgimage: 'burger.jpg' }))
    expect(shadow).toBe(cssShadow(t.values.components.business_header.base.logo_shadow))
    expect(shadow).toBe(cssShadow(t.values.components.product_card.base.image_shadow))
    expect(shadow).not.toBe('none')
  })

  it('every image of a card has it (featured, "order it again")', () => {
    const t = themeWithValues()
    const expected = cssShadow(t.values.components.product_card.base.image_shadow)
    ;[{ isFeatured: true }, { isPreviously: true }].forEach((props) => {
      expect(lastShadow(cssOf(t, CardLogo, { bgimage: 'burger.jpg', ...props })), JSON.stringify(props)).toBe(expected)
    })
  })

  it('a theme that sets it wins (not the card\'s shadow)', () => {
    const shadow = { x: 0, y: 4, blur: 12, spread: 0, color: '#112233', opacity: 0.3 }
    expect(lastShadow(cssOf(withImageShadow(shadow), CardLogo, { bgimage: 'burger.jpg' }))).toBe(cssShadow(shadow))
  })

  it('null: no shadow', () => {
    expect(lastShadow(cssOf(withImageShadow(null), CardLogo, { bgimage: 'burger.jpg' }))).toBe('none')
  })

  it('a hidden image draws nothing, not even its shadow', () => {
    expect(cssOf(themeWithValues(), WrapLogo, { hideImage: true })).toMatch(/\.image\{display:none;/)
    expect(cssOf(themeWithValues(), WrapLogo, { isBgimage: true })).not.toContain('display:none')
  })
})
