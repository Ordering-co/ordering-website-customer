import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaDefault, schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { fieldActionsGap, fieldErrorAboveCss, fieldErrorTextCss, fieldGap, fieldLabelCss, fieldLabelGap, fieldMessageCss } from '../Field'
import { timerCss } from '../Timer'
import { SliderThumb, sliderFillCss, sliderMarkCss, sliderTrackCss } from '../Slider'
import { accordionHeaderBoxCss, accordionHeaderColors, accordionHeaderPadding, accordionHeaderTextCss } from '../Accordion'
import { AUTH_FORM, authCancelProps, authSubmitProps, authTabsProps } from '../../../../utils/authForm'
import { slotButtonProps } from '../../../../utils/themeGroups'
import { renderWith, themeWithValues } from './themeTestUtils'

// A group of the schema: exactly these props, each of this type and default
const expectGroup = (path, props) => {
  expect([...schemaKeys(path)].sort()).toEqual(Object.keys(props).sort())
  Object.entries(props).forEach(([prop, entry]) => expect(schemaEntry(`${path}.${prop}`)).toMatchObject(entry))
}

// The local resolver of the fixtures does not resolve the aliases of the
// heading styles (`{typography.h3}`): the API does. A theme with them resolved.
const withHeadings = (mutate = (values) => values) => themeWithValues((values) => {
  const { typography } = values.tokens
  values.components.input.sizes.code.text = typography.h3
  values.components.timer.base.text = typography.h2
  values.components.accordion.base.header_text = typography.h4
  return mutate(values)
})

describe('schema: forms (section 5.2 and 5.3 of the audit)', () => {
  it('input: padding_x, the code size and the trailing_action slot', () => {
    expect(schemaEntry('components.input.base.padding_x')).toMatchObject({ type: 'space', value: 20 })
    expectGroup('components.input.sizes.code', {
      height: { type: 'size', value: '{size.xl}' },
      width: { type: 'size', value: '{size.lg}' },
      text: { type: 'text', value: '{typography.h3}' },
      gap: { type: 'space', value: '{space.sm}' }
    })
    expect(schemaDefault('components.input.slots.trailing_action')).toEqual({ component: 'button', size: 'md', appearance: 'solid', color: 'primary', shape: null })
  })

  it('field: label, helper and error texts, their gaps, the rhythm (md) and the actions gap', () => {
    expectGroup('components.field.base', {
      label: { type: 'text', value: '{typography.label}' },
      label_color: { type: 'color', value: '{color.text}' },
      label_gap: { type: 'space', value: '{space.sm}' },
      helper: { type: 'text', value: '{typography.caption}' },
      helper_color: { type: 'color', value: '{color.text_muted}' },
      error: { type: 'text', value: '{typography.caption}' },
      error_color: { type: 'color', value: '{color.danger_text}' },
      message_gap: { type: 'space', value: '{space.xs}' },
      gap: { type: 'space', value: '{space.md}' },
      actions_gap: { type: 'space', value: '{space.xl}' },
      label_position: { type: 'option', value: 'placeholder', options: ['above', 'placeholder'] }
    })
  })

  it('accordion: header text, padding, background and hover', () => {
    expect(schemaEntry('components.accordion.base.header_text')).toMatchObject({ type: 'text', value: '{typography.h4}' })
    expect(schemaEntry('components.accordion.base.header_padding')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(schemaEntry('components.accordion.base.header_background')).toMatchObject({ type: 'color', value: 'transparent' })
    expect(schemaEntry('components.accordion.base.header_hover')).toMatchObject({ type: 'color', value: 'transparent' })
  })

  it('slider and timer are components of their own', () => {
    expect(schemaEntry('components.slider.base.thumb_size')).toMatchObject({ type: 'number', value: 36 })
    expect(schemaEntry('components.slider.base.track')).toMatchObject({ type: 'color', value: '{color.primary_subtle}' })
    expect(schemaEntry('components.slider.base.fill')).toMatchObject({ type: 'color', value: '{color.primary}' })
    expect(schemaEntry('components.slider.base.mark_active')).toMatchObject({ type: 'color', value: '{color.primary}' })
    expect(schemaEntry('components.timer.base.text')).toMatchObject({ type: 'text', value: '{typography.h2}' })
    expect(schemaEntry('components.timer.base.expired_color')).toMatchObject({ type: 'color', value: '{color.danger_text}' })
  })

  it('auth_form: a group with scope and slots', () => {
    expect(schemaKeys('components.auth_form.scope')).toEqual(['button', 'input', 'field', 'link', 'tabs', 'timer'])
    expect(schemaDefault('components.auth_form.slots.submit')).toEqual({ component: 'button', size: 'lg', appearance: 'solid', color: 'primary', shape: null })
    expect(schemaDefault('components.auth_form.slots.cancel')).toMatchObject({ component: 'button', size: 'lg', color: 'secondary' })
    expect(schemaEntry('components.auth_form.slots.code')).toBeUndefined()
    expect(schemaDefault('components.auth_form.slots.method_tabs')).toMatchObject({ component: 'tabs', size: 'md' })
    expect(schemaDefault('components.auth_form.slots.resend')).toMatchObject({ component: 'link', size: 'md' })
  })
})

describe('field', () => {
  it('the defaults: md between fields, xl before the actions, sm under a label, xs over a message', () => {
    const theme = themeWithValues()
    expect(fieldGap(theme)).toBe('12px')
    expect(fieldActionsGap(theme)).toBe('24px')
    expect(fieldLabelGap(theme)).toBe('8px')
    expect(fieldLabelCss(theme)).toContain('font-size: 14px;')
    expect(fieldLabelCss(theme)).toContain('margin: 0 0 8px;')
    expect(fieldMessageCss(theme, { error: true })).toContain(`color: ${theme.values.tokens.color.danger};`)
    expect(fieldMessageCss(theme)).toContain(`color: ${theme.values.tokens.color.text_muted};`)
    expect(fieldMessageCss(theme)).toContain('margin: 4px 0 0;')
    expect(fieldErrorAboveCss(theme)).toContain('margin: 0 0 calc(4px - 12px);')
    expect(fieldErrorTextCss(theme)).toContain('font-size: 12px;')
  })

  it('the theme\'s values', () => {
    const theme = themeWithValues((values) => {
      values.components.field.base.gap = 16
      values.components.field.base.label_color = '#123456'
      return values
    })
    expect(fieldGap(theme)).toBe('16px')
    expect(fieldLabelCss(theme)).toContain('color: #123456;')
  })
})

describe('timer', () => {
  it('h2 in the primary as text (primary_text), danger when expired, no box by default', () => {
    const theme = withHeadings()
    expect(timerCss(theme)).toContain('font-size: 24px;')
    expect(timerCss(theme)).toContain(`color: ${theme.values.tokens.color.primary_text};`)
    expect(timerCss(theme, { expired: true })).toContain(`color: ${theme.values.tokens.color.danger};`)
    expect(timerCss(theme)).toContain('background: transparent;')
  })
})

describe('slider', () => {
  it('track, fill and marks of components.slider', () => {
    const theme = themeWithValues()
    expect(sliderTrackCss(theme)).toContain(`background: ${theme.values.tokens.color.primary_subtle};`)
    expect(sliderTrackCss(theme)).toContain('height: 6px;')
    expect(sliderFillCss(theme)).toContain(`background: ${theme.values.tokens.color.primary};`)
    expect(sliderMarkCss(theme, true)).toContain(`color: ${theme.values.tokens.color.primary};`)
    expect(sliderMarkCss(theme, false)).toContain(`color: ${theme.values.tokens.color.text};`)
  })

  it('the thumb: a decorative circle of thumb_size', () => {
    const theme = themeWithValues((values) => { values.components.slider.base.thumb_size = 28; return values })
    const { container } = renderWith(theme, <SliderThumb style={{ left: '50%' }} />)
    const thumb = container.firstChild
    expect(thumb.getAttribute('aria-hidden')).toBe('true')
    expect(window.getComputedStyle(thumb).width).toBe('28px')
  })
})

describe('accordion header', () => {
  it('lg above and below, transparent, h4 text by default', () => {
    const theme = withHeadings()
    expect(accordionHeaderPadding(theme)).toBe('16px')
    expect(accordionHeaderBoxCss(theme)).toContain('padding-top: 16px; padding-bottom: 16px;')
    expect(accordionHeaderBoxCss(theme, { padding: false })).not.toContain('padding')
    expect(accordionHeaderTextCss(theme)).toContain('font-size: 18px;')
  })

  it('the hover is the theme\'s header_hover', () => {
    const theme = themeWithValues((values) => {
      values.components.accordion.base.header_background = '#FAFAFA'
      values.components.accordion.base.header_hover = '#EEEEEE'
      return values
    })
    expect(accordionHeaderColors(theme)).toEqual({ background: '#FAFAFA', hover: '#EEEEEE' })
    expect(accordionHeaderBoxCss(theme)).toContain('&:hover { background: #EEEEEE; }')
  })
})

describe('auth_form slots and the input\'s trailing action', () => {
  it('the submit and cancel of the slots, the method tabs\' size', () => {
    const theme = themeWithValues()
    expect(AUTH_FORM).toBe('auth_form')
    expect(authSubmitProps(theme)).toEqual({ $size: 'lg', $color: 'primary', $appearance: 'solid', $cta: true })
    expect(authCancelProps(theme)).toEqual({ $size: 'lg', $color: 'secondary', $appearance: 'solid' })
    expect(authTabsProps(theme)).toEqual({ size: 'md' })
    expect(slotButtonProps(theme, 'input', 'trailing_action')).toEqual({ $size: 'md', $color: 'primary', $appearance: 'solid' })
  })
})
