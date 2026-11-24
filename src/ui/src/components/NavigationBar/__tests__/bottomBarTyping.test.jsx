import React from 'react'
import { describe, expect, it } from 'vitest'
import { HIDE_WHILE_TYPING } from '~ui/hooks/useKeyboardOpen'
import { NavigationBarContainer, bottomBarTypingCss } from '../styles'
import { Container as FloatingContainer } from '../../FloatingButton/styles'
import { MobileCartViewWrapper as StoreCartBar } from '../../BusinessProductsListing/styles'
import { MobileCartViewWrapper as LayoutCartBar } from '../../RenderProductsLayout/styles'
import { injectedCss, rebuildTheme, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notesevery bar fixed at the bottom gives way while a text field is being typed in
const theme = themeWithValues((values) => {
  values.tokens.motion_style.enabled = true
  values.tokens.motion.base = 230
  return values
})
const still = rebuildTheme(theme, (values) => {
  values.tokens.motion_style.enabled = false
  return values
})

const bars = [
  ['the navigation', 'NavigationBarContainer-sc-', NavigationBarContainer],
  ['the floating cart', 'Container-sc-', FloatingContainer],
  ['the store\'s cart bar', 'MobileCartViewWrapper-sc-', StoreCartBar],
  ['the layout\'s cart bar', 'MobileCartViewWrapper-sc-', LayoutCartBar]
]

// the declarations of the rules that reach the element under `attribute` (compact CSS, as styled-components injects it;
// a selector list may name the element by its component class in one place and by its generated class in the other)
const declarations = (css, attribute, element) => css.split('}')
  .filter((rule) => rule.includes('{') && [...element.classList].some((cls) => rule.slice(0, rule.indexOf('{')).split(',').some((selector) => selector.trim().endsWith(`${attribute} .${cls}`))))
  .map((rule) => rule.slice(rule.indexOf('{') + 1))
  .join(';')

describe('a bar at the bottom hides while typing', () => {
  it.each(bars)('%s: hidden, out of the screen and out of reach under either attribute', (name, _prefix, Bar) => {
    const { getByText } = renderWith(theme, <Bar>Bar</Bar>)
    const css = injectedCss()
    for (const attribute of ['html[data-keyboard-open]', 'html[data-text-entry]']) {
      const rule = declarations(css, attribute, getByText('Bar'))
      expect(rule, `${name} under ${attribute}`).toContain('visibility:hidden')
      expect(rule).toContain('pointer-events:none')
      expect(rule).toContain('transform:translateY(100%)')
    }
  })

  it.each(bars)('%s: with the keyboard closed nothing is hidden or moved', (name, _prefix, Bar) => {
    const { getByText } = renderWith(theme, <Bar>Bar</Bar>)
    const classes = [...getByText('Bar').classList]
    // the element's own rules: the selector is its class alone (an @media wrapper may open the first one)
    const own = injectedCss().split('}')
      .filter((rule) => rule.includes('{') && classes.some((cls) => rule.slice(0, rule.indexOf('{')).replace(/^.*\{/, '').trim() === `.${cls}`))
      .join('}')
    expect(own).toContain('position:fixed')
    expect(own).not.toContain('visibility:hidden')
    expect(own).not.toContain('translateY')
  })

  it('the rule is the one the hook exports', () => {
    expect(HIDE_WHILE_TYPING).toContain('html[data-keyboard-open] &')
    expect(HIDE_WHILE_TYPING).toContain('html[data-text-entry] &')
  })

  it('slides at the theme\'s base speed and hides for assistive technology after the slide, shows at once', () => {
    const css = bottomBarTypingCss(theme).replace(/\s+/g, ' ')
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('transition: transform 230ms')
    expect(css).toContain('visibility 0s linear 0s')
    expect(css).toContain('visibility 0s linear 230ms')
  })

  it('moves at once when the theme turns motion off', () => {
    expect(bottomBarTypingCss(still)).not.toContain('transition')
    expect(bottomBarTypingCss(still)).toContain('visibility: hidden')
  })
})
