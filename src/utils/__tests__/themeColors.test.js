import { describe, it, expect } from 'vitest'
import { isTransparent, onPrimary, primaryText, themeColor, withAlpha } from '../themeColors'
import { schemaDefault } from '../themeSchema'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

const withTokens = (color) => themeWithValues((values) => {
  Object.assign(values.tokens.color, color)
  return values
})
const theme = withTokens({ primary: '#FF5500', on_primary: '#FFFFFF', primary_subtle: '#FFEBE0', success: '#00AA00' })

describe('themeColors', () => {
  it('themeColor reads a token by its name', () => {
    expect(themeColor(theme, 'primary')).toBe('#FF5500')
    expect(themeColor(theme, 'primary_subtle')).toBe('#FFEBE0')
    expect(themeColor(themeWithValues(), 'rating')).toBe(schemaDefault('tokens.color.rating'))
  })

  it('a transparent token is transparent', () => {
    expect(themeColor(withTokens({ surface: 'transparent' }), 'surface')).toBe('transparent')
  })

  it('onPrimary is on_primary', () => {
    expect(onPrimary(theme)).toBe('#FFFFFF')
  })

  it('withAlpha is the rgba of the hex suffix it replaces', () => {
    expect(withAlpha('#2C7BE5', 64 / 255)).toMatch(/^rgba\(44,123,229,0\.25/)
    expect(withAlpha('#ED4337', 128 / 255)).toMatch(/^rgba\(237,67,55,0\.50/)
  })

  it('withAlpha falls back for a color it cannot parse', () => {
    expect(withAlpha(undefined, 0.5)).toBe('transparent')
    expect(withAlpha('transparent', 0.5)).toBe('transparent')
    expect(withAlpha('{color.primary}', 0.5)).toBe('transparent')
    expect(withAlpha('azul', 0.5, '#000')).toBe('#000')
  })
})

describe('isTransparent', () => {
  // (a theme's color is a hex, rgb() or rgba(), or transparent)
  it('is true for transparent and any color with an alpha of 0', () => {
    ;['transparent', ' Transparent ', 'rgba(0,0,0,0)', 'rgba(255, 255, 255, 0)', '#FFFFFF00']
      .forEach((value) => expect(isTransparent(value), value).toBe(true))
  })

  it('is false for a color that paints something, and for what is not a color', () => {
    ;['#FFFFFF', 'rgba(0,0,0,0.4)', '#00000080', 'red', '{color.overlay}', 'azul', '', null, undefined, 0]
      .forEach((value) => expect(isTransparent(value), String(value)).toBe(false))
  })
})

describe('primaryText (tokens.color.primary_text)', () => {
  it('is primary_text', () => {
    expect(primaryText(withTokens({ primary: '#FFD600', primary_text: '#7A6600' }))).toBe('#7A6600')
  })

  it('the schema defaults: primary_text at 4.5:1 on primary_subtle, on_overlay white', () => {
    expect(schemaDefault('tokens.color.primary_text')).toBe('#1B6BD7')
    expect(schemaDefault('tokens.color.on_overlay')).toBe('#FFFFFF')
  })
})
