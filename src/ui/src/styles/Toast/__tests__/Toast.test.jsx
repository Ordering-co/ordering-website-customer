import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { cssFor, defaultTheme, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { AppToast, Toast, toastColors, toastKeyframes, toastPaddingCss, toastPlacementCss, toastPosition } from '../index'

const toast = vi.hoisted(() => ({ type: 'info' }))

vi.mock('~components/contexts/ToastContext', () => ({
  ToastType: { Info: 'info', Error: 'error', Success: 'success' },
  useToast: () => [{ type: toast.type, message: 'Saved', duration: 3000 }, { hideToast: vi.fn() }]
}))

const tight = (css) => css.replace(/\s+/g, '')

describe('components.toast: padding and shadow', () => {
  it('the schema: the lg padding of today; the shadow follows Identity (its sm by default)', () => {
    expect(schemaEntry('components.toast.base.padding')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(schemaEntry('components.toast.base.shadow')).toMatchObject({ type: 'shadow', value: '{shadow.sm}', follows: 'shadow' })
  })

  it('its padding', () => {
    const t = themeWithValues((values) => { values.components.toast.base.padding = 14; return values })
    expect(toastPaddingCss(t)).toBe('padding: 14px;')
  })

  it('the toast takes the theme\'s padding and shadow', () => {
    const t = themeWithValues((values) => {
      values.components.toast.base.padding = 14
      values.components.toast.base.shadow = { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 0.2 }
      return values
    })
    const el = renderWith(t, <Toast />).getByText('Saved')
    const css = tight(cssFor(el))
    expect(css).toContain('padding:14px;')
    expect(css).toContain('box-shadow:0px4px12px0pxrgba(0,0,0,0.2);')
  })
})

describe('components.toast: its colors follow the status tokens', () => {
  it('the schema: each variant\'s background and text are its status token pair', () => {
    Object.entries({ info: 'info', success: 'success', error: 'danger' }).forEach(([variant, token]) => {
      const path = `components.toast.variants.${variant}`
      expect([...schemaKeys(path)].sort()).toEqual(['background', 'color'])
      expect(schemaEntry(`${path}.background`)).toMatchObject({ type: 'color', value: `{color.${token}}` })
      expect(schemaEntry(`${path}.color`)).toMatchObject({ type: 'color', value: `{color.on_${token}}` })
    })
    expect(schemaEntry('components.toast.base.color')).toBeUndefined()
  })

  it('by default: the info, success and danger tokens with their on_ text', () => {
    const t = themeWithValues()
    const color = t.values.tokens.color
    expect(toastColors(t, 'info')).toEqual({ backgroundColor: color.info, textColor: color.on_info })
    expect(toastColors(t, 'success')).toEqual({ backgroundColor: color.success, textColor: color.on_success })
    expect(toastColors(t, 'error')).toEqual({ backgroundColor: color.danger, textColor: color.on_danger })
  })

  it('a variant\'s own background and text win', () => {
    const t = themeWithValues((values) => {
      values.components.toast.variants.error = { background: '#990000', color: '#FFEEEE' }
      return values
    })
    expect(toastColors(t, 'error')).toEqual({ backgroundColor: '#990000', textColor: '#FFEEEE' })
  })

  it('renders the error toast with the error variant of the theme', () => {
    toast.type = 'error'
    try {
      const t = themeWithValues((values) => { values.components.toast.variants.error = { background: '#AA0011', color: '#FAFAFA' }; return values })
      const css = tight(cssFor(renderWith(t, <Toast />).getByText('Saved')))
      expect(css).toContain('background-color:#AA0011;')
      expect(css).toContain('color:#FAFAFA;')
    } finally {
      toast.type = 'info'
    }
  })
})

describe('AppToast: the toast under the app\'s theme', () => {
  it('the app theme, not the boot theme around it', () => {
    const t = themeWithValues((values) => { values.components.toast.variants.info.background = '#123456'; return values })
    const css = tight(cssFor(renderWith(defaultTheme, <AppToast theme={t} />).getByText('Saved')))
    expect(css).toContain('background-color:#123456;')
  })

  it('without an app theme: the theme around it', () => {
    const boot = themeWithValues((values) => { values.components.toast.variants.info.background = '#00AA00'; return values })
    const css = tight(cssFor(renderWith(boot, <AppToast />).getByText('Saved')))
    expect(css).toContain('background-color:#00AA00;')
  })
})

describe('components.toast: where it sits and how wide it grows', () => {
  const withToast = (mutate) => themeWithValues((values) => { mutate(values); return values })

  it('the schema: xl off the bottom (or the navigation) and up to 400px wide', () => {
    expect(schemaEntry('components.toast.base.offset')).toMatchObject({ type: 'space', value: '{space.xl}' })
    expect(schemaEntry('components.toast.base.max_width')).toMatchObject({ type: 'number', value: 400 })
  })

  it('by default: the offset above the bottom navigation\'s real height on phones, above the bottom from 576px', () => {
    const theme = themeWithValues()
    const offset = theme.values.tokens.space.xl
    const nav = theme.values.components.bottom_nav.base.height
    const css = tight(cssFor(renderWith(theme, <Toast />).getByText('Saved')))
    expect(css).toContain(`bottom:${nav + offset}px;`)
    expect(css).toMatch(new RegExp(`@media\\(min-width:576px\\)\\{\\.[\\w-]+\\{bottom:${offset}px;`))
    expect(css).toContain('min-width:0;max-width:min(400px,calc(100vw-40px));')
    expect(css).not.toContain('min-width:200px')
    expect(css).not.toContain('bottom:80px')
  })

  it('the theme\'s navigation height, offset, max width and page gutter', () => {
    const theme = withToast((values) => {
      values.components.bottom_nav.base.height = 72
      values.components.toast.base.offset = 12
      values.components.toast.base.max_width = 320
      // (a copy: the fixture's tokens are shared)
      values.tokens = { ...values.tokens, layout: { ...values.tokens.layout, page_gutter: 16 } }
    })
    const css = tight(toastPlacementCss(theme))
    expect(css).toContain('bottom:84px;')
    expect(css).toContain('@media(min-width:576px){bottom:12px;}')
    expect(css).toContain('max-width:min(320px,calc(100vw-32px));')
  })

  it('with the bottom navigation hidden: only the offset', () => {
    const theme = withToast((values) => { values.visibility.bottom_nav = false })
    expect(tight(toastPlacementCss(theme))).toContain(`bottom:${theme.values.tokens.space.xl}px;`)
  })
})

describe('components.toast.base.position', () => {
  const at = (position) => themeWithValues((values) => { values.components.toast.base.position = position; return values })

  it('the schema: bottom (as always), top or bottom_start', () => {
    expect(schemaEntry('components.toast.base.position')).toMatchObject({ type: 'option', value: 'bottom', options: ['bottom', 'top', 'bottom_start'] })
  })

  it('bottom with an unknown value; the theme\'s otherwise', () => {
    expect(toastPosition(at('middle'))).toBe('bottom')
    expect(toastPosition(themeWithValues())).toBe('bottom')
    expect(toastPosition(at('top'))).toBe('top')
    expect(toastPosition(at('bottom_start'))).toBe('bottom_start')
  })

  it('bottom: centered above the bottom navigation, no side of its own (as before)', () => {
    const css = tight(toastPlacementCss(at('bottom')))
    expect(css).toBe(tight(toastPlacementCss(themeWithValues())))
    expect(css).not.toContain('inset-inline-start')
    expect(css).not.toContain('top:')
  })

  it('top: the offset under the header (its height on the root), centered; it comes down', () => {
    const theme = at('top')
    const offset = theme.values.tokens.space.xl
    const css = tight(toastPlacementCss(theme))
    expect(css).toContain(`top:calc(var(--header-height,0px)+${offset}px);bottom:auto;`)
    expect(css).not.toContain('inset-inline-start')
    expect(toastKeyframes(theme)).toEqual(['toast-fadein-top', 'toast-fadeout-top'])
    expect(toastKeyframes(themeWithValues())).toEqual(['fadein', 'fadeout'])
  })

  it('bottom_start: at the bottom (above the navigation), the page gutter from the start side on phones, the offset from 576px', () => {
    const theme = at('bottom_start')
    const offset = theme.values.tokens.space.xl
    const nav = theme.values.components.bottom_nav.base.height
    const css = tight(toastPlacementCss(theme))
    expect(css).toContain(`bottom:${nav + offset}px;inset-inline-start:20px;`)
    expect(css).toContain(`@media(min-width:576px){bottom:${offset}px;inset-inline-start:${offset}px;}`)
  })
})
