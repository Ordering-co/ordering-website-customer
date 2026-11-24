import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CardContainer, CardInfo, PriceWrapper, RibbonBox } from '../styles'

// The card reserves its space in the theme's own units (the xl control size, the image size) and in ch,
// not in fixed px
const flat = (el) => cssFor(el).replace(/\s+/g, '')
const theme = themeWithValues()
const xl = theme.values.tokens.size.xl
const draw = (ui) => renderWith(theme, ui)

describe('SingleProductCard: fluid reserves', () => {
  it('a plain card reserves 2 xl rows, 3 with the Add button', () => {
    const plain = draw(<CardContainer data-testid='c' />)
    expect(flat(plain.getByTestId('c'))).toContain(`min-height:calc(2*${xl}px);`)
    plain.unmount()
    const withAdd = draw(<CardContainer data-testid='c' isShowAddButt />)
    expect(flat(withAdd.getByTestId('c'))).toContain(`min-height:calc(3*${xl}px);`)
  })

  it('the carousels\' cards reserve 3.5 xl rows, and 6 (order it again) or 5.5 (featured) from 768px', () => {
    const previous = draw(<CardContainer data-testid='c' isPreviously />)
    const previousCss = flat(previous.getByTestId('c'))
    expect(previousCss).toContain(`min-height:calc(3.5*${xl}px);`)
    expect(previousCss).toContain(`min-height:calc(6*${xl}px);`)
    previous.unmount()
    const featured = draw(<CardContainer data-testid='c' isFeatured />)
    const featuredCss = flat(featured.getByTestId('c'))
    expect(featuredCss).toContain(`min-height:calc(3.5*${xl}px);`)
    expect(featuredCss).toContain(`min-height:calc(5.5*${xl}px);`)
  })

  it('the info beside an image is as tall as it and leaves its width, the theme\'s image size', () => {
    const image = theme.values.components.product_card.base.image_size
    const { getByTestId } = draw(<CardInfo data-testid='i' isBgimage='x' isFavorite />)
    const css = flat(getByTestId('i'))
    expect(css).toContain(`min-height:${image}px;`)
    expect(css).toContain(`width:calc(100%-${image}px);`)
  })

  it('the order-it-again info aligns its cards by 2 xl rows', () => {
    const { getByTestId } = draw(<CardInfo data-testid='i' isPreviously />)
    expect(flat(getByTestId('i'))).toContain(`min-height:calc(2*${xl}px);`)
  })

  it('the price column and the ribbon are sized in ch', () => {
    const price = draw(<PriceWrapper data-testid='p' isOffPrice />)
    expect(flat(price.getByTestId('p'))).toContain('min-width:8ch;')
    price.unmount()
    const ribbon = draw(<RibbonBox data-testid='r' />)
    expect(flat(ribbon.getByTestId('r'))).toContain('max-width:9ch;')
  })
})
