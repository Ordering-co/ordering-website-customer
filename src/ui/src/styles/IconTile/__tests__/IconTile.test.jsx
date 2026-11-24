import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaDefault, schemaKeys } from '~/utils/themeSchema'
import { iconTileCss, iconTileTheme } from '../index'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { AppliedOfferIcon, OfferRate } from '../../../components/CouponControl/styles'
import { CardItemContent } from '../../../components/Checkout/styles'

const tight = (css) => css.replace(/\s+/g, '')

describe('components.icon_tile in the schema', () => {
  it('the three boxes of today (38, 50×44, 56×48) and three variants', () => {
    const size = (name, prop) => schemaDefault(`components.icon_tile.sizes.${name}.${prop}`)
    expect(size('sm', 'width')).toBe(38)
    expect([size('md', 'width'), size('md', 'height')]).toEqual([50, 44])
    expect([size('lg', 'width'), size('lg', 'height')]).toEqual([56, 48])
    expect(schemaKeys('components.icon_tile.variants')).toEqual(['subtle', 'outline', 'primary'])
  })
})

describe('iconTileTheme / iconTileCss', () => {
  it('base, variant and size merged; unknown ones are subtle / sm', () => {
    const t = themeWithValues()
    expect(iconTileTheme(t, { size: 'lg', variant: 'primary' })).toMatchObject({ width: 56, height: 48, icon_size: 18, background: t.values.tokens.color.primary })
    expect(iconTileTheme(t, { size: 'x', variant: 'y' })).toEqual(iconTileTheme(t))
  })

  it('the box of its size, its fill, border and shadow, its icon at the size\'s icon size', () => {
    const t = themeWithValues((values) => {
      values.components.icon_tile.variants.outline.background = '#FFFFFF'
      values.components.icon_tile.variants.outline.border = { width: 1, color: '#DDDDDD', style: 'solid' }
      return values
    })
    const css = tight(iconTileCss(t, { size: 'md', variant: 'outline' }))
    expect(css).toContain('width:50px;min-width:50px;')
    expect(css).toContain('height:44px;min-height:44px;')
    expect(css).toContain('background:#FFFFFF;')
    expect(css).toMatch(/border:1pxsolid/)
    expect(css).toContain('svg{color:inherit;transform:none;transition:none;width:26px;height:26px;font-size:26px;}')
  })
})

describe('components.icon_tile in the screens', () => {
  it('the offer\'s rate: lg, primary; the applied offer\'s icon: lg, subtle', () => {
    const t = themeWithValues((values) => { values.components.icon_tile.sizes.lg.width = 60; return values })
    const rate = renderWith(t, <OfferRate data-testid='r'>10%</OfferRate>).getByTestId('r')
    expect(tight(cssFor(rate))).toMatch(new RegExp(`\\.([\\w-]+)\\.\\1\\{[^}]*width:60px;[^}]*background:${t.values.tokens.color.primary}`))
    const icon = renderWith(t, <AppliedOfferIcon data-testid='a' />).getByTestId('a')
    expect(tight(cssFor(icon))).toMatch(/\.([\w-]+)\.\1\{[^}]*width:60px;/)
  })

  it('the payment card\'s brand: md, outline', () => {
    renderWith(themeWithValues(), <CardItemContent><span className='brand' /></CardItemContent>)
    expect(tight(injectedCss())).toMatch(/\.brand\{[^}]*width:50px;min-width:50px;height:44px;/)
  })
})
