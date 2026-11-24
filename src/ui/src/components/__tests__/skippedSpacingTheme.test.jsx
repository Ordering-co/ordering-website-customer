import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../styles/__tests__/themeTestUtils'
import { themeColor } from '~/utils/themeColors'
import { Container as CartContentContainer, MultiCartPriceContainer } from '../CartContent/styles'
import { Container as StudentSelectorContainer } from '../StudentSelector/styles'
import { FormGroup, Label, StepActions } from '../CustomOrderModal/styles'
import { ProductEdition, ProductInfo, Properties, VideoGalleryWrapper, closeReach } from '../ProductForm/styles'

const cssOf = (theme, Component, props = {}) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props} />)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

const themed = themeWithValues()
const space = (level) => `${themed.values.tokens.space[level]}px`

describe('spaces of the theme where px were fixed', () => {
  it('CartContent: md around the cart, xl above the totals of all carts', () => {
    expect(cssOf(themed, CartContentContainer)).toContain(`padding:0px ${space('md')}`)
    expect(cssOf(themed, MultiCartPriceContainer)).toContain(`margin-top:${space('xl')}`)
  })

  it('StudentSelector: a field (label_gap), sm above and lg below', () => {
    const css = cssOf(themed, StudentSelectorContainer)
    expect(css).toContain(`gap:${themed.values.components.field.base.label_gap}px`)
    expect(css).toContain(`margin:${space('sm')} 0 ${space('lg')}`)
  })

  it('CustomOrderModal: the form\'s rhythm (field gap and label_gap), lg above the actions', () => {
    expect(cssOf(themed, FormGroup)).toContain(`margin-bottom:${themed.values.components.field.base.gap}px`)
    expect(cssOf(themed, Label)).toContain(`margin-bottom:${themed.values.components.field.base.label_gap}px`)
    expect(cssOf(themed, StepActions)).toContain(`padding-top:${space('lg')}`)
  })

  it('ProductForm: the blocks lg apart, the room under the close without image, the play icon color', () => {
    expect(cssOf(themed, ProductEdition)).toContain(`margin-bottom:${space('lg')}`)
    expect(cssOf(themed, Properties)).toContain(`margin-bottom:${space('lg')}`)
    expect(cssOf(themed, ProductInfo, { noImage: true })).toContain(`padding-top:${closeReach(themed)}`)
    // the play is a stroke icon of the base Icon (size='lg' in ProductForm): the wrapper sets no size, only its color on the image
    const play = cssOf(themed, VideoGalleryWrapper)
    expect(play).not.toContain('font-size')
    expect(play).toContain(`color:${themeColor(themed, 'on_overlay')}`)
  })
})
