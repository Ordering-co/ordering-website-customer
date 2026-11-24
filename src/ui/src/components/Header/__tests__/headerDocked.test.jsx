import React from 'react'
import { describe, it, expect } from 'vitest'
import { Header, HEADER_DOCKED, headerDockedRules } from '../styles'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const theme = themeWithValues((values) => {
  values.components.header.base.background = '#FAFAFA'
  values.components.header.base.shadow = { x: 0, y: 2, blur: 0, spread: 0, color: '#000000' }
  return values
})

describe('a bar docked under the header', () => {
  it('takes the header\'s background and its shadow, cast down', () => {
    const rules = headerDockedRules(theme)
    expect(rules).toContain('#FAFAFA')
    expect(rules).toMatch(/box-shadow: 0(px)? 2px/)
  })

  it('a fixed header keeps its own shadow over a scrolled page, the bar is in the flow', () => {
    const { getByText } = renderWith(theme, <Header data-scroll-behavior='fixed'>Brand</Header>)
    const componentClass = [...getByText('Brand').classList].find((name) => name.startsWith('Header-sc-'))
    expect(injectedCss()).not.toContain(`html:has(.${HEADER_DOCKED}) .${componentClass}[data-scroll-behavior='fixed']`)
    expect(injectedCss()).toMatch(/\[data-scroll-state='scrolled'\]::after\{box-shadow:0px 2px 0px/)
  })

  it('a revealing header gives up its shadow while the bar is on the page (the bar is its dock and casts it)', () => {
    const { getByText } = renderWith(theme, <Header data-scroll-behavior='reveal'>Brand</Header>)
    const componentClass = [...getByText('Brand').classList].find((name) => name.startsWith('Header-sc-'))
    // the shadow is drawn by its ::after layer (over the page under it)
    expect(injectedCss()).toContain(`html:has(.${HEADER_DOCKED}) .${componentClass}[data-scroll-behavior='reveal']::after{box-shadow:none;}`)
  })
})
