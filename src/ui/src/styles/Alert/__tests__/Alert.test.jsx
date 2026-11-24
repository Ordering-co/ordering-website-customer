import React from 'react'
import { describe, expect, it } from 'vitest'
import styled from 'styled-components'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { alertAttrs, alertCss, alertRole, alertRules, alertTheme } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

const flat = (css) => css.replace(/\s+/g, ' ')
const tight = (css) => css.replace(/\s+/g, '')

describe('components.alert in the schema', () => {
  it('four variants on the subtle fill of their color, with its border and icon color', () => {
    expect(schemaKeys('components.alert.variants')).toEqual(['info', 'success', 'warning', 'danger'])
    expect(schemaEntry('components.alert.variants.warning.background')).toMatchObject({ type: 'color', value: '{color.warning_subtle}' })
    expect(schemaEntry('components.alert.variants.danger.icon_color')).toMatchObject({ type: 'color', value: '{color.danger}' })
    expect(schemaEntry('components.alert.base.padding')).toMatchObject({ type: 'space', value: '{space.md}' })
  })
})

describe('alertTheme / alertCss', () => {
  it('the variant merged over the base', () => {
    const t = themeWithValues()
    const props = alertTheme(t, 'warning')
    expect(props.background).toBe(t.values.tokens.color.warning_subtle)
    expect(props.icon_color).toBe(t.values.tokens.color.warning)
    expect(props.padding).toBe(12)
    expect(props.gap).toBe(8)
    // the defaults' Identity has no borders (tokens.border_style.width none)
    expect(props.border).toBeNull()
  })

  it('an unknown variant is the info one', () => {
    const t = themeWithValues()
    expect(alertTheme(t, 'nope')).toEqual(alertTheme(t, 'info'))
  })

  it('the box of the theme: padding, gap, radius, fill, text color, border and the icon', () => {
    const t = themeWithValues((values) => {
      values.components.alert.variants.danger.background = '#FFEEEE'
      values.components.alert.variants.danger.icon_color = '#CC0000'
      values.components.alert.base.icon_size = 22
      values.components.alert.variants.danger.border = { width: 1, color: '#CC0000', style: 'solid' }
      return values
    })
    const css = flat(alertCss(t, 'danger'))
    expect(css).toContain('padding: 12px;')
    expect(css).toContain('gap: 8px;')
    expect(css).toContain('background: #FFEEEE;')
    expect(css).toContain('border: 1px solid')
    expect(css).toContain('> svg { position: static; flex: none; margin: 0; width: 22px; height: 22px; font-size: 22px; color: #CC0000; }')
    expect(css).toContain('opacity: 1;')
  })

  it('a null border is none', () => {
    const t = themeWithValues((values) => { values.components.alert.variants.info.border = null; return values })
    expect(alertCss(t, 'info')).toContain('border: none;')
  })

  it('alertRules doubles the class to win over the spot', () => {
    expect(alertRules(themeWithValues(), 'info').startsWith('&& {')).toBe(true)
    expect(alertRules(themeWithValues(), 'info', { specificity: 3 }).startsWith('&&& {')).toBe(true)
  })
})

describe('roles', () => {
  it('danger is an alert; the rest a status', () => {
    expect(alertRole('danger')).toBe('alert')
    expect(alertRole('warning')).toBe('status')
    expect(alertRole('info')).toBe('status')
    expect(alertRole('success')).toBe('status')
  })

  it('alertAttrs: the role of the variant', () => {
    expect(alertAttrs('danger')({ theme: themeWithValues() })).toEqual({ role: 'alert' })
  })

  it('a spot with alertAttrs takes the role', () => {
    const Spot = styled.p.attrs(alertAttrs('warning'))``
    const { getByText } = renderWith(themeWithValues(), <Spot>msg</Spot>)
    expect(getByText('msg').getAttribute('role')).toBe('status')
  })
})

describe('hover', () => {
  it('hovered the alert stays at rest (its fill, border and shadow over a spot\'s hover)', () => {
    const t = themeWithValues((values) => {
      values.components.alert.variants.warning.background = '#FFF8E0'
      values.components.alert.base.shadow = null
      return values
    })
    const css = flat(alertCss(t, 'warning'))
    expect(css).toMatch(/&:hover \{ transform: none; background: #FFF8E0; border: [^;]+; box-shadow: none; \}/)
  })

  it('a spot with a hover glow of its own keeps the alert\'s shadow on hover', () => {
    const Spot = styled.div`
      box-shadow: 0 2px 8px red;
      &:hover { box-shadow: 0 4px 12px red; }
      ${({ theme }) => alertRules(theme, 'warning')}
    `
    const { getByText } = renderWith(themeWithValues((values) => { values.components.alert.base.shadow = null; return values }), <Spot>w</Spot>)
    expect(tight(cssFor(getByText('w')))).toMatch(/\.([\w-]+)\.\1:hover\{[^}]*transform:none;[^}]*box-shadow:none;\}/)
  })
})
