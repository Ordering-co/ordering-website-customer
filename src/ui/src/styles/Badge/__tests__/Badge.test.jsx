import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { Badge, BADGE_VARIANTS, badgeCss } from '../index'
import { renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

afterEach(cleanup)

const flat = (css) => css.replace(/\s+/g, ' ').trim()

describe('components.badge in the schema', () => {
  it('variants neutral, inverse and warning next to primary, danger and success', () => {
    const { badge } = themeWithValues().values.components
    BADGE_VARIANTS.forEach((variant) => expect(badge.variants[variant]).toEqual(expect.objectContaining({
      background: expect.any(String),
      color: expect.any(String)
    })))
    const { color } = themeWithValues().values.tokens
    expect(badge.variants.neutral).toEqual({ background: color.border, color: color.text })
    expect(badge.variants.inverse).toEqual({ background: color.inverse_surface, color: color.on_inverse })
    expect(badge.variants.warning).toEqual({ background: color.warning, color: color.on_warning })
  })

  it('sizes sm and md (height, padding_x) and the count shape (round)', () => {
    const t = themeWithValues()
    const { badge } = t.values.components
    expect(badge.sizes.sm).toEqual({ height: 20, padding_x: t.values.tokens.space.sm })
    expect(badge.sizes.md).toEqual({ height: 24, padding_x: t.values.tokens.space.md })
    expect(badge.shapes.count.radius).toBe(t.values.tokens.radius.full)
  })
})

describe('badgeCss', () => {
  it('the variant\'s colors, the size\'s height and side space', () => {
    const t = themeWithValues((values) => {
      values.components.badge.variants.warning = { background: '#FFAA00', color: '#111111' }
      values.components.badge.sizes.md = { height: 26, padding_x: 10 }
      return values
    })
    const css = flat(badgeCss(t, { variant: 'warning', size: 'md' }))
    expect(css).toContain('background: #FFAA00;')
    expect(css).toContain('color: #111111;')
    expect(css).toContain('height: 26px; min-height: 26px;')
    expect(css).toContain('padding: 0 10px;')
    expect(css).toContain('box-shadow: none;')
  })

  it('a count: as wide as tall, xs at its sides, the count radius', () => {
    const t = themeWithValues((values) => {
      values.components.badge.sizes.sm = { height: 18, padding_x: 6 }
      values.components.badge.shapes.count.radius = 9999
      return values
    })
    const css = flat(badgeCss(t, { variant: 'neutral', size: 'sm', count: true }))
    expect(css).toContain('min-width: 18px;')
    expect(css).toContain(`padding: 0 ${t.values.tokens.space.xs}px;`)
    expect(css).toContain('border-radius: 9999px;')
    expect(css).toContain('font-variant-numeric: tabular-nums;')
    expect(css).not.toContain('padding: 0 6px;')
  })

  it('the weight a spot declares today is kept over the theme\'s text', () => {
    const t = themeWithValues()
    expect(flat(badgeCss(t, { weight: 'bold' }))).toMatch(/font-weight: bold;$/)
    expect(flat(badgeCss(t, { weight: 700 }))).toMatch(/font-weight: 700;$/)
    expect(flat(badgeCss(t, { weight: '700; color: red' }))).not.toContain('red')
  })

  it('an unknown size is sm; an unknown variant is the primary', () => {
    const t = themeWithValues()
    const css = flat(badgeCss(t, { variant: 'nope', size: 'xl' }))
    expect(css).toContain('height: 20px;')
    expect(css).toContain(`background: ${t.values.components.badge.variants.primary.background};`)
  })

  it('the Badge component paints it', () => {
    const t = themeWithValues((values) => {
      values.components.badge.variants.neutral = { background: '#EEEEEE', color: '#222222' }
      return values
    })
    const { getByText } = renderWith(t, <Badge $variant='neutral' $size='md' $count>3</Badge>)
    expect(getByText('3')).toHaveStyle({ backgroundColor: '#EEEEEE', color: '#222222', minWidth: '24px', height: '24px' })
    expect(getByText('3').tagName).toBe('SPAN')
  })
})
