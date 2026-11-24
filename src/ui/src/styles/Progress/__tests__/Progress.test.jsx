import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { ProgressBar, clampProgress, progressTheme } from '../index'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

afterEach(cleanup)

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const progress = values.components.progress
  values.tokens.motion = { fast: 120, base: 200, slow: 300 }
  values.tokens.motion_style = { easing: 'ease_out', enabled: true }
  progress.base = { track: '#E9F2FE', fill: '#2C7BE5', radius: 9999, border: null, shadow: null, animated: true, speed: 200 }
  progress.sizes = { sm: { height: 6 }, md: { height: 12 }, lg: { height: 20 } }
  progress.variants.default.states = {
    active: { pulse: true },
    complete: { fill: '#00D27A', track: '#D6FFF7' },
    pending: { fill: '#FFC700', track: '#FFF4CC' },
    canceled: { fill: '#E63757', track: '#FEEDF0' }
  }
  mutate(progress)
  return values
})

const parts = (getByRole) => {
  const track = getByRole('progressbar')
  return { track, fill: track.firstChild }
}

describe('components.progress', () => {
  it('each size takes its height; md by default', () => {
    const { getAllByRole } = renderWith(theme(), (
      <>
        <ProgressBar value={10} size='sm' />
        <ProgressBar value={10} />
        <ProgressBar value={10} size='lg' />
      </>
    ))
    const [sm, md, lg] = getAllByRole('progressbar')
    expect(cssFor(sm)).toContain('height:6px')
    expect(cssFor(md)).toContain('height:12px')
    expect(cssFor(lg)).toContain('height:20px')
  })

  it('the track and fill take the base colors; a state overrides them', () => {
    const base = renderWith(theme(), <ProgressBar value={40} />)
    const { track, fill } = parts(base.getByRole)
    expect(cssFor(track)).toContain('background:#E9F2FE')
    expect(cssFor(fill)).toContain('background:#2C7BE5')
    base.unmount()

    for (const [state, fillColor, trackColor] of [['complete', '#00D27A', '#D6FFF7'], ['pending', '#FFC700', '#FFF4CC'], ['canceled', '#E63757', '#FEEDF0']]) {
      const view = renderWith(theme(), <ProgressBar value={40} state={state} />)
      const { track, fill } = parts(view.getByRole)
      expect(cssFor(track)).toContain(`background:${trackColor}`)
      expect(cssFor(fill)).toContain(`background:${fillColor}`)
      view.unmount()
    }
  })

  it('the radius rounds the track and both ends of the fill', () => {
    const { getByRole } = renderWith(theme((p) => { p.base.radius = 4 }), <ProgressBar value={40} />)
    const { track, fill } = parts(getByRole)
    expect(cssFor(track)).toContain('border-radius:4px')
    expect(cssFor(fill)).toContain('border-radius:4px')
    expect(cssFor(fill)).not.toMatch(/border-radius:4px 0/)
  })

  it('border and shadow on the track, as the theme returns them', () => {
    const { getByRole } = renderWith(theme((p) => {
      p.base.border = { width: 1, style: 'solid', color: '#DBDCDB' }
      p.base.shadow = { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', opacity: 0.1 }
    }), <ProgressBar value={40} />)
    const css = cssFor(getByRole('progressbar'))
    expect(css).toContain('border:1px solid #DBDCDB')
    expect(css).toContain('box-shadow:0px 2px 4px 0px rgba(0,0,0,0.1)')
  })

  it('without a border or a shadow (null) the track is flat', () => {
    const { getByRole } = renderWith(theme(), <ProgressBar value={40} />)
    const css = cssFor(getByRole('progressbar'))
    expect(css).toContain('border:none')
    expect(css).toContain('box-shadow:none')
  })

  it('a progressbar with its value, min, max and name', () => {
    const { getByRole } = renderWith(theme(), <ProgressBar value={40} aria-label='Order in progress' />)
    const track = getByRole('progressbar', { name: 'Order in progress' })
    expect(track).toHaveAttribute('aria-valuenow', '40')
    expect(track).toHaveAttribute('aria-valuemin', '0')
    expect(track).toHaveAttribute('aria-valuemax', '100')
    expect(track.firstChild.style.width).toBe('40%')
  })

  it('passes aria-labelledby through', () => {
    const { getByRole } = renderWith(theme(), (
      <>
        <p id='label'>Free delivery</p>
        <ProgressBar value={10} aria-labelledby='label' />
      </>
    ))
    expect(getByRole('progressbar', { name: 'Free delivery' })).toBeInTheDocument()
  })

  it('clamps the value to 0–100', () => {
    expect(clampProgress(-5)).toBe(0)
    expect(clampProgress(140)).toBe(100)
    expect(clampProgress('55')).toBe(55)
    expect(clampProgress(undefined)).toBe(0)
    expect(clampProgress(NaN)).toBe(0)
    const { getByRole } = renderWith(theme(), <ProgressBar value={150} />)
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(getByRole('progressbar').firstChild.style.width).toBe('100%')
  })

  it('animated: the width changes at the speed of the theme, only without reduced motion', () => {
    const { getByRole } = renderWith(theme(), <ProgressBar value={40} />)
    const fill = getByRole('progressbar').firstChild.className.split(' ').pop()
    expect(injectedCss()).toMatch(new RegExp(`@media \\(prefers-reduced-motion:no-preference\\)\\{\\.${fill}\\{[^}]*transition:width 200ms ease-out;`))
    expect(injectedCss()).toMatch(new RegExp(`@media \\(prefers-reduced-motion:reduce\\)\\{\\.${fill}\\{[^}]*transition:none;[^}]*animation:none;`))
  })

  it('the identity turns motion off: no width transition, no pulse', () => {
    const off = themeWithValues((values) => {
      values.tokens.motion_style = { easing: 'ease_out', enabled: false }
      values.components.progress.base = { ...values.components.progress.base, fill: '#2C7BE5', animated: true, speed: 200 }
      values.components.progress.variants.default.states = { active: { pulse: true } }
      return values
    })
    const { getByRole } = renderWith(off, <ProgressBar value={40} state='active' />)
    const css = cssFor(getByRole('progressbar').firstChild)
    expect(css).toContain('transition:none')
    expect(css).not.toMatch(/animation:\S+ 1600ms/)
  })

  it('not animated: no transition', () => {
    const { getByRole } = renderWith(theme((p) => { p.base.animated = false }), <ProgressBar value={40} />)
    expect(cssFor(getByRole('progressbar').firstChild)).not.toContain('transition:width')
  })

  it('active pulses the fill; the other states do not', () => {
    const active = renderWith(theme(), <ProgressBar value={40} state='active' />)
    expect(cssFor(active.getByRole('progressbar').firstChild)).toMatch(/animation:\S+ 1600ms ease-in-out infinite/)
    active.unmount()
    const complete = renderWith(theme(), <ProgressBar value={100} state='complete' />)
    expect(cssFor(complete.getByRole('progressbar').firstChild)).not.toMatch(/animation:\S+ 1600ms/)
  })

  it('progressTheme: the base with the state over it; an unknown state is the base', () => {
    expect(progressTheme(theme(), { size: 'lg', state: 'canceled' })).toMatchObject({ fill: '#E63757', track: '#FEEDF0', radius: 9999, height: 20 })
    expect(progressTheme(theme(), { state: 'other' })).toMatchObject({ fill: '#2C7BE5', height: 12 })
  })

  it('the schema defaults: track and fill from the brand colors, full radius', () => {
    const look = progressTheme(themeWithValues(), { size: 'sm' })
    expect(look.height).toBe(6)
    expect(typeof look.track).toBe('string')
    expect(typeof look.fill).toBe('string')
    expect(look.radius).toBe(9999)
  })
})
