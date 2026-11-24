import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessLogo, RibbonBox, StoreFavoriteButton, WrapperBusinessLogo, storeLogoSize } from '../styles'
import { BusinessLogo as PreorderBusinessLogo } from '../../BusinessPreorder/styles'
import { schemaEntry } from '~/utils/themeSchema'
import THEME_COMPILED from '~/theme.compiled.json'
import { cssShadow } from '~/utils/themeCss'

const withLogo = (size) => themeWithValues((values) => {
  values.components.business_header.base.logo_size = size
  return values
})

describe('store header: logo size (components.business_header.base.logo_size)', () => {
  it('the theme value (120 by default)', () => {
    expect(storeLogoSize(themeWithValues())).toBe(120)
    expect(storeLogoSize(withLogo(96))).toBe(96)
  })

  it('a size out of range is clamped', () => {
    expect(storeLogoSize(withLogo(-4))).toBe(THEME_COMPILED.values.components.business_header.base.logo_size.$rule[0])
  })

  it('the logo and its box take it from 576px', () => {
    const { getByTestId } = renderWith(withLogo(96), (
      <WrapperBusinessLogo data-testid='wrapper'>
        <BusinessLogo data-testid='logo' bgimage='logo.png' />
      </WrapperBusinessLogo>
    ))
    expect(cssFor(getByTestId('wrapper'))).toMatch(/width: ?96px/)
    expect(cssFor(getByTestId('logo'))).toMatch(/min-height: ?96px/)
  })
})

// The last box-shadow the element's own rules declare (the one that wins)
const lastShadow = (el) => [...cssFor(el).matchAll(/box-shadow: ?([^;]+);/g)].map((m) => m[1].trim()).pop()

describe('store header: logo shadow (components.business_header.base.logo_shadow)', () => {
  it('in the schema the logo shadows default to the product card\'s (the frame of the product image)', () => {
    const productImage = schemaEntry('components.product_card.base.shadow')
    expect(productImage).toMatchObject({ type: 'shadow', value: '{shadow.sm}' })
    ;['business_header', 'business_card'].forEach((component) => {
      expect(schemaEntry(`components.${component}.base.logo_shadow`), component).toMatchObject({ type: 'shadow', value: productImage.value })
    })
  })

  it('by default the logo has the product image\'s shadow', () => {
    const t = themeWithValues()
    const { getByTestId } = renderWith(t, <BusinessLogo data-testid='logo' bgimage='logo.png' />)
    expect(lastShadow(getByTestId('logo'))).toBe(cssShadow(t.values.components.product_card.base.shadow))
  })

  const logoShadow = { x: 0, y: 4, blur: 12, spread: 0, color: '#112233', opacity: 0.3 }
  const withLogoShadow = (shadow) => themeWithValues((values) => {
    values.components.business_header.base.logo_shadow = shadow
    // the card's shadow no longer reaches the logo
    values.components.card.base.shadow = { x: 0, y: 9, blur: 9, spread: 0, color: '#FF0000', opacity: 1 }
    return values
  })

  it('a theme that sets it wins (not the card\'s shadow)', () => {
    const { getByTestId } = renderWith(withLogoShadow(logoShadow), <BusinessLogo data-testid='logo' bgimage='logo.png' />)
    expect(lastShadow(getByTestId('logo'))).toBe(cssShadow(logoShadow))
  })

  it('null: no shadow', () => {
    const { getByTestId } = renderWith(withLogoShadow(null), <BusinessLogo data-testid='logo' bgimage='logo.png' />)
    expect(lastShadow(getByTestId('logo'))).toBe('none')
  })

  it('the store logo of the preorder modal follows it too', () => {
    const { getByTestId } = renderWith(withLogoShadow(logoShadow), <PreorderBusinessLogo data-testid='logo' bgimage='logo.png' />)
    expect(lastShadow(getByTestId('logo'))).toBe(cssShadow(logoShadow))
  })
})

describe('store header: ribbon (components.ribbon)', () => {
  it('the theme\'s inner space and the radius of the rounded shape', () => {
    const t = themeWithValues()
    const { getByText } = renderWith(t, <RibbonBox isRoundRect bgColor='#FF0000'>New</RibbonBox>)
    const css = cssFor(getByText('New'))
    const { padding_y: y, padding_x: x, radius } = t.values.components.ribbon.base
    expect(css).toMatch(new RegExp(`padding: ?${y}px ${x}px;`))
    expect(css).toMatch(new RegExp(`border-radius: ?${radius}px;`))
    // the color stays the data's
    expect(css).toMatch(/background-color: ?#FF0000/)
  })
})

describe('store header: favorite (FavoriteButton)', () => {
  it('a toggle button named "Favorite" with aria-pressed', () => {
    const onClick = vi.fn()
    const { getByRole } = renderWith(themeWithValues(), <StoreFavoriteButton pressed onClick={onClick} />)
    const button = getByRole('button', { name: 'Favorite' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
