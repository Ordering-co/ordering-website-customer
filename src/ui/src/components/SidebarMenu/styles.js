import styled, { css } from 'styled-components'
import { isTransparent, primaryText } from '~/utils/themeColors'
import { headerHeight } from '~ui/src/components/Header/styles'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { motionCss } from '~/utils/themeMotion'
import { headingText, themeFocusRing, themeShadowDown, themeShadowToward, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { focusRingCss } from '~ui/src/styles/Focus'
import { layerBackgroundCss } from '~ui/src/styles/Layer'

/* components.sidebar_menu.base: its values (to decide) and as CSS (to paint) */
const sidebarTheme = (theme) => getThemeComponent(theme, 'sidebar_menu').base
const sidebarCss = (theme) => getThemeCss(theme, 'sidebar_menu').base
// A color of the sidebar
const sidebarColor = (theme, key) => sidebarTheme(theme)[key]
// The panel's titles: their text and color (`title`, `title_color`).
const sidebarTitle = (theme) => `${sidebarCss(theme).title.css} color: ${sidebarColor(theme, 'title_color')};`
// The height of the panel's header row in px: the header's (components.header).
const sidebarHeaderHeight = (theme) => headerHeight(theme)
// The same height as CSS
const sidebarHeaderHeightCss = (theme) => getThemeCss(theme, 'header').base.height
// The header's bottom border (components.header.base.border_bottom), or null
// when it has none.
const headerBorder = (theme) => themeValue(theme, 'header', 'base.border_bottom')
// The side space of the page as CSS (tokens.layout.page_gutter)
const gutter = (theme) => theme.css.tokens.layout.page_gutter
// Room the header leaves for the close button on its end side: the gutter the button sits at, its box (the same
// icon Button as in index.js) and a space
const closeReserve = (theme) => `calc(${gutter(theme)} + ${componentVars(theme, 'button', { size: 'md', shape: 'icon' })['--ui-button-height']} + ${themeSpace(theme, 'lg')})`

// The panel's header, the greeting: its text and color (`header_text`,
// `header_color`).
const sidebarHeader = (theme) => `${sidebarCss(theme).header_text.css} color: ${sidebarColor(theme, 'header_color')};`
// The options' border (`item_border`) as CSS, or null when they have none.
const itemBorder = (theme) => sidebarTheme(theme).item_border ? sidebarCss(theme).item_border : null
// The options inside the panel's sides, as boxes (`item_style` inset), the
// space between two of them; full (the panel's width) otherwise.
const isInset = (theme) => sidebarTheme(theme).item_style === 'inset'
// Whether the options show their icons (`show_icons`).
export const sidebarShowsIcons = (theme) => sidebarTheme(theme).show_icons
// Whether the groups show their titles (`show_titles`).
export const sidebarIconSize = (theme) => sidebarCss(theme).icon_size
export const sidebarShowsTitles = (theme) => sidebarTheme(theme).show_titles

// The open panel's width above 489px as CSS: the sidebar's `width` (the
// merge keeps it within its range, narrower than that)
export const sidebarPanelWidth = (theme) => sidebarCss(theme).width

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  /* the menu button sits at the header's side */
  ${({ theme }) => `padding-${theme?.rtl ? 'right' : 'left'}: ${gutter(theme)};`}
`

// The panel's header (the greeting), laid out as a row
export const SIDEBAR_HEADER = 'sidebar-header'

export const SidebarContent = styled.div`
  box-sizing: border-box;
  /* Fill the full viewport height and let the menu scroll, so the lower items
     (down to Sessions / Logout) stay reachable instead of being clipped.
     dvh accounts for mobile browser chrome; vh/% are fallbacks. */
  height: 100vh;
  height: 100dvh;
  width: 0;
  position: fixed;
  z-index: 20500;
  top: 0;
  ${({ theme }) => layerBackgroundCss(sidebarColor(theme, 'background'))}
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* it slides at the theme's speed (components.sidebar_menu
     animated / speed), or opens at once */
  ${({ theme }) => motionCss(theme, 'sidebar_menu', ['width'])}
  padding-bottom: ${({ theme }) => themeSpace(theme, 'xl')};
  /* components.sidebar_menu. The panel is the full height
     against a side of the screen: its border only on the side facing the
     page, its shadow cast that way. */
  ${({ theme }) => {
    const side = theme?.rtl ? 'left' : 'right'
    const border = sidebarTheme(theme).border
    return css`
      background-color: ${sidebarColor(theme, 'background')};
      border: none;
      ${border && `border-${side}: ${sidebarCss(theme).border};`}
      ${themeShadowToward(theme, 'sidebar_menu', side)}
    `
  }}
  /* the header row takes the top space */
  padding-top: ${({ theme }) => sidebarHeaderHeightCss(theme)};
  &:has(> .${SIDEBAR_HEADER}) {
    padding-top: 0;
  }
  /* a closed menu (width 0) has no shadow nor border, or they would show as
     a strip at the edge of the screen. */
  ${({ $open }) => !$open && css`
    box-shadow: none;
    border: none;
  `}

  > h3 {
    ${props => headingText(props.theme, 'h3')}
    margin: ${({ theme }) => themeSpace(theme, 'md')} ${({ theme }) => themeSpace(theme, 'xl')};
    /* the panel's titles */
    ${({ theme }) => sidebarTitle(theme)}
  }

  ${props => props.theme?.rtl
  ? css`
      right: 0;
  `
: css`
      left: 0;
  `}

  @media (max-height: 450px) {
    padding-top: ${({ theme }) => themeSpace(theme, 'lg')};
  }
`

/* The close control is a button of the icon shape (its box is the Button's,
   inside), of the header's size, centered in the panel's header row (the
   header's height) at the header's side. */
export const MenuClose = styled.div`
  position: absolute;
  display: flex;
  max-width: 100%;
  ${({ theme }) => css`
    top: ${sidebarHeaderHeight(theme) / 2}px;
    transform: translateY(-50%);
    /* over the header row (z-index 1, for its shadow over the options) */
    z-index: 2;
    ${theme?.rtl ? `left: ${gutter(theme)}; right: auto;` : `right: ${gutter(theme)}; left: auto;`}
  `}
`

export const CustomerInfo = styled.div.attrs({ className: SIDEBAR_HEADER })`
  ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'], weight: 500 })}
  color: ${({ theme }) => primaryText(theme)};

  p {
    display: flex;
    margin: 0px;
    /* the panel's header */
    ${({ theme }) => sidebarHeader(theme)}
  }

  .customer-name {
    padding-left: ${({ theme }) => themeSpace(theme, 'xs')};
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* the header is the panel's first row, beside the close
     button, of the header's height (taller with a larger header_text) and its
     shadow, cast down over the options */
  ${({ theme }) => css`
    position: relative;
    z-index: 1;
    ${themeShadowDown(theme, 'header')}
    ${headerBorder(theme) && `border-bottom: ${getThemeCss(theme, 'header').base.border_bottom};`}
    top: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: auto;
    min-height: ${sidebarHeaderHeight(theme) + (Number(headerBorder(theme)?.width) || 0)}px;
    margin: 0;
    /* the side of the header; room for the close button on the other */
    padding: ${theme?.rtl ? `${themeSpace(theme, 'sm')} ${gutter(theme)} ${themeSpace(theme, 'sm')} ${closeReserve(theme)}` : `${themeSpace(theme, 'sm')} ${closeReserve(theme)} ${themeSpace(theme, 'sm')} ${gutter(theme)}`};
  `}
`

const menuItemFeedback = (theme) => css`
  transform: none;
  box-shadow: none;
  background: ${sidebarColor(theme, 'item_hover')};
`

export const MenuLink = styled.a`
  position: relative;
  cursor: pointer;
  overflow: hidden;
  text-decoration: none;
  appearance: none;
  border: none;
  padding: 0px;
  margin: 0px;
  text-align: inherit;
  /* a login / sign up / logout option is a <button>: the text of the panel */
  font: inherit;
  color: inherit;
  display: block;
  width: 100%;
  outline: none !important;

  @media (max-height: 450px) {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
  }
  /* an option of components.sidebar_menu (item_style): full,
     the panel's whole width, its border (item_border) only above and below,
     one line between two options, no radius; inset, a box within the panel's
     sides, of its radius and its whole border, the theme's sm space from
     the next. Still on
     hover (its hover color only, as the buttons), the active one on its
     active background */
  ${({ theme }) => css`
    background: transparent;
    transition: none;
    ${isInset(theme)
      ? css`
        box-sizing: border-box;
        width: auto;
        margin: ${themeSpace(theme, 'sm')} ${gutter(theme)} 0;
        border-radius: ${sidebarCss(theme).item_radius};
        ${itemBorder(theme) && `border: ${itemBorder(theme)};`}
      `
      : css`
        border-radius: 0;
        ${itemBorder(theme) && `
          border-top: ${itemBorder(theme)};
          border-bottom: ${itemBorder(theme)};
          & + & {
            border-top: none;
          }
        `}
        /* under the header row's bottom border, the first option has no top one */
        ${itemBorder(theme) && headerBorder(theme) && css`
          ${MenuClose} + & {
            border-top: none;
          }
        `}
      `}
    &:active {
      ${menuItemFeedback(theme)}
    }
    @media (hover: hover) and (pointer: fine) {
      &:hover {
        ${menuItemFeedback(theme)}
      }
    }
    &:has([data-active='true']) {
      background: ${sidebarColor(theme, 'item_active_background')};
    }
    /* the keyboard's focus is seen: the theme's focus ring, inside the row
       (the row touches the panel's edges) */
    &:focus-visible {
      ${focusRingCss(theme, { important: true })}
      outline-offset: -${themeFocusRing(theme).width} !important;
    }
  `}
  /* a row that only informs (the loyalty level) is not an
     option: no pointer and no hover */
  ${({ $static }) => $static && css`
    cursor: default;
    &:active {
      background: transparent;
    }
    @media (hover: hover) and (pointer: fine) {
      &:hover {
        background: transparent;
      }
    }
  `}
`

export const WrappContent = styled.div`
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  display: grid;
  grid-template-rows: auto auto auto;
  grid-template-columns: auto 1fr;
  column-gap: ${({ theme }) => themeSpace(theme, 'xl')};

  @media (min-width: 489px) {
    /* the panel's width (sidebar_menu.base.width) */
    max-width: ${({ theme }) => sidebarPanelWidth(theme)};
  }
  /* without icons: the text takes the whole row */
  ${({ theme }) => !sidebarShowsIcons(theme) && css`
    column-gap: 0;
  `}
  /* the option is the sidebar's item_height (its side padding
     only), its content centered in it */
  min-height: ${({ theme }) => sidebarCss(theme).item_height};
  padding: 0 ${({ theme }) => themeSpace(theme, 'lg')};
  align-content: center;
`

export const MenuLinkIcon = styled.div`
  grid-area: 2 / 1 / auto / auto;
  flex-shrink: 0;
  line-height: 0;
  display: flex;
  align-items: center;
  margin: 0px;

  svg {
    flex-shrink: 0;
  }
  /* the icons of components.sidebar_menu (its size and color,
     the active one's color), still; hidden with show_icons false */
  ${({ theme, active, $danger }) => {
    const color = $danger ? sidebarColor(theme, 'item_danger') : active ? sidebarColor(theme, 'item_active') : sidebarColor(theme, 'icon_color')
    const size = sidebarCss(theme).icon_size
    return css`
      ${!sidebarShowsIcons(theme) && 'display: none;'}
      svg {
        transform: none;
        transition: none;
        width: ${size};
        height: ${size};
        color: ${color};
      }
    `
  }}
`

export const MenuLinkText = styled.div`
  max-width: 100%;
  flex-grow: 1;
  overflow: hidden;
  flex-basis: 100%;
  grid-area: 2 / 2 / auto / auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media (min-width: 489px) {
    flex-direction: row;
  }
  ${({ theme }) => !sidebarShowsIcons(theme) && css`
    grid-column: 1 / -1;
  `}
`

/* `data-active` lets the option (MenuLink) know its text is the active one.
   A nav label is a list option: it wraps to 2 lines before it is cut, never
   on one line with "…" (the item's row grows with it, align-content: center
   on WrappContent keeps it centered); its full text stays available as the
   title for the rare label past 2 lines. */
export const TextInfo = styled.span.attrs(({ active, children, title }) => ({
  'data-active': active ? 'true' : undefined,
  title: title ?? (typeof children === 'string' ? children : undefined)
}))`
  letter-spacing: -0.04ch;
  text-transform: capitalize;
  text-align: left;
  margin: 0px;
  padding: 0px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-variant-ligatures: no-common-ligatures;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;

  ${props => props.theme?.rtl && css`
    text-align: right;
  `}

  /* the options' text and colors of components.sidebar_menu
     (the active one's, Logout's danger) */
  ${({ theme, active, $danger }) => {
    const color = $danger ? sidebarColor(theme, 'item_danger') : active ? sidebarColor(theme, 'item_active') : sidebarColor(theme, 'item_color')
    return css`
      ${sidebarCss(theme).item_text.css}
      color: ${color};
    `
  }}
  ${({ bold }) => bold && 'font-weight: 600;'}
`
/* The overlay behind the open panel (`overlay`, transparent by
   default: none). It lets the clicks through, as the page without it. */
export const SidebarOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20499;
  pointer-events: none;
  background: ${({ $color }) => $color};
`

export const sidebarOverlayColor = (theme) => {
  const color = sidebarColor(theme, 'overlay')
  return isTransparent(color) ? null : color
}
