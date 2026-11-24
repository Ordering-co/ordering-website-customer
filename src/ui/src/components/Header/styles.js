import { Button } from '~ui/src/design-system/components/Button'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import React from 'react'
import styled, { css, useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { motionCss } from '~/utils/themeMotion'
import { HEADER_SCROLL_REVEAL, HEADER_STATE_HIDDEN, HEADER_STATE_SCROLLED } from './scrollBehavior'
import { getThemeCss, getThemeComponent } from '~/utils/themeCss'
import { HEADER_STORE_SLOT_SELECTOR } from './behindHeader'
import { pageGutter, themePart, themeShadowDown, themeText, themeValue, themeControlHeight, DEFAULT_CONTROL_SIZE } from '~/utils/themeTokens'
import { scopedTheme, slotButtonOptions, slotSize, themeSlot } from '~/utils/themeGroups'
import { dividerRules } from '~ui/src/styles/Divider'
import { logoBox, themeLogoBoxCss } from '~ui/src/styles/Logo'
import { BOTTOM_NAV_COVER } from '~ui/src/components/NavigationBar/styles'
import { tooltipOffset, tooltipSurfaceCss, tooltipTheme } from '~ui/src/styles/Tooltip'

// The header's sides in px: the page's side space
export const headerSide = (theme) => pageGutter(theme)

// The space between the header's controls in px (header.base.gap), a number
export const headerGap = (theme) => themeValue(theme, 'header', 'base.gap')

// The height of components.header in px, a number
export const headerHeight = (theme) => themeValue(theme, 'header', 'base.height')

// components.header.base as CSS (its view): what the header paints
const headerCss = (theme) => getThemeCss(theme, 'header').base

// The height of components.input of a field piece of the header (its slot's
// size, `header.slots.<slot>`, md by default).
export const fieldHeight = (theme, slot) => themeControlHeight(theme, 'input', slotSize(theme, 'header', slot, DEFAULT_CONTROL_SIZE))

// What the capsule's items (the order type's tabs, the moment, the address)
// share, so they read as one row: the tabs' label text and icon size
// (`components.tabs`, the header's group, the size of `header.slots.order_type`).
const capsuleTabs = (theme) => {
  const scoped = scopedTheme(theme, 'header')
  const tabs = getThemeCss(scoped, 'tabs')
  // the variant the order_type tabs take (the slot's, else the theme's), whose `inactive` is their text color
  const slotVariant = themeSlot(theme, 'header', 'order_type')?.variant
  const variant = tabs.variants[slotVariant] ? slotVariant : getThemeComponent(scoped, 'tabs').base.variant
  return {
    text: tabs.base.text.css,
    inactive: tabs.variants[variant].inactive,
    icon: (tabs.sizes[slotSize(theme, 'header', 'order_type')] || tabs.sizes[DEFAULT_CONTROL_SIZE]).icon_size
  }
}
export const capsuleText = (theme) => capsuleTabs(theme).text
// The color of an inactive order type tab: the moment (ASAP) reads like the tabs it sits beside
export const capsuleInactiveColor = (theme) => capsuleTabs(theme).inactive
export const capsuleIconSize = (theme) => capsuleTabs(theme).icon

// The touch area of a capsule item (the type's tabs, the moment, the address):
// on a coarse pointer (a tablet is wider than the phone cut) it is at least
// 44 px around the item, drawn on a pseudo-element that changes nothing of its
// box, as the base Button does. 44 px is an accessibility floor, not a design
// value, and the design system has no token for it (TOKEN-GAP():
// each piece writes its own literal). Nothing between the item and the header
// may clip it (no `overflow` but visible); the item is `position: relative`.
export const touchAreaCss = (pseudo = '::after') => css`
  &${pseudo} {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
  }
  @media (pointer: coarse) {
    &${pseudo} {
      /* touch-target */ min-width: 44px;
      /* touch-target */ min-height: 44px;
    }
  }
`

/* A bar docked right under the header (this class, the business
   list's banner on small screens) continues it: the header's background and
   text color, and its shadow, cast down below the bar; the header gives it up. */
export const HEADER_DOCKED = 'header-docked'

export const headerDockedRules = (theme) =>
  `${themePart(theme, 'header', { background: 'base.background', color: 'base.color' })}\n${themeShadowDown(theme, 'header')}`

// The header's height (its whole box) as a CSS variable on the root, kept by
// the header while it is on the page: a screen that fills what is left of
// the viewport under it reads calc(100dvh - var(--header-height))
export const HEADER_HEIGHT_VAR = '--header-height'

// The width in px of the header's bottom border
// (components.header.base.border_bottom), 0 without one
const headerBorderBottomWidth = (theme) => theme.values.components.header.base.border_bottom?.width ?? 0

// The layer of the header's row (see the comment on `Header`)
export const HEADER_LAYER = 10002

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  /* components.header */
  ${props => themePart(props.theme, 'header', { background: 'base.background', color: 'base.color', 'border-bottom': 'base.border_bottom', 'min-height': 'base.height' })}
  /* it spans the whole width: its shadow falls down (on the bar docked under
     it, if any) */
  ${props => themeShadowDown(props.theme, 'header')}
  ${props => css`
    /* the row stays on top (): sticky, so the page's own layout
       leaves it its place; with scroll_behavior reveal it also slides out of
       view while the page goes down (the theme's motion for the header, none
       with reduced motion). Its layer is the one of its popovers (the
       header's select and cart popover, 10002), above the store's bar (10001)
       and the categories (9999) and under the modals (20001, a portal): a
       sticky z-index makes it a stacking context, so what the header opens
       in place is held at this layer (the side menu, 20500, too) */
    position: sticky;
    top: 0;
    z-index: ${HEADER_LAYER};
    /* the installed web app on iOS draws under the system's status area (the
       Duo's indicator over the cart, ): the row starts under it, the
       header's background fills it. 0 where there is none. */
    padding-top: env(safe-area-inset-top, 0px);
    ${motionCss(props.theme, 'header', ['transform'])}
    &[data-scroll-state='${HEADER_STATE_HIDDEN}'] {
      transform: translateY(-100%);
    }
    /* the keyboard is up over a text field (, useKeyboardOpen): the header slides out of the way
       (it keeps its place in the flow, so the page does not move) and comes back with the keyboard */
    html[data-keyboard-open] & {
      transform: translateY(-100%);
    }
    /* its shadow is drawn over the page under it (a divider or a border
       starting right below, positioned or not, would cover it): a layer of
       its own over the header's box */
    &::after {
      content: '';
      position: absolute;
      /* the whole box, its bottom border included (the shadow falls from
         under the border, not over it) */
      inset: 0 0 -${headerBorderBottomWidth(props.theme)}px;
      z-index: 1;
      pointer-events: none;
      /* only over a scrolled page: at the top there is nothing under it to
         cast on, and hidden it must not peek into the view */
      box-shadow: none;
    }
    &[data-scroll-state='${HEADER_STATE_SCROLLED}']::after {
      ${themeShadowDown(props.theme, 'header')}
    }
    && {
      box-shadow: none;
    }
    /* a revealing header carries the bar docked under it (it hides and comes
       back with it): the bar's shadow is the unit's */
    html:has(.${HEADER_DOCKED}) &[data-scroll-behavior='${HEADER_SCROLL_REVEAL}']::after {
      box-shadow: none;
    }
  `}
`

// The order context is centered in the desktop row unless the theme moves
// the logo to the center or the right (header.base.logo_position)
const centersOrderContext = (theme) => !['center', 'right'].includes(themeValue(theme, 'header', 'base.logo_position'))

export const InnerHeader = styled.div`
  display: flex;
  width: 100%;
  /* the header's text color (components.header base.color) */
  color: inherit;
  justify-content: space-between;
  align-items: center;

  #left-side {
    justify-content: flex-start;
  }
  #right-side {
    justify-content: flex-end;
  }

  /* the right side as wide as its controls, the order context takes what
     the logo leaves (the address shrinks first, cut with "…") */
  @media (min-width: 769px) {
    #left-side {
      width: initial;
    }
    #left-side:has(${HEADER_STORE_SLOT_SELECTOR}:not(:empty)) {
      min-width: 0;
      justify-self: stretch;
    }
    #right-side {
      width: auto;
      flex: 0 0 auto;
    }
    #center-side {
      width: auto;
      flex: 1 1 auto;
      min-width: 0;
    }
  }
  /* from 769px, the logo on the left: three columns, the order context in
     the middle one, centered on the header's whole width. Short of room, the
     right side's controls keep their width and push it over (never on top),
     the logo's name is cut with "…" (one line, ), the address shrinks () */
  ${props => centersOrderContext(props.theme) && css`
    @media (min-width: 769px) {
      display: grid;
      grid-template-columns: minmax(min-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);
      column-gap: ${headerCss(props.theme).gap};
      #left-side { grid-column: 1; justify-self: start; }
      #center-side { grid-column: 2; }
      #right-side { grid-column: 3; justify-self: end; }
      /* Let the name () or chip () take the room
         left by the other columns. Their text ellipsizes instead of
         setting the left track's minimum and pushing the middle aside. */
      &:has(#left-side ${LogoHeaderName}),
      &:has(#left-side ${HEADER_STORE_SLOT_SELECTOR}:not(:empty)),
      &:has([data-doc-section='header-order-context-chip']) {
        grid-template-columns: minmax(0, 1fr) minmax(0, auto) minmax(max-content, 1fr);
        #left-side { min-width: 0; justify-self: stretch; }
      }
    }
  `}
  /* the row is of the header's height, its controls centered
     in it (no margin around them: a taller logo would grow the header) */
  margin: 0;
  min-height: ${props => headerCss(props.theme).height};
  /* from 769px: without its menu button and logo (hidden by
     visibility.header.*) the order options start at the page's side; not
     when they are centered (a margin would push them off the center) */
  ${props => !centersOrderContext(props.theme) && css`
    @media (min-width: 769px) {
      #left-side:empty + #center-side {
        ${props.theme?.rtl ? 'margin-right' : 'margin-left'}: ${headerSide(props.theme)}px;
      }
    }
  `}
  /* up to 768px: the right side is as wide as its controls (map
     pin, cart, language) and the left side (menu button and logo) takes the
     rest, so the controls never overflow onto the logo; the order context's
     controls the row has (orderContextPlacement) sit between them */
  ${props => css`
    @media (max-width: 768px) {
      flex-wrap: wrap;
      column-gap: ${headerCss(props.theme).gap};
      /* no width of its own (basis 0): it never wraps the right side, it
         takes what that leaves */
      #left-side {
        width: auto;
        flex: 1 1 0%;
        min-width: 0;
      }
      #right-side {
        width: auto;
        flex: 0 0 auto;
      }
      #center-side {
        flex: 0 1 auto;
        width: auto;
        min-width: 0;
        margin: 0;
      }
    }
  `}
`

/* The logo's layout also owns the slot that the store name can occupy. */
const HeaderLogoFrame = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  /* Single Restaurant (): on the store's own page, hidden while
     the store block is in view (its own, bigger, brand shows there instead) —
     kept in the layout (visibility, not display) so the header does not
     shift, and faded back in once scrolled past. */
  ${({ theme }) => motionCss(theme, 'header', ['opacity'])}
  ${props => props.$hideBrand && css`
    visibility: hidden;
    opacity: 0;
  `}

  img {
    margin: 0;
    vertical-align: middle;
    object-fit: contain;

    @media (min-width: 769px) {
      ${({ theme }) =>
    ['center', 'right'].includes(themeValue(theme, 'header', 'base.logo_position')) && css`
        margin-right: var(--ot-space-xxl);
      `};
    }
    /* the header's logo box (T6: header.base.logo_height tall, up to logo_width wide, never
       stretched; the logotype and the mobile isotype alike) and the header's
       one gap from the menu button */
    ${({ theme }) => css`
      ${themeLogoBoxCss(theme, 'header')}
      margin-left: ${headerCss(theme).gap};
      ${theme?.rtl && css`
        margin-left: 0;
        margin-right: ${headerCss(theme).gap};
      `}
      /* up to 768px never wider than the room the left side leaves it */
      @media (max-width: 768px) {
        max-width: min(${logoBox(theme, 'header').maxWidth}px, calc(100% - ${headerCss(theme).gap}));
      }
    `}
  }

  ${props => !props.$disabledResponsive && css`
    img:first-of-type:not(:only-of-type) {
      display: none;
    }
  `}

  @media (min-width: 769px) {
    img:first-of-type {
      display: block;
    }
    img:nth-of-type(2) {
      display: none;
    }
  }
`

export const LogoHeader = ({ $hideBrand, $disabledResponsive, ...props }) => (
  <HeaderLogoFrame $hideBrand={$hideBrand} $disabledResponsive={$disabledResponsive}>
    <Button {...props} appearance='brand' />
  </HeaderLogoFrame>
)

/* The store's back arrow and name in the row (, fixed header): the
   store page puts them here once its name has gone behind the header
   (BusinessStickyHeader, a portal), and they take the logo's place — it
   gives it up while this has something in it. The name can use the room
   left by the header controls. Empty it has no box. */
export const HeaderStoreSlot = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  ${({ theme }) => css`
    gap: ${headerCss(theme).gap};
    margin-${theme?.rtl ? 'right' : 'left'}: ${headerCss(theme).gap};
  `}
  &:empty {
    display: none;
  }
  &:not(:empty) + ${HeaderLogoFrame} {
    display: none;
  }
`

/* The site's own name, shown instead of a logo when the theme has none
   (index.js renders it only without a logo image): the theme's h4 text and
   the header's text color; the menu's gap from the sidebar button. One line,
   cut with "…" (title= keeps the whole name): always, not only beside the
   order context chip, so the header keeps its height when the chip comes and
   goes on scroll and a name never reads "Cha / Sha". Up to 768px it takes all
   the left side leaves beside the controls (InnerHeader keeps them their
   width), from 769px at most 26ch. min-width 0: as a flex item it may shrink
   below its text, and the chip keeps its own minimum (OrderContextChipBox). */
export const LogoHeaderName = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
  max-width: min(100%, 26ch);
  ${({ theme }) => css`
    ${themeText(theme, 'h4', { props: ['size', 'weight', 'line', 'family'] })}
    ${themePart(theme, 'header', { color: 'base.color' })}
    margin-left: ${headerCss(theme).gap};
    ${theme?.rtl && css`
      margin-left: 0;
      margin-right: ${headerCss(theme).gap};
    `}
  `}

  @media (max-width: 768px) {
    max-width: none;
  }
`

/* The order context's chip in the row (fixed header, the bar docked under it
   out of view, ): it shrinks before the menu button and the logo,
   its text is the capsule's, cut with "…" */
export const OrderContextChipBox = styled.div`
  display: flex;
  /* the room the menu button, the logo and the store's name leave (basis 0:
     they keep theirs, the text is what gets cut) */
  flex: 1 1 0%;
  /* a long store name beside it never takes the chip's last characters */
  min-width: min(100%, 16ch);
  ${({ theme }) => `margin-${theme?.rtl ? 'right' : 'left'}: ${headerGap(theme)}px;`}
`

export const OrderContextChipText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ theme }) => capsuleText(theme)}
`

export const CheckoutHomeExit = styled.div`
  display: none;

  html:has([${BOTTOM_NAV_COVER}]) & {
    display: flex;
  }
`

export const LeftHeader = styled.div`
  align-self: center;
  display: flex;
  align-items: center;

  /* beside the chip the store's name takes what it needs, no more */
  &:has(${OrderContextChipBox}) ${HeaderStoreSlot} {
    flex-grow: 0;
  }

  /* Scrolled, with the chip in the row (it only comes then), under 390px the
     name has no room: the chip keeps its 16ch and the name read "Cha …"
     (, Sergio's call). The logo box that holds only the name goes
     (display none: no space, not read, not focusable); a logo image stays. */
  @media (width < 390px) {
    &:has(${OrderContextChipBox}) ${HeaderLogoFrame}:has(${LogoHeaderName}) {
      display: none;
    }
  }
`

export const RightHeader = styled.div`
  align-self: center;
  display: flex;

  /* the select's text and its list are the theme's */
`

export const Menu = styled.div`
  display: flex;
  align-items: center;

  &.left-header {
    border: none;
    box-sizing: border-box;
    flex-grow: 1;
    display: flex;
    align-items: center;
    /* Keep the controls (order type, moment, address) packed tightly to the
       left as one group with a CONSTANT gap at every width, instead of drifting
       apart as the viewport widens (/ ). */
    justify-content: flex-start;
    position: relative;
  }


  .moment-popover {
    height: 100%;
    justify-content: center;
    width: 24ch;
    display: none;

    @media (min-width: 1175px) {
      width: 30ch;
    }

    @media (min-width: 1400px) {
      width: 48ch;
    }

    > div:first-child {
      width: 100%;
      display: flex;
      justify-content: center;
    }
  }

  .address-popover {
    flex-grow: 1;
    display: none;
    > div:first-child {
      width: 100%;
    }
  }


  @media (min-width: 850px) {
    .moment-popover,
    .address-popover {
      display: flex;
    }
  }
  /* the header's spacing — the left group one gap from the logo,
     the right group at the page's side, its controls one gap apart */
  ${({ theme }) => css`
    &.left-header {
      margin: 0 ${headerCss(theme).gap};
      padding: 0;
      gap: ${headerCss(theme).gap};
      /* as tall as its controls (the tabs' height), centered like the right
         group */
      height: ${themeControlHeight(scopedTheme(theme, 'header'), 'tabs', slotSize(theme, 'header', 'order_type', DEFAULT_CONTROL_SIZE))}px;
      align-self: center;
    }
    &:not(.left-header) {
      margin-right: ${headerSide(theme)}px;
      gap: ${headerCss(theme).gap};
    }
  `}
`

export const MenuItem = styled.div`
  display: flex;
`

export const CustomerInfo = styled.div`
  display: none;
  cursor: pointer;
  flex: 1;
  position: relative;
  @media (min-width: 450px) {
    display: flex;
    justify-content: center;
    align-items: center;

    span {
      display: flex;
      align-items: center;
      margin: 0;
      p {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${props => themeColor(props.theme, 'text_muted')};
      }
      svg {
        color: ${props => themeColor(props.theme, 'text_muted')};
        margin: 0;
        font-size: var(--ot-icon-md);
        position: absolute;
        right: 0;
      }
    }
  }
`

export const UserEdit = styled.div`
  > :first-child{
     margin-bottom: var(--ot-space-xl);
  }
`

const StaffAddressLabel = styled.span`
  width: auto;
  min-width: 0;
  overflow: hidden;
`

export const AddressMenu = ({ isCustomerMode, children, ...props }) => {
  const theme = useTheme()
  return isCustomerMode
    ? (
      <ComponentScope group='header'>
        <Button {...props} {...slotButtonOptions(theme, 'header', 'address', { color: 'neutral', appearance: 'ghost' })} layout='row' borderInset coarseTouch style={{ flex: 0.8 }}>
          {React.Children.map(children, child => child?.type === 'span'
            ? <StaffAddressLabel {...child.props} />
            : child)}
        </Button>
      </ComponentScope>
      )
    : <Button {...props} appearance='capsule-item' coarseTouch>{children}</Button>
}

export const MomentMenu = (props) => <Button {...props} appearance='capsule-item' capsuleItem='moment' coarseTouch />

export const AddressWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
`

/* A tooltip of the theme pinned under the address, a status (it is not
   opened by hover: it shows while the address seems far) */
export const FarAwayMessage = styled.div.attrs({ role: 'status' })`
  pointer-events: none;
  position: absolute;
  display: flex;
  align-items: center;
  z-index: 2000;
  /* Anchor to the address (AddressWrapper is position:relative and wraps only
     the address): sit just below it with the caret pointing up at it. The old
     hardcoded left:210px detached the bubble from the address (). */
  top: 100%;
  left: 0;
  box-sizing: border-box;

  ${props => props.theme?.rtl && css`
    right: 0;
    left: initial;
  `}

  svg {
    position: absolute;
    top: calc(-1 * var(--ot-space-md));
    left: var(--ot-space-xl);
    font-size: var(--ot-icon-md);
    margin-right: var(--ot-space-md);
    ${props => props.theme?.rtl && css`
      margin-right: auto;
      margin-left: var(--ot-space-md);
      left: initial;
      right: var(--ot-space-xl);
    `}
  }
  /* components.tooltip (its surface, text, widest width and
     offset under the address); the caret in its fill */
  ${props => css`
    && {
      ${tooltipSurfaceCss(props.theme)}
      width: max-content;
      margin: ${tooltipOffset(props.theme)} 0px 0px 0px !important;
    }
    && svg {
      color: ${tooltipTheme(props.theme).background};
    }
    && span {
      color: inherit;
      font: inherit;
    }
  `}
`

/* components.divider vertical */
export const Divider = styled.div`
  ${props => dividerRules(props.theme, 'vertical')}
`
export const AddressFormWrapper = styled.div`
  @media (min-width: 450px) {
    margin-top: var(--ot-space-xl);
  }
`
// Where the language select sits: the piece (`Select size`) draws its own box.
// With a single language the select renders nothing: an empty wrapper must not
// take its margin plus the Menu's gap, which pushed the cart off the page margin.
// Its margin is on the start side only: its end edge is the page's side ()
export const LanguageSelectorWrapper = styled.div`
  display: flex;
  margin-inline-start: var(--ot-space-xs);
  &:empty {
    display: none;
  }
`

export const LeftSide = styled.div`
  display: flex;
  width: 100%;
  /* up to 768px: its menu button with the logo and its order
     type are laid out by the header's row (see InnerHeader) */
  ${({ theme }) => css`
    @media (max-width: 768px) {
      display: contents;
    }
  `}
  /* what the right side's controls leave */
  @media (min-width: 769px){
    flex-direction: ${({ theme }) =>
    ['center', 'right'].includes(themeValue(theme, 'header', 'base.logo_position')) ? 'row-reverse' : 'row'};
    width: auto;
    flex: 1 1 auto;
    min-width: 0;
    /* the logo on the left: its logo and the order context are the row's
       own columns (see InnerHeader) */
    ${({ theme }) => centersOrderContext(theme) && css`
      display: contents;
    `}
  }
`

/* the order type of the row: without order types to choose it takes no room
   (nor the row's gap) */
export const AddressOrderTypeContainer = styled.div`
  &:has(> :empty) {
    display: none;
  }
`
