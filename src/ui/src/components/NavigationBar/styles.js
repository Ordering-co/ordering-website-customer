import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themePart, themeShadowUp, themeValue } from '~/utils/themeTokens'
import { themeBaseSpace } from '~/utils/productCartTheme'
import { themeVisible } from '~/utils/themeVisibility'
import { motionEasing, themeMotionEnabled } from '~/utils/themeMotion'
import { HIDE_WHILE_TYPING, TYPING_SELECTOR } from '~ui/hooks/useKeyboardOpen'

/* A bar of the whole width fixed at the bottom (this class: the
   store's cart bar, the checkout's place order bar, the floating cart) is a
   bottom bar like the navigation (components.bottom_nav, the one source of
   every bottom bar): its background, its padding (bottomBarPaddingCss) and
   its shadow, cast up; its
   border only on top (the bar spans the whole width) and only on the lowest
   bar: one docked above the navigation (`aboveNav`, the navigation is there
   below 576px) has none there.
   Docked above the navigation (or over it) it continues it, and the
   navigation gives its shadow up. */
export const BOTTOM_NAV_DOCKED = 'bottom-nav-docked'
export const BOTTOM_NAV_COVER = 'data-bottom-nav-cover'
// every bar fixed at the bottom: the navigation itself and the ones docked on it
export const BOTTOM_BAR_SELECTOR = `.${BOTTOM_NAV_DOCKED}, [data-doc-section='mobile-bottom-navigation']`

/**
 * Whether the bottom navigation is there (below 576px): the theme can hide
 * the whole bar (visibility `bottom_nav`).
 */
export const bottomNavShown = (theme) => themeVisible(theme, 'bottom_nav')

/**
 * The height of the bottom navigation in px (a number):
 * `components.bottom_nav.base.height`, 0 when the theme hides the bar
 * (nothing above it keeps its room). The bars fixed above the navigation
 *, the floating cart, the cookie banner and the page's room below
 * use it.
 */
export const bottomNavHeight = (theme) => bottomNavShown(theme) ? themeValue(theme, 'bottom_nav', 'base.height') : 0

// The room the app leaves at the page's end below 576px for the navigation:
// its height and BOTTOM_NAV_ROOM_GAP more; 0 when the theme hides it
export const BOTTOM_NAV_ROOM_GAP = 15
export const bottomNavRoom = (theme) => bottomNavShown(theme) ? bottomNavHeight(theme) + BOTTOM_NAV_ROOM_GAP : 0

/**
 * The padding of a bar fixed at the bottom (the store's cart bar,
 * the checkout's place order bar, the floating cart):
 * `components.bottom_nav.base.padding_y` / `padding_x`, the device's safe
 * area added below.
 */
export const bottomBarPaddingCss = (theme) => {
  const y = themeBaseSpace(theme, 'bottom_nav', 'padding_y')
  const x = themeBaseSpace(theme, 'bottom_nav', 'padding_x')
  return `padding: ${y} ${x}; padding-bottom: calc(${y} + env(safe-area-inset-bottom, 0px));`
}

/**
 * What every bar fixed at the bottom (the navigation, the store's cart bar, the floating cart) does while a text field
 * is being typed in (implementation notes, useKeyboardOpen): it hides (HIDE_WHILE_TYPING: out of the screen, no touches, out of
 * the accessibility tree) and comes back with the field's blur. The keyboard of iOS covers the bars' place or they
 * sit right above it, over the field and its results.
 * The bar slides at the identity's base speed and easing (`tokens.motion.base`, `motion_style`), and at once when
 * the theme turns motion off or the system reduces it. It is hidden for assistive technology once it has left
 * (`visibility` waits for the slide) and visible as soon as it comes back.
 */
export const bottomBarTypingCss = (theme) => {
  const ms = theme.values.tokens.motion.base
  const slide = `transform ${ms}ms ${motionEasing(theme)}`
  return `
    ${themeMotionEnabled(theme)
      ? `@media (prefers-reduced-motion: no-preference) {
          transition: ${slide}, visibility 0s linear 0s;
          ${TYPING_SELECTOR} {
            transition: ${slide}, visibility 0s linear ${ms}ms;
          }
        }`
      : ''}
    ${HIDE_WHILE_TYPING}
  `
}

export const bottomNavDockedRules = (theme, { aboveNav = false } = {}) => {
  const border = themePart(theme, 'bottom_nav', { 'border-top': 'base.border_top' })
  // with the navigation hidden (visibility bottom_nav) the bar is the lowest
  // one on every screen: its top border everywhere
  const overNav = aboveNav && bottomNavShown(theme)
  return [
    'border: none;',
    themePart(theme, 'bottom_nav', { background: 'base.background' }),
    overNav ? `@media (min-width: 576px) { ${border} }` : border,
    themeShadowUp(theme, 'bottom_nav')
  ].filter(Boolean).join('\n')
}

export const NavigationBarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  box-sizing: border-box;
  z-index: 1005;
  /* components.bottom_nav: its top border, and as it spans the whole width
     at the bottom its shadow goes up (on the bar docked above it, if any) */
  ${props => css`
    ${themePart(props.theme, 'bottom_nav', { background: 'base.background', 'border-top': 'base.border_top' })}
    ${themeShadowUp(props.theme, 'bottom_nav')}
    /* the height the bars above it leave free (bottom_nav.base.height, its
       border included), not its content's: a bar docked on it covers none
       of its border */
    height: ${bottomNavHeight(props.theme)}px;
    /* the side padding of every bottom bar (bottom_nav.base.padding_x) */
    padding: 0 ${themeBaseSpace(props.theme, 'bottom_nav', 'padding_x')};
    html:has(.${BOTTOM_NAV_DOCKED}) & {
      box-shadow: none;
    }
    /* The covered buttons must also leave the tab order and accessibility tree. */
    html:has([${BOTTOM_NAV_COVER}]) & {
      display: none;
    }
    ${bottomBarTypingCss(props.theme)}
  `}
`

export const NavigationLink = (props) => <Button {...props} appearance='bottom-nav-item' />
