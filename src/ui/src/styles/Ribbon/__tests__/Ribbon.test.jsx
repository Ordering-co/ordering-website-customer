import { describe, expect, it } from 'vitest'
import { ribbonCss } from '../index'
import { themeWithValues } from '../../__tests__/themeTestUtils'

const flat = (css) => css.replace(/\s+/g, ' ').trim()

describe('components.ribbon', () => {
  it('schema defaults: today\'s ribbon (caption, 2px 8px, the Identity\'s radius for the rounded shape)', () => {
    const t = themeWithValues()
    const { ribbon } = t.values.components
    expect(ribbon.base.text).toEqual(t.values.tokens.typography.caption)
    expect(ribbon.base.padding_y).toBe(t.values.tokens.space.xxs)
    expect(ribbon.base.padding_x).toBe(t.values.tokens.space.sm)
    // radius sm, replaced by the Identity's rounding (tokens.border_style.radius)
    expect(ribbon.base.radius).toBe(t.values.tokens.radius[t.values.tokens.border_style.radius])
  })

  it('text, inner space and the corners of the data\'s shape', () => {
    const t = themeWithValues((values) => {
      values.components.ribbon.base = { text: { size: 11, line: 1.27, weight: 500 }, padding_y: 3, padding_x: 9, radius: 6 }
      return values
    })
    const rect = flat(ribbonCss(t))
    expect(rect).toContain('font-size: 11px;')
    expect(rect).toContain('line-height: 1.27;')
    expect(rect).toContain('font-weight: 500;')
    expect(rect).toContain('padding: 3px 9px;')
    expect(rect).toContain('border-radius: 0;')
    expect(flat(ribbonCss(t, { rounded: true }))).toContain('border-radius: 6px;')
    expect(flat(ribbonCss(t, { capsule: true }))).toContain(`border-radius: ${t.values.tokens.radius.full}px;`)
    // the color is the data's: none from the theme
    expect(rect).not.toMatch(/background|color:/)
  })
})
