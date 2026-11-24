import React from 'react'
import { describe, it, expect } from 'vitest'
import { schemaEntry } from '~/utils/themeSchema'
import THEME_COMPILED from '~/theme.compiled.json'
import { NavigationBarContainer, NavigationLink, bottomNavDockedRules, bottomNavHeight, bottomNavShown } from '../styles'
import { Container as FloatingContainer } from '../../FloatingButton/styles'
import { BannerContainer } from '../../CookieConsentBanner/styles'
import { MobileCartViewWrapper } from '../../BusinessProductsListing/styles'
import { MobileCartViewWrapper as LayoutCartBar } from '../../RenderProductsLayout/styles'
import { ActionsForm } from '../../UserFormDetails/styles'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const withNav = (base) => themeWithValues((values) => {
  values.components.bottom_nav.base = { ...values.components.bottom_nav.base, ...base }
  return values
})

// The bottom offset of a rule below a width (`@media (max-width:575px){…bottom:Npx…}`)
const mobileBottom = (css) => css.match(/@media \(max-width:57[56]px\)\{[^}]*?bottom:(\d+)px/)?.[1]

describe('bottom navigation sizes (components.bottom_nav)', () => {
  it('the schema defaults are today\'s: 65 tall, the md icon', () => {
    expect(schemaEntry('components.bottom_nav.base.height')).toMatchObject({ type: 'number', value: 65 })
    expect(schemaEntry('components.bottom_nav.base.icon_size')).toMatchObject({ type: 'icon', value: '{icon.md}' })
  })

  it('bottomNavHeight: the theme\'s height', () => {
    expect(bottomNavHeight(themeWithValues())).toBe(65)
    expect(bottomNavHeight(withNav({ height: 72 }))).toBe(72)
    // the merge: a size out of range is clamped; one that is not a number is the default
    expect(bottomNavHeight(withNav({ height: 0 }))).toBe(THEME_COMPILED.values.components.bottom_nav.base.height.$rule[0])
    expect(bottomNavHeight(withNav({ height: '72px' }))).toBe(65)
  })

  it('the navigation is bottom_nav.base.height tall', () => {
    const { getByText } = renderWith(withNav({ height: 72 }), <NavigationBarContainer>Nav</NavigationBarContainer>)
    expect(cssFor(getByText('Nav'))).toContain('height:72px')
  })

  it('its icons are bottom_nav.base.icon_size', () => {
    const themed = renderWith(withNav({ icon_size: 24 }), <NavigationLink>Home</NavigationLink>)
    expect(themed.getByText('Home').style.getPropertyValue('--ui-bottom-nav-icon-size')).toBe('24px')
    // by default the theme's md icon (20)
    const byDefault = renderWith(themeWithValues(), <NavigationLink>Orders</NavigationLink>)
    expect(byDefault.getByText('Orders').style.getPropertyValue('--ui-bottom-nav-icon-size')).toBe('20px')
  })

  it('the bars over it follow its height: the floating cart, the cart bars, the profile actions and the cookie banner', () => {
    const theme = withNav({ height: 72 })
    const css = (t, Component) => {
      const { container } = renderWith(t, <Component>Bar</Component>)
      return cssFor(container.firstChild)
    }
    expect(mobileBottom(css(theme, FloatingContainer))).toBe('72')
    expect(mobileBottom(css(theme, MobileCartViewWrapper))).toBe('72')
    expect(mobileBottom(css(theme, LayoutCartBar))).toBe('72')
    expect(mobileBottom(css(theme, ActionsForm))).toBe('72')
    // the banner keeps its 25px over the navigation
    expect(mobileBottom(css(theme, BannerContainer))).toBe('97')
  })

  it('the schema defaults: 65 over the navigation, and 90 for the banner', () => {
    const theme = themeWithValues()
    const css = (Component) => {
      const { container } = renderWith(theme, <Component>Bar</Component>)
      return cssFor(container.firstChild)
    }
    expect(mobileBottom(css(FloatingContainer))).toBe('65')
    expect(mobileBottom(css(MobileCartViewWrapper))).toBe('65')
    expect(mobileBottom(css(LayoutCartBar))).toBe('65')
    expect(mobileBottom(css(ActionsForm))).toBe('65')
    expect(mobileBottom(css(BannerContainer))).toBe('90')
  })
})

describe('the theme hides the bottom navigation (visibility bottom_nav)', () => {
  const hidden = themeWithValues((values) => {
    values.visibility.bottom_nav = false
    values.components.bottom_nav.base.border_top = { width: 1, color: '#123456', style: 'solid' }
    return values
  })

  it('bottomNavShown follows the key', () => {
    expect(bottomNavShown(hidden)).toBe(false)
    expect(bottomNavShown(themeWithValues())).toBe(true)
  })

  it('its height is 0: the bars it lifted go down to the bottom', () => {
    expect(bottomNavHeight(hidden)).toBe(0)
    const css = (Component) => {
      const { container } = renderWith(hidden, <Component>Bar</Component>)
      return cssFor(container.firstChild)
    }
    expect(mobileBottom(css(FloatingContainer))).toBe('0')
    expect(mobileBottom(css(MobileCartViewWrapper))).toBe('0')
    expect(mobileBottom(css(LayoutCartBar))).toBe('0')
    expect(mobileBottom(css(ActionsForm))).toBe('0')
    expect(mobileBottom(css(BannerContainer))).toBe('25')
  })

  it('a bar docked above it is the lowest one: its top border on every screen', () => {
    const rules = bottomNavDockedRules(hidden, { aboveNav: true })
    expect(rules).not.toContain('@media')
    expect(rules).toContain('border-top: 1px solid #123456')
  })
})

describe('the labels of the bottom navigation (bottom_nav.base.label_text)', () => {
  it('the schema default is the caption', () => {
    expect(schemaEntry('components.bottom_nav.base.label_text')).toMatchObject({ type: 'text', value: '{typography.caption}' })
  })

  it('the labels take the theme\'s text', () => {
    const theme = withNav({ label_text: { size: 13, line: 1.23, weight: 600 } })
    const themed = renderWith(theme, <NavigationLink><span>Home</span></NavigationLink>)
    const { style } = themed.getByRole('button', { name: 'Home' })
    expect(style.getPropertyValue('--ui-bottom-nav-label-text-size')).toBe('13px')
    expect(style.getPropertyValue('--ui-bottom-nav-label-text-line')).toBe('1.23')
    expect(style.getPropertyValue('--ui-bottom-nav-label-text-weight')).toBe('600')
  })
})
