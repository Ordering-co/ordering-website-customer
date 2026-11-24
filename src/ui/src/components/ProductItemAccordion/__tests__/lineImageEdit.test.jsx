import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Button } from '~ui/src/design-system/components/Button'
import { themeSize } from '~/utils/themeTokens'
import { IconContainer, ProductImage, WrapperProductImage } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')

// The photo of a cart line that edits the product: nothing covers it (no
// gray layer) and its pencil is a small button of the theme in the image's
// corner, at every width (a touch screen has no hover to reveal it).
const renderImage = (theme) => {
  const utils = renderWith(theme, (
    <ProductImage bgimage='/burger.png' data-testid='image'>
      <IconContainer data-testid='pencil-position'><Button decorative iconLine borderInset layout='row' shape='icon' size='xs' color='neutral' /></IconContainer>
    </ProductImage>
  ))
  return { image: flat(cssFor(utils.getByTestId('image'))), pencil: utils.container.querySelector('[data-slot=button-decoration]'), position: flat(cssFor(utils.getByTestId('pencil-position'))) }
}

describe('a cart line\'s image that edits the product', () => {
  it('no gray layer over the photo', () => {
    expect(renderImage(themeWithValues()).image).not.toContain('::before')
  })

  it('the pencil is the xs icon button of the theme (solid neutral), xs inside the corner', () => {
    const theme = themeWithValues()
    const { pencil, position } = renderImage(theme)
    const xs = theme.values.components.button.sizes.xs.height
    const inset = theme.values.tokens.space.xs
    expect(pencil.style.getPropertyValue('--ui-button-height')).toBe(`${xs}px`)
    expect(position).toContain(`inset-inline-end:${inset}px;bottom:${inset}px;`)
    expect(pencil.style.getPropertyValue('--ui-button-background')).toBe(theme.values.components.button.variants.neutral.solid.background)
  })
})

it('caps the cart photo with size.lg below 361px and size.xl below 411px', () => {
  const theme = themeWithValues((values) => {
    values.components.cart.base.line_image_size = 80
    values.tokens.size.lg = 47
    values.tokens.size.xl = 57
  })
  const { getByTestId } = renderWith(theme, <WrapperProductImage data-testid='cart-photo' />)
  const rules = flat(cssFor(getByTestId('cart-photo')))
  expect(rules).toContain(`width:min(80px,${themeSize(theme, 'lg')});`)
  const tabletBracket = rules.split('@media(min-width:361px)')[1]?.split('@media(min-width:411px)')[0]
  expect(tabletBracket).toContain(`width:min(80px,${themeSize(theme, 'xl')});`)
  expect(rules).toMatch(/@media\(min-width:411px\)\{[^}]*width:80px;/)
})
