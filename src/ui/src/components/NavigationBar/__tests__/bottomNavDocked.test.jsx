import React from 'react'
import { describe, it, expect } from 'vitest'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { BOTTOM_NAV_DOCKED, NavigationBarContainer, bottomBarPaddingCss, bottomNavDockedRules } from '../styles'
import { Button } from '~ui/src/design-system/components/Button'
import { Container as FloatingContainer } from '../../FloatingButton/styles'
import { MobileCartViewWrapper } from '../../BusinessProductsListing/styles'
import { MobileWrapperPlaceOrderButton } from '../../Checkout/styles'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const theme = themeWithValues((values) => {
  values.components.bottom_nav.base.background = '#FAFAFA'
  values.components.bottom_nav.base.shadow = { x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }
  values.components.bottom_nav.base.border_top = { width: 1, color: '#123456', style: 'solid' }
  return values
})

describe('a bar at the bottom', () => {
  it('the navigation\'s background and its shadow, cast up', () => {
    const rules = bottomNavDockedRules(theme)
    expect(rules).toContain('#FAFAFA')
    expect(rules).toContain('box-shadow: 0px -2px 0px 0px')
    // the whole width: only its top border
    expect(rules).toContain('border: none;')
    expect(rules).toContain('border-top: 1px solid #123456')
  })

  it('the navigation casts its shadow up, and gives it up to a docked bar', () => {
    const { getByText } = renderWith(theme, <NavigationBarContainer>Nav</NavigationBarContainer>)
    const css = injectedCss()
    const componentClass = [...getByText('Nav').classList].find((name) => name.startsWith('NavigationBarContainer-sc-'))
    expect(css).toContain(`html:has(.${BOTTOM_NAV_DOCKED}) .${componentClass}{box-shadow:none;}`)
    expect(css).toContain('box-shadow:0px -2px 0px 0px')
    expect(css).toContain('border-top:1px solid #123456')
    // the height the bars docked on it leave free
    expect(css).toContain('height:65px')
  })

  it('hides the navigation only while a bar docks over it', () => {
    const { container, getByText } = renderWith(theme, <>
      <NavigationBarContainer>Nav</NavigationBarContainer>
      <MobileWrapperPlaceOrderButton>Checkout action</MobileWrapperPlaceOrderButton>
    </>)
    const nav = [...container.firstChild.classList].find((name) => name.startsWith('NavigationBarContainer-sc-'))
    expect(getByText('Checkout action')).toHaveAttribute('data-bottom-nav-cover')
    expect(injectedCss()).toContain(`html:has([data-bottom-nav-cover]) .${nav}{display:none;}`)
  })

  it('docked above the navigation: its top border only where the navigation is not', () => {
    const rules = bottomNavDockedRules(theme, { aboveNav: true })
    expect(rules).toContain('@media (min-width: 576px) { border-top: 1px solid #123456')
    expect(rules.replace(/@media[^}]*}/, '')).not.toContain('border-top')
  })
})

describe('every bar at the bottom reads components.bottom_nav (one source)', () => {
  const padded = themeWithValues((values) => {
    Object.assign(values.components.bottom_nav.base, { padding_y: 7, padding_x: 11 })
    return values
  })
  const cssOf = (t, Component) => {
    const { container, unmount } = renderWith(t, <Component>Bar</Component>)
    const rules = cssFor(container.firstChild)
    unmount()
    return rules
  }

  it('the schema: bottom_nav has the bars\' padding; the cart and the checkout have no bar of their own', () => {
    expect(schemaEntry('components.bottom_nav.base.padding_y')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(schemaEntry('components.bottom_nav.base.padding_x')).toMatchObject({ type: 'space', value: '{space.xl}' })
    expect(schemaKeys('components.cart.base').filter((key) => /^bar_(padding|shadow)/.test(key))).toEqual([])
    expect(schemaKeys('components.checkout.base').filter((key) => key.startsWith('mobile_bar'))).toEqual([])
  })

  it('bottomBarPaddingCss: the padding, the safe area added below', () => {
    expect(bottomBarPaddingCss(padded)).toBe('padding: 7px 11px; padding-bottom: calc(7px + env(safe-area-inset-bottom, 0px));')
  })

  it('the cart bar, the place order bar and the floating cart take its padding (and the safe area)', () => {
    ;[MobileCartViewWrapper, MobileWrapperPlaceOrderButton, FloatingContainer].forEach((Component) => {
      const rules = cssOf(padded, Component)
      expect(rules).toContain('padding:7px 11px;')
      expect(rules).toContain('padding-bottom:calc(7px + env(safe-area-inset-bottom,0px));')
    })
    // the floating cart's button leaves the space to the bar
    const { getByRole } = renderWith(padded, <FloatingContainer><Button cartFab>Cart</Button></FloatingContainer>)
    expect(getByRole('button', { name: 'Cart' })).toHaveClass('ui:m-none')
  })

  it('the navigation takes its side padding', () => {
    const rules = cssOf(padded, NavigationBarContainer)
    expect(rules).toContain('padding:0 11px;')
  })
})
