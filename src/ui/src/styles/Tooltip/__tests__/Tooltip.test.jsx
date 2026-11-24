import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaEntry } from '~/utils/themeSchema'
import { tooltipOffset, tooltipSurfaceCss } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { FarAwayMessage } from '../../../components/Header/styles'

const tight = (css) => css.replace(/\s+/g, '')

describe('components.tooltip in the schema', () => {
  it('the inverse surface, the caption text, 360 wide at most, sm off its control', () => {
    const base = (prop) => schemaEntry(`components.tooltip.base.${prop}`)
    expect(base('background')).toMatchObject({ type: 'color', value: '{color.inverse_surface}' })
    expect(base('color')).toMatchObject({ type: 'color', value: '{color.on_inverse}' })
    expect(base('text')).toMatchObject({ type: 'text', value: '{typography.caption}' })
    expect(base('max_width')).toMatchObject({ type: 'number', value: 360 })
    expect(base('offset')).toMatchObject({ type: 'space', value: '{space.sm}' })
  })
})

describe('tooltipTheme / tooltipSurfaceCss / tooltipOffset', () => {
  it('its surface from the theme', () => {
    const t = themeWithValues((values) => {
      Object.assign(values.components.tooltip.base, { background: '#101010', color: '#FAFAFA', radius: 6, padding: 10, max_width: 300 })
      return values
    })
    const css = tooltipSurfaceCss(t)
    expect(css).toContain('background: #101010;')
    expect(css).toContain('color: #FAFAFA;')
    expect(css).toContain('border-radius: 6px;')
    expect(css).toContain('padding: 10px;')
    expect(css).toContain('max-width: min(300px, calc(100vw - 32px));')
    expect(css).toContain('border: none;')
    expect(tooltipOffset(t, '10px')).toBe('8px')
  })
})

describe('components.tooltip in the screens', () => {
  it('the header\'s "far away" message: the theme\'s tooltip and a status', () => {
    const t = themeWithValues((values) => { Object.assign(values.components.tooltip.base, { background: '#222222', padding: 9 }); return values })
    const el = renderWith(t, <FarAwayMessage data-testid='far'><span>far</span></FarAwayMessage>).getByTestId('far')
    expect(el).toHaveAttribute('role', 'status')
    const css = tight(cssFor(el))
    expect(css).toMatch(/\.(\w+)\.\1\{[^}]*background:#222222;/)
    expect(css).toMatch(/\.(\w+)\.\1\{[^}]*padding:9px;/)
    expect(css).toMatch(/\.(\w+)\.\1svg\{color:#222222;/)
  })
})
