import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { businessLogoCss, CHECKOUT_LOGO_MAX, checkoutStoreRowLogoCss, checkoutStoreRowNameCss, checkoutTotalsBlockCss } from '../checkoutTheme'

const flat = (css) => css.replace(/\s+/g, '')
const withCheckout = (base) => themeWithValues((values) => {
  Object.assign(values.components.checkout.base, base)
  return values
})

// implementation notes (option b): inside proposal B the store row and the totals
// take the theme's business values with a cap
describe('checkout theme values inside proposal B, capped', () => {
  it('business_logo_size: a large one is capped at 40px, a smaller one is kept', () => {
    expect(CHECKOUT_LOGO_MAX).toBe(40)
    expect(flat(checkoutStoreRowLogoCss(themeWithValues()))).toContain('{width:40px;height:40px;}') // default 56
    expect(flat(checkoutStoreRowLogoCss(withCheckout({ business_logo_size: 96 })))).toContain('{width:40px;height:40px;}')
    expect(flat(checkoutStoreRowLogoCss(withCheckout({ business_logo_size: 32 })))).toContain('{width:32px;height:32px;}')
  })

  it('business_name: its face, never larger than the body text, always bold body weight', () => {
    // default: h3 (Montserrat 20px) -> body size (14px), weight 600, Montserrat kept
    const byDefault = checkoutStoreRowNameCss(themeWithValues())
    expect(byDefault).toContain('font-size: 14px;')
    expect(byDefault).toContain('font-weight: 600;')
    expect(byDefault).toMatch(/font-family: .*Montserrat/)
    const large = checkoutStoreRowNameCss(withCheckout({ business_name: { size: 28, line: 1.2, weight: 700, family: 'montserrat' } }))
    expect(large).toContain('font-size: 14px;')
    expect(large).toContain('font-weight: 600;')
    const small = checkoutStoreRowNameCss(withCheckout({ business_name: { size: 12, line: 1.5, weight: 400, family: 'archivo' } }))
    expect(small).toContain('font-size: 12px;')
    expect(small).toContain('font-weight: 600;')
  })

  it('totals_padding: the totals block\'s room above and below it, any value, no card', () => {
    expect(flat(checkoutTotalsBlockCss(themeWithValues()))).toBe('padding-top:16px;padding-bottom:16px;')
    expect(flat(checkoutTotalsBlockCss(withCheckout({ totals_padding: 32 })))).toBe('padding-top:32px;padding-bottom:32px;')
    expect(flat(checkoutTotalsBlockCss(withCheckout({ totals_padding: 0 })))).toBe('padding-top:0px;padding-bottom:0px;')
  })
})

// implementation notesa wide or tall business logo shows whole and centered, in the
// checkout and in the order's details (both use businessLogoCss)
describe('businessLogoCss', () => {
  it('contains the logo in its box, centered, never cropped', () => {
    for (const component of ['checkout', 'order_details']) {
      const css = flat(businessLogoCss(themeWithValues(), component))
      expect(css).toContain('img{object-fit:contain;object-position:center;}')
      expect(css).not.toContain('object-fit:cover')
    }
  })
})
