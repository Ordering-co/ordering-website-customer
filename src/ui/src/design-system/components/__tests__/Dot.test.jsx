import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { Dot } from '../Dot'

// jsdom does not compile Tailwind: these prove the classes, attributes and variables;
// how it looks is the preview page's assertions.
const [defaults, grill] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const dot = (view) => view.container.querySelector('[data-slot=dot]')

describe('Dot: a small round mark (a bullet, a status)', () => {
  it('is decoration: hidden from assistive technology, a round inline box that does not shrink', () => {
    const view = draw(<Dot />)
    expect(dot(view)).toHaveAttribute('aria-hidden', 'true')
    expect(dot(view)).not.toHaveAttribute('role')
    expect(dot(view)).toHaveClass('ui:inline-block', 'ui:shrink-0', 'ui:rounded-full', 'ui:size-(--ui-dot-size)')
  })

  it('with a label it is an image with that name (a status says what it is)', () => {
    const view = draw(<Dot label='Connected' color='success' />)
    expect(view.getByRole('img', { name: 'Connected' })).toBe(dot(view))
    expect(dot(view)).not.toHaveAttribute('aria-hidden')
  })

  it.each([defaults, grill])('its sizes are fractions of the theme\'s small icon, not px (%#)', (theme) => {
    const icon = theme.css.tokens.icon.sm
    const sizes = Object.fromEntries(['xs', 'sm', 'md'].map((size) => {
      const view = draw(<Dot size={size} />, theme)
      const value = dot(view).style.getPropertyValue('--ui-dot-size')
      view.unmount()
      return [size, value]
    }))
    expect(sizes).toEqual({ xs: `calc(${icon} * 3 / 8)`, sm: `calc(${icon} / 2)`, md: `calc(${icon} * 3 / 4)` })
  })

  it('at the default theme they are the 6, 8 and 12 of the bullets and the connection status', () => {
    // the arithmetic of the three fractions over the default small icon (16)
    expect(parseFloat(defaults.css.tokens.icon.sm)).toBe(16)
    expect([3 / 8, 1 / 2, 3 / 4].map((fraction) => fraction * 16)).toEqual([6, 8, 12])
  })

  it('follows a store\'s icon scale', () => {
    const big = buildAppTheme(null, { version: 2, values: { tokens: { icon: { sm: 24 } } } })
    expect(dot(draw(<Dot size='md' />, big)).style.getPropertyValue('--ui-dot-size')).toBe(`calc(${big.css.tokens.icon.sm} * 3 / 4)`)
  })

  it('an unknown size is sm', () => {
    expect(dot(draw(<Dot size='huge' />)).style.getPropertyValue('--ui-dot-size')).toBe(`calc(${defaults.css.tokens.icon.sm} / 2)`)
  })

  it.each([['success', 'ui:bg-success'], ['warning', 'ui:bg-warning'], ['danger', 'ui:bg-danger'], ['primary', 'ui:bg-primary'], ['muted', 'ui:bg-border-strong'], ['current', 'ui:bg-current']])('color %s paints %s', (color, cls) => {
    expect(dot(draw(<Dot color={color} />))).toHaveClass(cls)
  })

  it('takes the text color by default and an unknown color too', () => {
    expect(dot(draw(<Dot />))).toHaveClass('ui:bg-current')
    expect(dot(draw(<Dot color='neon' />))).toHaveClass('ui:bg-current')
  })

  it('the rest goes to the span, and the className wins', () => {
    const view = draw(<Dot data-testid='d' className='ui:me-xs' style={{ opacity: 0.5 }} />)
    expect(view.getByTestId('d')).toHaveClass('ui:me-xs')
    expect(view.getByTestId('d')).toHaveStyle({ opacity: '0.5' })
  })

  it('outline: a ring of the theme\'s fixed thin line with a clear centre, the same size and color', () => {
    const solid = draw(<Dot size='md' color='primary' />)
    const view = draw(<Dot outline size='md' color='primary' />)
    expect(dot(view).style.getPropertyValue('--ui-dot-size')).toBe(dot(solid).style.getPropertyValue('--ui-dot-size'))
    // the ring is a drawn shape: the fixed thin line (never the boxes' border, which a theme sets to none), floored by the dot's size
    expect(defaults.css.identity.border.thin).toBe('0px')
    expect(dot(view).style.getPropertyValue('--ui-dot-border-width')).toBe(`max(${defaults.css.tokens.border.thin}, calc(var(--ui-dot-size) / 8))`)
    expect(dot(view)).toHaveClass('ui:bg-transparent', 'ui:border-solid', 'ui:border-primary', 'ui:box-border')
    expect(dot(view)).not.toHaveClass('ui:bg-primary')
    expect(dot(view)).toHaveClass('ui:rounded-full', 'ui:size-(--ui-dot-size)')
    // without it nothing changes
    expect(dot(solid)).toHaveClass('ui:bg-primary')
    expect(dot(solid)).not.toHaveClass('ui:border-solid')
    expect(dot(solid).style.getPropertyValue('--ui-dot-border-width')).toBe('')
  })
})
