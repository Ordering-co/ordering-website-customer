import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { Spinner, spinnerCss, spinnerTheme } from '../index'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { OfferSpinner } from '../../../components/CouponControl/styles'
import { SpinnerLoader } from '../../../components/SpinnerLoader'

vi.unmock('~ui/src/components/SpinnerLoader')

const tight = (css) => css.replace(/\s+/g, '')

describe('components.spinner in the schema', () => {
  it('the primary arc over the border track, in three sizes of today', () => {
    expect(schemaEntry('components.spinner.base.color')).toMatchObject({ type: 'color', value: '{color.primary}' })
    expect(schemaEntry('components.spinner.base.track')).toMatchObject({ type: 'color', value: '{color.border}' })
    Object.entries({ sm: [18, 2], md: [30, 3], lg: [108, 8] }).forEach(([size, [diameter, thickness]]) => {
      const path = `components.spinner.sizes.${size}`
      expect([...schemaKeys(path)].sort()).toEqual(['diameter', 'thickness'])
      expect(schemaEntry(`${path}.diameter`)).toMatchObject({ type: 'number', value: diameter })
      expect(schemaEntry(`${path}.thickness`)).toMatchObject({ type: 'number', value: thickness })
    })
  })
})

describe('spinnerTheme / spinnerCss', () => {
  it('a size\'s diameter and thickness, the theme\'s colors; an unknown size is md', () => {
    const t = themeWithValues((values) => { Object.assign(values.components.spinner.base, { color: '#FF0000', track: '#EEEEEE' }); return values })
    expect(spinnerTheme(t, 'sm')).toEqual({ diameter: 18, thickness: 2, color: '#FF0000', track: '#EEEEEE' })
    expect(spinnerTheme(t, 'huge')).toEqual(spinnerTheme(t, 'md'))
    const css = tight(spinnerCss(t, 'lg'))
    expect(css).toContain('width:108px;height:108px;')
    expect(css).toContain('border:8pxsolid#EEEEEE;border-top-color:#FF0000;')
    // with reduced motion a lg (or md) one, often alone on screen, turns slowly
    expect(css).toContain('@media(prefers-reduced-motion:reduce){animation-duration:2400ms;}')
    // the sm one, in a button whose label and aria-busy say it loads, stays still
    expect(tight(spinnerCss(t, 'sm'))).toContain('@media(prefers-reduced-motion:reduce){animation:none;}')
    expect(tight(spinnerCss(t, 'md'))).toContain('animation-duration:2400ms')
  })

  it('a size that is not a number is the default\'s', () => {
    const bad = themeWithValues((values) => { values.components.spinner.sizes.sm.diameter = 'x'; return values })
    expect(spinnerTheme(bad, 'sm').diameter).toBe(themeWithValues().values.components.spinner.sizes.sm.diameter)
  })

  it('the primitive is hidden from assistive tech', () => {
    const el = renderWith(themeWithValues(), <Spinner data-testid='s' $size='sm' />).getByTestId('s')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(tight(cssFor(el))).toMatch(/\.(\w+)\.\1\{[^}]*width:18px;/)
  })
})

describe('components.spinner in the screens', () => {
  it('the coupon\'s spinner is the md one with the theme', () => {
    const t = themeWithValues((values) => { values.components.spinner.sizes.md.diameter = 32; return values })
    const el = renderWith(t, <OfferSpinner data-testid='o' />).getByTestId('o')
    expect(tight(cssFor(el))).toMatch(/\.(\w+)\.\1\{[^}]*width:32px;/)
  })

  it('the loading screen\'s ring is the lg one with the theme', () => {
    const t = themeWithValues((values) => { values.components.spinner.sizes.lg.diameter = 96; return values })
    const { container } = renderWith(t, <SpinnerLoader />)
    expect(container.querySelector('.spinner')).toBeTruthy()
    expect(tight(injectedCss())).toMatch(/\.spinner-content>div\{display:inline-block;[^}]*width:96px;height:96px;/)
  })

  it('the loading screen keeps a size its screen gives it', () => {
    renderWith(themeWithValues(), <SpinnerLoader iconStyleWidth={40} iconStyleHeight={40} />)
    expect(tight(injectedCss())).toContain('width:40px;min-width:40px;')
  })
})
