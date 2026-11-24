import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaEntry } from '~/utils/themeSchema'
import { cssShadow } from '~/utils/themeCss'
import { HorizontalDetails, HorizontalImage, HorizontalItem, Image } from '../styles'

const cssOf = (theme, Component, props = {}) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props} />)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

const withCard = (base) => themeWithValues((values) => {
  Object.assign(values.components.product_card.base, base)
  return values
})

describe('a suggested product (UpsellingPage, components.product_card)', () => {
  it('the schema: the width of the card and its images (today\'s 230, 80 and 125px)', () => {
    const base = (prop) => schemaEntry(`components.product_card.base.${prop}`)
    expect(base('upselling_width')).toMatchObject({ type: 'number', value: 230 })
    expect(base('upselling_image_size')).toMatchObject({ type: 'number', value: 80 })
    expect(base('upselling_cart_image_size')).toMatchObject({ type: 'number', value: 125 })
  })

  it('the card\'s width, padding and image sizes, the products\' gap', () => {
    const theme = withCard({ upselling_width: 260, upselling_image_size: 90, upselling_cart_image_size: 110, padding: 16 })
    const item = cssOf(theme, HorizontalItem)
    expect(item).toContain('width:260px')
    expect(item).toContain(`margin-right:${theme.values.components.product_section.base.gap}px`)
    expect(item).toContain('padding:16px')
    const image = cssOf(theme, HorizontalImage)
    expect(image).toContain('width:90px')
    expect(image).toContain(`margin-left:${theme.values.tokens.space.sm}px`)
    expect(cssOf(theme, HorizontalImage, { fromCartPopover: true })).toContain('width:110px')
    expect(cssOf(theme, HorizontalDetails, { fromCartPopover: true })).toContain('max-width:110px')
    // in the cart, as wide as its image: no width of its own
    expect(cssOf(theme, HorizontalItem, { fromCartPopover: true })).not.toContain('width:260px')
  })

  it('its image has the product image\'s shadow (base.image_shadow); a theme\'s wins, null → none', () => {
    const imgShadow = (rules) => [...rules.matchAll(/img\{[^}]*box-shadow:([^;]+);/g)].map((m) => m[1].trim()).pop()
    const t = themeWithValues()
    const byDefault = cssShadow(t.values.components.product_card.base.image_shadow)
    expect(byDefault).not.toBe('none')
    expect(imgShadow(cssOf(t, HorizontalImage))).toBe(byDefault)
    expect(imgShadow(cssOf(t, HorizontalImage, { fromCartPopover: true }))).toBe(byDefault)
    expect(imgShadow(cssOf(t, Image))).toBe(byDefault)
    const shadow = { x: 0, y: 4, blur: 12, spread: 0, color: '#112233', opacity: 0.3 }
    expect(imgShadow(cssOf(withCard({ image_shadow: shadow }), HorizontalImage))).toBe(cssShadow(shadow))
    expect(imgShadow(cssOf(withCard({ image_shadow: null }), HorizontalImage))).toBe('none')
  })
})
