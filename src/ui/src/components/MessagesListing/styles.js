import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { buttonStill, themeBorderStyle, themeBorderWidth, themeMedia, themePart, themeRadius, themeShadow, themeSize, themeSpace, themeText, headingText, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { focusRingCss } from '~ui/src/styles/Focus'
import { badgeCss } from '~ui/src/styles/Badge'
import { themeSlot } from '~/utils/themeGroups'
import { getThemeCss } from '~/utils/themeCss'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeBreakpoint.mjs'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleGap, pageTitleText } from '~ui/src/styles/Page'

export const MessagesListingContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  max-width: 85%;

  /* Keep the list header first while the list and chat scroll in their own panes. */
  --inbox-header-height: var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height});
  --inbox-bottom-nav-height: 0px;
  height: calc(100vh - var(--inbox-header-height) - var(--inbox-bottom-nav-height));
  height: calc(100dvh - var(--inbox-header-height) - var(--inbox-bottom-nav-height));

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px) {
    --inbox-bottom-nav-height: ${({ theme }) => bottomNavHeight(theme)}px;
  }
  @media (min-width: 1024px) {
    flex-direction: row;
  }

  /* The account page's padding is inside the space available to the inbox. */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
  ${props => blockStill(props.theme)}
`
export const OrderListItems = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  overflow: hidden;
  /* The tabs' scrollport reserves its own touch room. On touch, the outer
     list must let that room reach above the heading. The inner list still clips. */
  @media (pointer: coarse) {
    ${({ $sortTabs }) => $sortTabs && 'overflow: visible;'}
  }
  /* the title on top, the list fills what is left. The list's
     lg at the sides (room for the cards' focus outline) is outside the
     page's box: the title and the cards line up with the box, as the other
     account pages' content; side by side only at the start (at the end it
     keeps the conversation lg away) */
  display: flex;
  flex-direction: column;
  margin-left: calc(-1 * ${props => themeSpace(props.theme, 'lg')});
  margin-right: calc(-1 * ${props => themeSpace(props.theme, 'lg')});
  @media (min-width: 1024px) {
    ${props => props.theme?.rtl ? 'margin-left: 0;' : 'margin-right: 0;'}
  }

  @media (min-width: 1024px) {
    margin-top: 0px;
    /* side by side, the list owns its width: the cards fill it */
    flex: 0 0 auto;
    width: min(100%, 52ch);
  }

  @media (min-width: 1300px){
    width: min(100%, 71ch);
  }
  ${props => blockStill(props.theme)}
`
export const MessageContainer = styled.div`
  overflow: hidden;
  flex: 2 1 0%;
  min-height: 0;
  &:empty { display: none; }
  margin-top: ${props => themeSpace(props.theme, 'xl')};

  @media (min-width: 1024px) {
    margin-top: 0px;
    height: 100%;
    flex: 1 1 0%;
  }
  ${props => blockStill(props.theme)}
`
export const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  /* the title at the top of the page's box, as on the other
     account pages; under it the page title's gap, less the list's top room
     for the cards' focus outline (sm) */
  flex: 0 0 auto;
  min-height: 0;
  padding: 0 ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: calc(${props => pageTitleGap(props.theme)} - ${props => themeSpace(props.theme, 'sm')});
  ${props => blockStill(props.theme)}
`
export const InnerTabsContainer = styled.div`
  display: flex;

  > div {
    white-space: nowrap;
  }

  ${props => blockStill(props.theme)}
`
export const Title = styled.h1`
  margin: 0;
  ${props => headingText(props.theme, 'h1')}
  /* the title of the account pages (components.account_page
     title and title_color), as the other pages of the account; its place
     and gap are the inbox's own (a column, not the pages' box) */
  ${props => `&& { ${pageTitleText(props.theme)} }`}
  ${props => blockStill(props.theme)}
`
export const OrderListContainer = styled.div`
  /* what is left under the title */
  flex: 1 1 auto;
  min-height: 0;
  ${props => blockStill(props.theme)}
`
export const OrdersListContainer = styled.div`
  height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  /* lg from the sides; room for the cards' focus outline */
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'lg')} 0;
  ${props => blockStill(props.theme)}
`

/* A conversation is a card of components.order_card that opens
   on click: its border stays the card's on hover (no primary border: the
   open one is its active background), lg inside and between its logo and
   its text, md between the cards; a keyboard focus is the theme's focus
   ring. */
const orderCardCss = (theme) => {
  const lg = themeSpace(theme, 'lg')
  return css`
    gap: ${lg};
    padding: ${lg};
    margin-bottom: ${themeSpace(theme, 'md')};
    &:hover {
      ${themePart(theme, 'order_card', { border: 'base.border' })}
    }
    &:focus-visible { ${focusRingCss(theme)} }
  `
}

export const OrderCard = styled.div`
  min-height: calc(1.25 * ${props => themeSize(props.theme, 'xl')});
  /* the card fills the list at every width */
  width: 100%;
  box-sizing: border-box;
  display: flex;
  position: relative;
  cursor: pointer;

  p {
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0px;
    ${props => blockStill(props.theme)}
  }

  /* the business name: a line of text, not a heading */
  .business-name {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
  }

  .order-type-status {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    p {
      color: ${props => themeColor(props.theme, 'text')};
      ${props => blockStill(props.theme)}
    }
    .green {
      color: ${props => primaryText(props.theme)};
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  .order-header-left {
    display: flex;
    align-items: center;
    ${props => blockStill(props.theme)}
  }

  .order-header-right {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    ${props => blockStill(props.theme)}
  }
  /* components.order_card (active: the open conversation) */
  ${props => themePart(props.theme, 'order_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  ${props => props.active && themePart(props.theme, 'order_card', { background: 'variants.default.states.active.background' })}
  /* see orderCardCss */
  ${props => orderCardCss(props.theme)}
  ${props => blockStill(props.theme)}
  /* the hover of components.order_card (its shadow; faded when the theme animates it) */
  ${props => cardHoverCss(props.theme, 'order_card')}
  /* the card while loading is not a control: no pointer, no hover */
  ${({ $skeleton }) => $skeleton && 'pointer-events: none; cursor: default;'}
`

export const OrderHeader = styled.div`

  > div {
    display: flex;
    margin: ${props => themeSpace(props.theme, 'xs')} 0 ${props => themeSpace(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }

  > p {
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`
export const ViewDetails = styled.a`
  cursor: pointer;
  color: ${props => primaryText(props.theme)};
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}

  &:hover {
    text-decoration: underline;
    transform: translateX(${props => themeSpace(props.theme, 'xxs')});
  }
  margin: 0 ${props => themeSpace(props.theme, 'md')};
  /* still, like every button */
  ${props => buttonStill(props.theme)}
`

export const CardContent = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: 1300px) {
    flex-direction: row;
  }
  ${props => blockStill(props.theme)}
`
export const BusinessInfo = styled.div`
  width: 100%;
  box-sizing: border-box;
  /* the business name (p.bold) identifies the conversation: it wraps to 2
     lines before it is cut, never on one line with "…"; the card's
     min-height (not a fixed height) lets the row grow for it */
  p {
    overflow: hidden;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    ${props => blockStill(props.theme)}
  }
  display: flex;
  align-items: center;

  div.info {
    flex: 1;
    min-width: 0;
    ${props => props.theme?.rtl
? css`
      margin-right: ${props => themeSpace(props.theme, 'md')};
    `
: css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
    `}
    p {
      margin: 0px;
      color: ${props => themeColor(props.theme, 'text')};
      ${props => themeText(props.theme, 'caption', { props: ['size'] })}
      ${props => blockStill(props.theme)}
    }
    p.bold {
      ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 500 })}
      ${props => blockStill(props.theme)}
    }
  }
  @media (min-width: 1300px) {
    width: 45%;
  }
  ${props => blockStill(props.theme)}
`
export const WrapperImage = styled.div`
  max-width: ${props => themeSize(props.theme, 'lg')};
  max-height: ${props => themeSize(props.theme, 'lg')};
  height: ${props => themeSize(props.theme, 'lg')};
  width: ${props => themeSize(props.theme, 'lg')};
  ${({ isSkeleton }) => !isSkeleton && css`
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
    border-radius: ${props => themeRadius(props.theme, 'md')};
    &, &:hover {
      box-shadow: ${props => themeShadow(props.theme, 'md')};
    }
  `}
  ${({ hideContent }) => hideContent && css`
    max-width: ${props => themeMedia(props.theme, '3xs')};
    max-height: ${props => themeMedia(props.theme, '3xs')};
    height: ${props => themeMedia(props.theme, '3xs')};
    width: ${props => themeMedia(props.theme, '3xs')};
  `}
  svg {
    width: 100%;
    height: 100%;
    padding: ${props => themeSpace(props.theme, 'sm')};
    box-sizing: border-box;
    border-radius: ${props => themeRadius(props.theme, 'full')};
    ${props => blockStill(props.theme)}
  }
  /* the logo is not a control: its shadow stays on hover */
  ${props => blockStill(props.theme)}
`
export const UnreadMessageCounter = styled.div`
  position: absolute;
  top: ${props => themeSpace(props.theme, 'md')};
  ${props => props.theme?.rtl
? css`
    left: ${props => themeSpace(props.theme, 'xl')};
  `
: css`
    right: ${props => themeSpace(props.theme, 'xl')};
  `}
  /* a badge has no shadow and does not react to the pointer */
  ${props => blockStill(props.theme)}
  /* a count of components.badge, the variant and size of the
     chat's unread piece (chat_bubble.slots.unread) */
  ${props => badgeCss(props.theme, unreadBadge(props.theme))}
`

const unreadBadge = (theme) => {
  const slot = themeSlot(theme, 'chat_bubble', 'unread')
  return { variant: slot.variant, size: slot.size, count: true, weight: 600 }
}
const ImageStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'md')};
  ${props => blockStill(props.theme)}
`
export const Image = (props) => {
  return (
    <ImageStyled
      {...props}
      style={{ backgroundImage: `url("${props.bgimage}")` }}
    >
      {props.children}
    </ImageStyled>
  )
}

export const DriverSelectorWrapper = styled.div`
  width: 100%;
  box-sizing: border-box;
  margin-top: ${props => themeSpace(props.theme, 'md')};
  > div {
    > div:first-child {
      border: none;
      padding: 0px;
      > div:first-child {
        padding: 0px;
        ${props => blockStill(props.theme)}
      }
      ${props => blockStill(props.theme)}
    }
  }

  @media (min-width: 1300px) {
    width: 55%;
    margin-top: 0px;
    /* components.divider vertical's line, its spacing beside it */
    ${props => dividerLineCss(props.theme, 'vertical', { edge: 'inline-start', padding: true })}
  }
  ${props => blockStill(props.theme)}
`
export const LoadMoreButtonWrap = styled.div`
  display: flex;
  /* the button fills the box */
  flex-direction: column;
  align-items: stretch;
  width: 100%;

  /* md under it, as between the cards */
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
  ${props => blockStill(props.theme)}
`

export const DriverInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: ${props => themeSpace(props.theme, 'md')};

  @media (min-width: 1300px) {
    margin-top: 0px;
  }
  ${props => blockStill(props.theme)}
`

export const OptionContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
   margin-left: ${props => themeSpace(props.theme, 'md')};

  ${props => blockStill(props.theme)}
`
export const DriverNameContainer = styled.div`
  line-height: 1.3;
  color: ${props => themeColor(props.theme, 'text')};

  ${({ small }) => small && css`
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  `}
  ${props => blockStill(props.theme)}
`

// Its text as a title, joining "{name} {lastname}"-style sibling children
const textOf = (children) => Array.isArray(children)
  ? (children.every((c) => typeof c === 'string' || typeof c === 'number') ? children.join('') : undefined)
  : (typeof children === 'string' ? children : undefined)

// The driver's name identifies them: it wraps to 2 lines before it is cut,
// never on one line with "…" (no fixed caps: OptionContent is flex: 1)
export const DriverName = styled.p.attrs(({ children, title }) => ({
  title: title ?? textOf(children)
}))`
  ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 500 })}
  color: ${props => themeColor(props.theme, 'text')};
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin: 0px;

  ${({ small }) => small && css`
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  `}
  ${props => blockStill(props.theme)}
`
export const DriverText = styled.span`
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}

  ${({ small }) => small && css`
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  `}
  ${props => blockStill(props.theme)}
`

export const NotFoundSourceWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  height: 100%;
  /* not a control: no motion (its transform centers it) */
  transition: none;
`
