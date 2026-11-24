import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { checkoutMapMarkerColor } from '../checkoutTheme'

const withPrimary = (primary) => themeWithValues((values) => {
  values.tokens.color.primary = primary
  return values
})

// The business's marker on the checkout's map: the theme's primary, as the
// Static Maps API writes a color (0xRRGGBB), whatever CSS color the theme has.
describe('checkoutMapMarkerColor', () => {
  it('a 6-digit hex primary', () => {
    expect(checkoutMapMarkerColor(withPrimary('#1e72e3'))).toBe('0x1E72E3')
  })

  it('a 3-digit hex primary, expanded', () => {
    expect(checkoutMapMarkerColor(withPrimary('#F0A'))).toBe('0xFF00AA')
  })

  it('an rgb() primary', () => {
    expect(checkoutMapMarkerColor(withPrimary('rgb(255, 85, 0)'))).toBe('0xFF5500')
  })

  it('the defaults: the schema\'s primary, never a fixed color', () => {
    const theme = themeWithValues()
    const hex = theme.values.tokens.color.primary.replace('#', '').toUpperCase()
    expect(checkoutMapMarkerColor(theme)).toBe(`0x${hex}`)
  })
})
