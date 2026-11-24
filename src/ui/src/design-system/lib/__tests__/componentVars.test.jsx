import React from 'react'
import { createPortal } from 'react-dom'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider, useTheme } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { themeRadius } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { rebuildTheme } from '~ui/src/styles/__tests__/themeTestUtils'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../componentVars'

const [defaults, grill, cafe, , grocery] = THEMES.map(({ theme }) => theme)
const SOLID = { size: 'md', color: 'primary', appearance: 'solid' }

describe('componentVars: the button', () => {
  it('declares what the theme gives the button, as CSS the theme already wrote', () => {
    const vars = componentVars(defaults, 'button', SOLID)
    const view = getThemeCss(defaults, 'button')
    expect(vars['--ui-button-height']).toBe(view.sizes.md.height)
    expect(vars['--ui-button-padding-x']).toBe(view.sizes.md.padding_x)
    expect(vars['--ui-button-icon-size']).toBe(view.sizes.md.icon_size)
    expect(vars['--ui-button-icon-gap']).toBe(view.base.icon_gap)
    expect(vars['--ui-button-radius']).toBe(view.base.radius)
    expect(vars['--ui-button-background']).toBe(view.variants.primary.solid.background)
    expect(vars['--ui-button-color']).toBe(view.variants.primary.solid.color)
    expect(vars['--ui-button-border']).toBe('none')
    expect(vars['--ui-button-shadow']).toBe(view.variants.primary.solid.shadow.css)
    expect(vars['--ui-button-text-size']).toBe(view.sizes.md.text.size)
    expect(vars['--ui-button-text-line']).toBe(view.sizes.md.text.line)
    expect(vars['--ui-button-text-weight']).toBe(String(view.sizes.md.text.weight))
    expect(vars['--ui-button-text-family']).toBe(view.sizes.md.text.family)
    expect(vars['--ui-button-pressed-background']).toBe(view.variants.primary.solid.states.pressed.background)
    expect(vars['--ui-button-disabled-color']).toBe(view.variants.primary.solid.states.disabled.color)
    // every value is a string a style can hold
    Object.values(vars).forEach((value) => expect(typeof value).toBe('string'))
  })

  it('a theme that moves the button moves its variables', () => {
    const vars = componentVars(grill, 'button', SOLID)
    expect(vars).toMatchObject({
      '--ui-button-height': '46px',
      '--ui-button-padding-x': '22px',
      '--ui-button-icon-size': '20px',
      '--ui-button-icon-gap': '10px',
      '--ui-button-radius': '0px',
      '--ui-button-background': '#F0B429',
      '--ui-button-color': '#1B1513',
      '--ui-button-pressed-background': '#E5A510'
    })
    expect(componentVars(cafe, 'button', SOLID)['--ui-button-radius']).toBe('9999px')
    expect(componentVars(cafe, 'button', { ...SOLID, appearance: 'outline' })).toMatchObject({
      '--ui-button-background': 'transparent', '--ui-button-color': '#1F5C4A', '--ui-button-border': '1px solid #1F5C4A'
    })
  })

  it('a state the theme leaves null declares nothing: it is the resting look, not `none`', () => {
    const vars = componentVars(defaults, 'button', SOLID)
    expect(vars).not.toHaveProperty('--ui-button-hover-background')
    expect(vars).not.toHaveProperty('--ui-button-hover-shadow')
    expect(vars).not.toHaveProperty('--ui-button-pressed-shadow')
    expect(vars).toHaveProperty('--ui-button-pressed-background')
  })

  it('the shape and the size it does not have: the shape\'s own look, the default size', () => {
    const icon = componentVars(defaults, 'button', { ...SOLID, shape: 'icon' })
    expect(icon['--ui-button-radius']).toBe(getThemeCss(defaults, 'button').shapes.icon.radius)
    expect(componentVars(defaults, 'button', { ...SOLID, size: 'nope' })).toEqual(componentVars(defaults, 'button', SOLID))
    expect(componentVars(defaults, 'button', { ...SOLID, size: 'lg' })['--ui-button-height']).toBe(getThemeCss(defaults, 'button').sizes.lg.height)
  })

  it('its motion: the speed and easing it animates with, none when it does not', () => {
    expect(componentVars(grill, 'button', SOLID)).toMatchObject({ '--ui-button-motion-duration': '160ms', '--ui-button-motion-easing': 'ease-out' })
    // animated by default; a button that does not animate: 0ms
    expect(componentVars(defaults, 'button', SOLID)['--ui-button-motion-duration']).toBe(`${getThemeCss(defaults, 'button').motion.ms}ms`)
    const still = rebuildTheme(defaults, (values) => { values.components.button.base.animated = false })
    expect(componentVars(still, 'button', SOLID)['--ui-button-motion-duration']).toBe('0ms')
    expect(componentVars(defaults, 'button', SOLID)).not.toHaveProperty('--ui-button-speed')
  })
})

describe('componentVars: a group\'s scope', () => {
  it('inside the group the scope\'s button is read; the global theme is not changed', () => {
    const header = componentVars(scopedTheme(grill, 'header'), 'button', SOLID)
    expect(header).toMatchObject({ '--ui-button-radius': '9999px', '--ui-button-height': '34px', '--ui-button-padding-x': '14px' })
    // what the scope does not change stays the theme's
    expect(header['--ui-button-background']).toBe('#F0B429')
    expect(componentVars(grill, 'button', SOLID)['--ui-button-height']).toBe('46px')
    expect(componentVars(scopedTheme(cafe, 'header'), 'button', SOLID)['--ui-button-radius']).toBe('12px')
  })

  it('a third theme moves the same two levels: its own button and its own header scope', () => {
    expect(componentVars(grocery, 'button', SOLID)).toMatchObject({
      '--ui-button-height': '48px', '--ui-button-padding-x': '20px', '--ui-button-radius': '10px', '--ui-button-background': '#2F7D32', '--ui-button-pressed-background': '#256328'
    })
    expect(componentVars(scopedTheme(grocery, 'header'), 'button', SOLID)).toMatchObject({
      '--ui-button-radius': '9999px', '--ui-button-height': '38px', '--ui-button-padding-x': '14px', '--ui-button-background': '#2F7D32'
    })
  })

  it('reaches a portal opened from inside the group: the variables are on its own element', () => {
    const Piece = ({ id }) => createPortal(<span data-testid={id} style={componentVars(useTheme(), 'button', SOLID)} />, document.body)
    const { getByTestId } = render(
      <ThemeProvider theme={grill}>
        <Piece id='global' />
        <ComponentScope group='header'><Piece id='scoped' /></ComponentScope>
      </ThemeProvider>
    )
    expect(getByTestId('global').style.getPropertyValue('--ui-button-height')).toBe('46px')
    expect(getByTestId('scoped').style.getPropertyValue('--ui-button-height')).toBe('34px')
    expect(getByTestId('scoped').parentElement).toBe(document.body)
  })
})

describe('componentVars: the phone', () => {
  it('below the phone cut the theme\'s overrides win over the screen\'s, value by value', () => {
    const phone = componentVars({ ...cafe, platform: 'mobile_web' }, 'button', SOLID)
    const wide = componentVars(cafe, 'button', SOLID)
    expect(wide).toMatchObject({ '--ui-button-height': '52px', '--ui-button-padding-x': '28px' })
    expect(phone).toMatchObject({ '--ui-button-height': '48px', '--ui-button-padding-x': '20px' })
    // what the phone does not override is the screen's
    expect(phone['--ui-button-radius']).toBe(wide['--ui-button-radius'])
    expect(phone['--ui-button-icon-size']).toBe(wide['--ui-button-icon-size'])
  })
})

describe('componentVars: other components', () => {
  it('the Identity level a component rounds with when the theme gives it no radius of its own', () => {
    const name = Object.keys(grill.css.components).find((component) => getThemeCss(grill, component).base && !('radius' in getThemeCss(grill, component).base))
    expect(name).toBeTruthy()
    expect(componentVars(grill, name, {})).not.toHaveProperty(`--ui-${name.replace(/_/g, '-')}-radius`)
    expect(componentVars(grill, name, { radius: 'md' })[`--ui-${name.replace(/_/g, '-')}-radius`]).toBe(themeRadius(grill, 'md'))
    expect(themeRadius(grill, 'md')).toBe('0px')
  })

  it('a component the theme does not have declares nothing', () => {
    expect(componentVars(defaults, 'no_such_component', {})).toEqual({})
  })

  it('a variant by name or path', () => {
    const byPath = componentVars(defaults, 'button', { variant: ['danger', 'solid'], size: 'sm' })
    expect(byPath).toEqual(componentVars(defaults, 'button', { color: 'danger', appearance: 'solid', size: 'sm' }))
    expect(byPath['--ui-button-background']).toBe(getThemeCss(defaults, 'button').variants.danger.solid.background)
  })
})
