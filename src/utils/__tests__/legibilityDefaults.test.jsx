import React from 'react'
import { describe, it, expect } from 'vitest'
import { contrast as getContrast } from '@orderingco/ordering-theme-engine/colors'
import { schemaDefault } from '../themeSchema'
import { THEME_DEFAULTS as defaults } from '~/utils/appTheme'
import { spec } from './fixtures/schemaSpecs'
import { buildCompleteValues } from './fixtures/themeFixtures'
import { cssFor, renderWith, themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'
import { BusinessInfoItem } from '../../ui/src/components/BusinessBasicInformation/styles'
import { ProductDescription } from '../../ui/src/components/ProductForm/styles'

// The default of a prop of a component's base.
const base = (component, prop) => schemaDefault(['components', component, 'base', prop])

describe('schema: legibility with dark themes and light primaries', () => {
  it('the primary as text follows color.primary_text', () => {
    expect(spec('components.tabs.variants.pill.active')).toEqual({ type: 'color', default: '{color.primary_text}' })
    expect(base('bottom_nav', 'active')).toBe('{color.primary_text}')
    expect(base('sidebar_menu', 'title_color')).toBe('{color.primary_text}')
    expect(base('sidebar_menu', 'item_active')).toBe('{color.primary_text}')
    expect(base('order_card', 'status_color')).toBe('{color.primary_text}')
    expect(base('order_tracking', 'status_color')).toBe('{color.primary_text}')
    expect(base('order_tracking', 'eta_color')).toBe('{color.primary_text}')
    expect(base('offer_card', 'code_color')).toBe('{color.primary_text}')
    expect(base('timer', 'color')).toBe('{color.primary_text}')
    expect(base('date_strip', 'selected_color')).toBe('{color.primary_text}')
    expect(base('business_types', 'label_active_color')).toBe('{color.primary_text}')
    expect(base('home_hero', 'field_icon_color')).toBe('{color.primary_text}')
    expect(schemaDefault('components.icon_tile.variants.subtle.color')).toBe('{color.primary_text}')
    expect(schemaDefault('components.steps.variants.default.states.active.color')).toBe('{color.primary_text}')
    // fills and lines keep the primary
    expect(schemaDefault('components.tabs.variants.underline.indicator')).toBe('{color.primary}')
    expect(base('order_tracking', 'step_active')).toBe('{color.primary}')
  })

  it('the error, success and warning as text follow their *_text color; icons, borders and fills keep the color', () => {
    expect(base('field', 'error_color')).toBe('{color.danger_text}')
    expect(base('timer', 'expired_color')).toBe('{color.danger_text}')
    expect(base('sidebar_menu', 'item_danger')).toBe('{color.danger_text}')
    expect(base('wallet_transaction', 'debit_color')).toBe('{color.danger_text}')
    expect(base('wallet_transaction', 'credit_color')).toBe('{color.success_text}')
    expect(schemaDefault('components.link.variants.danger.color')).toBe('{color.danger_text}')
    expect(schemaDefault('components.alert.variants.danger.icon_color')).toBe('{color.danger}')
    expect(schemaDefault('components.input.variants.default.states.error.border').color).toBe('{color.danger}')
    expect(base('product_option', 'error')).toBe('{color.danger}')
  })

  it('texts on a dark overlay are on_overlay', () => {
    expect(base('business_header', 'closed_color')).toBe('{color.on_overlay}')
    expect(base('home_hero', 'title_color')).toBe('{color.on_overlay}')
    expect(base('order_type_card', 'color')).toBe('{color.on_overlay}')
    expect(base('business_card', 'status_color')).toBe('{color.on_overlay}')
  })

  it('the solid disabled button: text_muted, ≥3:1 on the disabled fill', () => {
    expect(spec('components.button.appearances.solid.states.disabled.color')).toEqual({ type: 'color', default: '{color.text_muted}' })
    const values = buildCompleteValues()
    expect(values.components.button.variants.primary.solid.states.disabled).toEqual({
      background: values.tokens.color.disabled,
      color: values.tokens.color.text_muted
    })
  })

  it('body paragraphs of the product and the store are body_lg', () => {
    expect(base('product_modal', 'description')).toBe('{typography.body_lg}')
    expect(base('business_header', 'address')).toBe('{typography.body_lg}')
    expect(base('business_header', 'description')).toBe('{typography.body_lg}')
  })

  it('order_details.map_style: light | dark, light by default', () => {
    expect(spec('components.order_details.base.map_style')).toEqual({ type: 'option', default: 'light', options: ['light', 'dark'] })
  })
})

describe('rendering', () => {
  // The default fonts: Montserrat for headings, Archivo for body texts
  it('the product description and the store address/description in the body font', () => {
    const theme = themeWithValues()
    const { container } = renderWith(theme, <ProductDescription>Fresh</ProductDescription>)
    expect(cssFor(container.firstChild)).toMatch(/font-family:\s*['"]?Archivo/)
    expect(cssFor(container.firstChild)).not.toMatch(/Montserrat/)

    const info = renderWith(theme, <BusinessInfoItem><span className='address'>Main St</span><span className='description'>Pizza</span></BusinessInfoItem>)
    const css = cssFor(info.container.firstChild)
    const address = css.split('}').find((rule) => rule.includes('.address'))
    const description = css.split('}').find((rule) => rule.includes('.description'))
    expect(address).toMatch(/font-family:\s*['"]?Archivo/)
    expect(address).toMatch(/font-size:\s*16px/)
    expect(description).toMatch(/font-family:\s*['"]?Archivo/)
    expect(description).toMatch(/font-size:\s*16px/)
  })

  // implementation notes"Closed" is under the store's name, on the page, not over the cover's overlay
  it('"Closed" under the name is the text color with a dark theme (not the cover\'s on_overlay)', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.tokens.color, { text: '#EEEEEE', background: '#121212', on_overlay: '#FFFFFF' })
      return values
    })
    const { container } = renderWith(theme, <BusinessInfoItem><p className='closed'>Closed</p></BusinessInfoItem>)
    const closed = cssFor(container.firstChild).split('}').find((rule) => rule.includes('.closed'))
    expect(closed).toMatch(/color:\s*#EEEEEE/i)
  })
})

describe('the default colors meet WCAG AA (4.5:1) where they are text', () => {
  const { color } = defaults.tokens
  const { colors } = defaults.components.button

  it('as text over the page, and the muted text over surface_alt too', () => {
    ;['text', 'text_muted', 'primary_text', 'danger_text', 'success_text', 'warning_text'].forEach((token) => {
      expect(getContrast(color[token], color.background), token).toBeGreaterThanOrEqual(4.5)
    })
    expect(getContrast(color.text_muted, color.surface_alt)).toBeGreaterThanOrEqual(4.5)
  })

  it('the text on each fill (on_*)', () => {
    ;['primary', 'secondary', 'success', 'warning', 'danger', 'info'].forEach((token) => {
      expect(getContrast(color[`on_${token}`], color[token]), token).toBeGreaterThanOrEqual(4.5)
    })
    expect(getContrast(color.on_inverse, color.inverse_surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('the button colors: on over main, ink over the page and over subtle', () => {
    Object.entries(colors).forEach(([name, { main, on, ink, subtle }]) => {
      expect(getContrast(on, main), `${name} on`).toBeGreaterThanOrEqual(4.5)
      expect(getContrast(ink, color.background), `${name} ink`).toBeGreaterThanOrEqual(4.5)
      expect(getContrast(ink, subtle), `${name} ink over subtle`).toBeGreaterThanOrEqual(4.5)
    })
  })
})
