import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { buttonStill, themeBorderWidth, themeFontFamily, themePart, themeRadius, themeText, headingText, blockStill, themeBadgeCss, themeSpace, themeSize, themeIconSize, themeValue, pageGutter } from '~/utils/themeTokens'
import { ORDER_DETAILS } from '~/utils/orderTheme'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeBreakpoint.mjs'
import { ProgressBar } from '~ui/src/styles/Progress'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'
import { focusRingCss } from '~ui/src/styles/Focus'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'
import { getThemeCss } from '~/utils/themeCss'
import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import { businessLogoCss } from '~ui/src/components/Checkout/checkoutTheme'
import { cardBoxCss } from '~ui/src/styles/Card'

/* The order's page: one card (components.card) per block (the
   header, the map, the summary), tokens.space.xl between them and
   tokens.space.lg inside them (xl from 768px). */
const orderCard = (theme) => themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })
const cardPadding = (theme) => `
  box-sizing: border-box;
  padding: ${themeSpace(theme, 'lg')};
  @media (min-width: 768px) { padding: ${themeSpace(theme, 'xl')}; }
`

/* One piece of the order's page (components.order_details):
   `map` is `{ cssProp: 'base.<prop>' }`. */
const orderPart = (theme, map) => themePart(theme, ORDER_DETAILS, map)

/* The divider of the order's summary, the variant of
   components.divider that components.order_details.divider names (band by
   default). */
const orderDividerVariant = (theme) => themeValue(theme, ORDER_DETAILS, 'base.divider')

/* A control drawn by hand (the rating stars, the info icon of a
   bill row) is a real button: no box of its own, and the focus ring of the
   theme (tokens.focus_ring). */
const bareButtonCss = (theme) => {
  return `
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    &:focus-visible {
      ${focusRingCss(theme)}
    }
  `
}

export const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${props => themeSpace(props.theme, 'xs')} 0 ${props => themeSpace(props.theme, 'xl')};
  /* the order's messages open: the conversation fills the page under the
     header (no margin above or below it) */
  ${({ $flush }) => $flush && 'margin: 0;'}
  ${props => blockStill(props.theme)}
`

/* The order's messages: the conversation of the messages page, alone, in the
   inbox's box (centered, 85% wide); from 1024px it fills the room left under
   the header (its height, measured by the header), as the inbox */
// Header publishes the measured height. Its theme is the fallback until it mounts.
const headerHeight = (theme) => `var(--header-height, ${getThemeCss(theme, 'header').base.height})`

export const OrderMessagesPane = styled.div`
  width: 100%;
  max-width: 85%;
  box-sizing: border-box;

  @media (min-width: 1024px) {
    height: calc(100vh - ${props => headerHeight(props.theme)});
    height: calc(100dvh - ${props => headerHeight(props.theme)});
  }
  /* at every width the conversation fits the visible screen
     under the header (its height, measured by the header) and, below 576px,
     above the bottom navigation (its real height, 0 when the theme hides
     it): the chat takes what is left and the composer stays in sight */
  ${props => css`
    height: calc(100vh - ${headerHeight(props.theme)});
    height: calc(100dvh - ${headerHeight(props.theme)});
    @media (max-width: 575px) {
      height: calc(100vh - ${headerHeight(props.theme)} - ${bottomNavHeight(props.theme)}px);
      height: calc(100dvh - ${headerHeight(props.theme)} - ${bottomNavHeight(props.theme)}px);
    }
  `}
`

/* The content width of a finished order's page. It is a
   receipt read top to bottom (one column of items, their prices at the
   end of the row, the total), not a dashboard: at the account pages' 75%
   (up to ~1080px) its rows would stretch the prices far from their names,
   so it keeps the column it has today on desktop (700px), centered; the
   page's side padding is added to it */
export const COMPLETED_ORDER_WIDTH = 700

export const WrapperContainer = styled.div`
  width: calc(100% - 2 * ${props => themeSpace(props.theme, 'xl')});
  display: flex;
  flex-direction: column;
  min-height: auto;
  position: relative;

  ${({ orderCompleted }) => orderCompleted && css`
    max-width: min(100%, 72ch);
    .order-info {
      margin-bottom: 0px;
    }
  `}

  @media (min-width: 993px) {
    width: 100%;
    padding: ${({ orderCompleted, theme }) => !orderCompleted ? `0px ${themeSpace(theme, 'xxl')} 0px` : '0px 0px 0px'};
    min-height: 60dvh;
    box-sizing: border-box;
    max-width: ${({ orderCompleted }) => orderCompleted ? 'min(100%, 88ch)' : 'min(100%, 188ch)'};
  }
  ${props => blockStill(props.theme)}
  /* the active order: the account pages' box (it is reached
     from the orders list), its cards one space apart; a block with nothing
     to show (no map nor directions) takes no space */
  ${props => !props.orderCompleted && css`
    ${pageContainerRules(props.theme)}
    gap: ${themeSpace(props.theme, 'xl')};
    > :empty {
      display: none;
    }
  `}
  /* a finished order (its receipt): the account pages' box
     and rhythm (top and bottom space, side padding, the title, xl between
     its blocks), its column narrower (COMPLETED_ORDER_WIDTH) and centered */
  ${props => props.orderCompleted && css`
    ${pageContainerRules(props.theme)}
    max-width: ${COMPLETED_ORDER_WIDTH + 2 * pageGutter(props.theme)}px;
    @media (min-width: 769px) {
      width: 100%;
    }
    gap: ${themeSpace(props.theme, 'xl')};
    > :empty {
      display: none;
    }
  `}
`

/* The active order's page title (its number), the theme's h1
   at the start like the account pages' titles, their title gap below it:
   the page's gap between blocks (xl) is that gap, so no margin of its own */
export const OrderPageTitle = styled.h1`
  ${props => pageTitleRules(props.theme)}
  margin-bottom: 0;
`

export const SkeletonWrapper = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
  ${props => blockStill(props.theme)}
`

export const HeaderInfo = styled.div`
  width: 80%;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  h1, p {
    margin: 0;
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }

  h1 {
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
  ${props => blockStill(props.theme)}
`

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 0;
  ${props => blockStill(props.theme)}
`

export const OrderBusiness = styled.div`
  display: flex;
  box-sizing: border-box;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  @media (min-width: 769px) {
    flex-direction: row;
  }
  /* components.card */
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  ${props => blockStill(props.theme)}
`

export const BusinessInfo = styled.div`
  width: 100%;
  box-sizing: border-box;
  margin-right: 0;
  margin-top: ${props => themeSpace(props.theme, 'md')};

  h1,
  p {
    margin: 0;
    color: ${props => themeColor(props.theme, 'text')};
    overflow-wrap: anywhere;
    ${props => blockStill(props.theme)}
  }

  h2 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0px 0px ${props => themeSpace(props.theme, 'xs')} 0px;
    ${props => blockStill(props.theme)}
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
  }

  ${props => blockStill(props.theme)}
`

// Match Button's touch area without changing the theme's painted size.
export const OrderActionCell = styled.div`
  display: contents;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    display: grid;
    align-items: center;
    justify-items: ${props => props.$stretch ? 'stretch' : 'center'};
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`

export const ActionsBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: 5vw;

  ${props => props.actionType === 'business' && css`
    margin-left: 0;
    width: 100%;
  `}

  ${props => blockStill(props.theme)}
  /* the icon buttons a small space apart, none with margins of
     its own; the driver's at the end of its row. They are IconButtons of
     the theme: their states keep the button's motion (no still of the
     row on them) */
  ${props => css`
    flex-wrap: wrap;
    gap: ${themeSpace(props.theme, 'sm')};
    margin-left: 0;
    margin-inline-start: ${props.actionType === 'business' ? '0' : 'auto'};
    && > * {
      margin: 0;
    }
  `}
`

export const OrderInfo = styled.div`
  margin: 0px;
  position: relative;

  h1, p {
    margin: 0px;
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }
  h1 {
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    ${props => headingText(props.theme, 'h1')}
  }
  /* dates, the order type and its status text: short, fixed-vocabulary
     meta, not identifying content — one line is correct here. Its own
     OrderClonnedMessage overrides this for its full explanatory sentence. */
  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    text-overflow: ellipsis;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  .order-progress {
    margin: 0px 0 0px;
    padding: ${props => themeSpace(props.theme, 'sm')} 0 0px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;

    span {
      ${props => blockStill(props.theme)}
    }

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
    }
    ${props => blockStill(props.theme)}
  }
  .date {
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
    ${props => blockStill(props.theme)}
  }

  .types {
    margin-bottom: ${props => themeSpace(props.theme, 'sm')};
    ${props => blockStill(props.theme)}
  }

  .order-status {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
  }

  #error-subs {
    margin: ${props => themeSpace(props.theme, 'xl')} 0 0;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }

  @media (min-width: 768px) {
    #error-subs {
      margin: ${props => themeSpace(props.theme, 'xl')} 0;
    }
  }
  ${props => blockStill(props.theme)}
  /* the order's header is a card (components.card), the help
     action beside the status */
  ${props => orderCard(props.theme)}
  ${props => css`
    ${cardPadding(props.theme)}
    margin-bottom: 0;
    /* its rows (status, date, bar, time, actions) md apart, none with
       margins of its own */
    display: flex;
    flex-direction: column;
    gap: ${themeSpace(props.theme, 'md')};
    && > * {
      margin-top: 0;
      margin-bottom: 0;
    }
    .order-progress {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding-top: 0;
      gap: ${themeSpace(props.theme, 'sm')};
    }
    /* components.order_details: the status (status_text, status_color) and
       the lines of its date and type (info_text) */
    .order-progress,
    .order-progress span {
      ${orderPart(props.theme, { text: 'base.status_text', color: 'base.status_color' })}
    }
    .date,
    .types {
      ${orderPart(props.theme, { text: 'base.info_text' })}
    }
  `}
`

export const ValidationText = styled.div`
  color: ${props => themeColor(props.theme, 'danger_text')};
  ${props => props.onlyText
? css`
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
  `
: css`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: ${props => themeSpace(props.theme, 'sm')};
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'danger')};
    background-color: ${props => themeColor(props.theme, 'danger_subtle')};

    ${props => props.mb && css`
      margin-bottom: ${props.mb};
    `}

    ${props => props.color && css`
      svg {
        font-size: ${props => themeIconSize(props.theme, 'md')};
      }
    `}

    svg {
      width: 5%;
    }

    span {
      margin: 0 0 0 ${props => themeSpace(props.theme, 'xs')};
      padding: 0;
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      color: ${props => themeColor(props.theme, 'text')};
    }
  `}
  ${props => blockStill(props.theme)}
`

// The order's bar (components.progress)
export const StatusProgress = styled(ProgressBar)`
  margin: ${props => themeSpace(props.theme, 'lg')} 0px ${props => themeSpace(props.theme, 'sm')};
`

export const SectionTitle = styled.h1`
  margin: ${props => themeSpace(props.theme, 'xl')} 0 0 0;
  ${props => headingText(props.theme, 'h1')}
  ${props => blockStill(props.theme)}
`

export const SectionTitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  h2 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0px 0px ${props => themeSpace(props.theme, 'xs')} 0px;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const OrderCustomer = styled(BusinessInfo)`
  display: flex;
  flex-direction: column;
  padding: ${props => themeSpace(props.theme, 'lg')} 0 ${props => themeSpace(props.theme, 'lg')};
  ${props => blockStill(props.theme)}
`

/* The map fills its card, which clips it to its corners; its height is
   components.order_details.map_height */
export const Map = styled.div`
  width: 100%;
  margin-bottom: 0;
  > div {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: 0;
    ${props => blockStill(props.theme)}
  }

  #google-maps-image {
    display: block;
    object-fit: cover;
    border-radius: 0;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
  ${props => orderPart(props.theme, { height: 'base.map_height' })}
`

export const OrderDriver = styled(OrderCustomer)`
  margin-top: 0px;

  ${({ orderCompleted }) => orderCompleted && css`
    padding-top: 0px;
  `}
  ${props => blockStill(props.theme)}
  /* spaced by the page (a finished order) or the summary's
     card (the active one) */
  padding: 0;
`

export const WrapperDriver = styled.div`
  display: flex;
  width: 100%;
  align-items: center;

  .driver-info {
    p {
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
      ${props => blockStill(props.theme)}
    }
  }

  .driver-name-wrapper {
    display: flex;
    h2 {
      @media (min-width: 400px) {
        margin-bottom: 0;
        margin-right: ${props => themeSpace(props.theme, 'xl')};
      }
    }
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const OrderProducts = styled(OrderCustomer)`
  flex-direction: column;

  ${({ orderCompleted }) => orderCompleted && css`
    border-width: 0px;

    .product-name {
      h3 {
        ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
        -webkit-line-clamp: none;
      }
    }
    .accordion-product-options {
      width: auto;
      margin: 0px;
    }
  `}
  ${props => blockStill(props.theme)}
  /* the active order: the summary is a card (components.card),
     the page spaces its cards (a finished order's receipt is left as it is:
     its rating prompt is a card of its own) */
  ${props => !props.orderCompleted && orderCard(props.theme)}
  ${props => !props.orderCompleted && css`
    ${cardPadding(props.theme)}
    margin-top: 0;
  `}
  /* the active order: the sections of its card (the total, the
     bands, the driver, the products, the bill, the address, the rewards)
     tokens.space.lg apart, their own margins none */
  ${props => !props.orderCompleted && css`
    gap: ${themeSpace(props.theme, 'lg')};
    && > * {
      margin-top: 0;
      margin-bottom: 0;
    }
  `}
  /* a finished order: its sections (products, bill, rating
     and reorder, rewards, address, driver) on the page's left edge, xl
     apart like the page's blocks (their own margins none); one with
     nothing to show takes no space */
  ${props => props.orderCompleted && css`
    margin-top: 0;
    padding: 0;
    gap: ${themeSpace(props.theme, 'xl')};
    /* its product rows as the active order's and the checkout's: the
       quantity in the name's text, no indents of their own */
    .quantity-item {
      ${themeText(props.theme, 'body_lg')}
    }
    .product-name {
      padding-left: 0;
    }
    .accordion-product-options {
      padding-left: 0;
    }
    && > * {
      margin-top: 0;
      margin-bottom: 0;
    }
    > :empty {
      display: none;
    }
  `}
`

/* An order's products as one section of the summary (the
   active order's card, a finished order's receipt): the rows keep their own
   spacing (tokens.space.md) between them, none above the first or below the
   last, which the summary spaces */
export const CompletedProductsList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  && > :first-child {
    padding-top: 0;
  }
  && > :last-child {
    padding-bottom: 0;
  }
`

export const OrderButtons = styled(OrderCustomer)`
  h4 {
    ${props => headingText(props.theme, 'h4')}
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
    ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
    padding-top: ${props => themeSpace(props.theme, 'lg')};
    ${props => blockStill(props.theme)}
  }
  .review-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    ${props => blockStill(props.theme)}
    /* the "rate your order" prompt is a card (components.card)
       spaced with tokens.space */
    ${props => themePart(props.theme, 'card', {
      background: 'base.background',
      border: 'base.border',
      'box-shadow': 'base.shadow',
      'border-radius': 'base.radius'
    })}
    padding: ${props => themeSpace(props.theme, 'lg')};
    gap: ${props => themeSpace(props.theme, 'lg')};
  }
  .buttons-container {
    display: flex;
    flex-direction: column;
    ${props => blockStill(props.theme)}
    gap: ${props => themeSpace(props.theme, 'sm')};

  }
  .one-button {
    flex-direction: row;
    justify-content: center;
  }
  ${props => blockStill(props.theme)}
  /* a section of the receipt, its title an h2 of the page's
     outline md over the rating card; "Order again" alone at the start */
  ${props => css`
    padding: 0;
    > h2 {
      margin: 0 0 ${themeSpace(props.theme, 'md')};
      padding: 0;
      border: none;
      /* a section title (components.section_header: text and color) */
      ${sectionTitleTextCss(props.theme, { level: 'h2' })}
    }
    .one-button {
      justify-content: flex-start;
    }
  `}
`

export const OrderBill = styled.div`
  display: flex;
  flex-direction: column;

  table {
    width: 100%;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    font-family: ${props => themeFontFamily(props.theme, 'body')};

    td {
      ${props => blockStill(props.theme)}
    }

    td span {
      unicode-bidi: bidi-override;
      ${props => blockStill(props.theme)}
    }
    tr td:nth-child(2) {
      text-align: right;
      ${props => props.theme?.rtl && css`
        text-align: left;
      `}
    }

    .subtotal {
      td {
        font-weight: 500;
      }
    }

    .icon {
      display: flex;
      align-items: center;
      overflow: visible;
    }
    ${props => blockStill(props.theme)}
  }

  table.total {
    ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}

    tr {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      td:nth-child(1) {
        ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 600 })}
        ${props => blockStill(props.theme)}
      }
      td:nth-child(2) {
        ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 600 })}
        ${props => blockStill(props.theme)}
      }
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  table.comments {
    margin-top: ${props => themeSpace(props.theme, 'xl')};
    align-items: center;
    tr {
      td:nth-child(1) {
        font-weight: bold;
        ${props => blockStill(props.theme)}
      }
    }
    ${props => blockStill(props.theme)}
  }

  .driver {
    padding: ${props => themeSpace(props.theme, 'sm')} 0;
    ${props => blockStill(props.theme)}
  }

  /* (the rows are body text at every width, large from here) */
  @media (min-width: 678px) {
    table {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'family'] })}
    }
  }
  ${props => blockStill(props.theme)}
  /* the rows tokens.space.sm apart, on the section's edges (no
     spacing of the browser's table); the total tokens.space.md under its
     line, which is sm under the rows, and the payments right under it */
  ${props => css`
    table {
      border-collapse: collapse;
    }
    table td {
      padding-top: 0;
      padding-bottom: ${themeSpace(props.theme, 'sm')};
    }
    table.total {
      margin-top: ${themeSpace(props.theme, 'sm')};
      padding-top: ${themeSpace(props.theme, 'md')};
      tr td:nth-child(1),
      tr td:nth-child(2) {
        padding-top: 0;
      }
    }
  `}
  /* no box of its own: a section of the active order's summary card or of
     a finished order's receipt, spaced by them */
  margin: 0;
  padding: 0;
`

export const SkeletonBlock = styled.div`
  width: ${({ width }) => width && `${width}%`};
  border-radius: ${props => themeRadius(props.theme, 'lg')};
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};
  display: flex;
  flex-direction: column;
  align-items: center;
  ${props => blockStill(props.theme)}
`

export const SkeletonBlockWrapp = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  line-height: 2.5; /* the status row's height in the text's own line (40px with a 16px text) */
  ${props => blockStill(props.theme)}
`

export const ExclamationWrapper = styled.div`
  position: absolute;
  transform: translate(75%, -25%);
  svg{
    font-size: ${props => themeIconSize(props.theme, 'sm')};
    color: ${props => primaryText(props.theme)};
    ${props => blockStill(props.theme)}
  }
  transition: none;
`

export const WrapperLeftContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 0px 0px 0px;

  .map-container {
    display: flex;
    justify-content: center;
    ${props => blockStill(props.theme)}
    /* the map is a card (components.card) clipped to its corners */
    ${props => orderCard(props.theme)}
    overflow: hidden; isolation: isolate;
  }
  ${props => blockStill(props.theme)}
`

export const WrapperRightContainer = styled(WrapperLeftContainer)`
  ${({ orderCompleted }) => orderCompleted && css`
    .order-progress {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 800 })}
    }
  `}
  ${props => blockStill(props.theme)}
`

export const Divider = styled.div`
  background: ${props => themeColor(props.theme, 'surface_alt')};
  ${({ margin }) => margin && css`
    margin: ${margin};
  `}
  ${props => blockStill(props.theme)}
  /* components.divider, the variant components.order_details
     names (band by default; its spacing, not the margin prop) */
  ${props => dividerRules(props.theme, orderDividerVariant(props.theme))}
`

export const MyOrderActions = styled.div`
  ${props => blockStill(props.theme)}
`

export const ReviewWrapper = styled.div`
  ${props => blockStill(props.theme)}
`

export const Exclamation = (props) => <Button {...props} inlineInfo />

export const CommentContainer = styled.div`
  margin: ${props => themeSpace(props.theme, 'xl')} 0;

  h4 {
    ${props => headingText(props.theme, 'h4')}
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }
  span {
    font-family: ${props => themeFontFamily(props.theme, 'body')};
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

/**
 * The status of a finished order (only its screen draws it): a
 * badge of components.badge, success when it was delivered and danger when
 * it was rejected or canceled (`.rejected`), and the icon beside it in that
 * color at the theme's icon size.
 */
/**
 * The header card of a finished order: the business (logo,
 * name, date, status) and the status icon on one row at every width, md
 * apart, the card's padding around them (no padding of their own). The
 * logo's box is order_details' (businessLogoCss).
 */
const terminalHeaderCss = (theme) => {
  const md = themeSpace(theme, 'md')
  return `
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${md};
    .business-info {
      padding: 0;
      flex: 1 1 auto;
      min-width: 0;
      gap: ${md};
    }
    .business-logo {
      flex-shrink: 0;
    }
    .business-logo img {
      display: block;
    }
    .title-container {
      min-width: 0;
    }
    .completed-icon {
      margin-bottom: 0;
      flex-shrink: 0;
    }
  `
}

const terminalStatusCss = (theme) => {
  const xxs = themeSpace(theme, 'xxs')
  const xs = themeSpace(theme, 'xs')
  const sm = themeSpace(theme, 'sm')
  const icon = themeIconSize(theme, 'lg')
  return `
    .order-status,
    .order-status.completed {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
      white-space: nowrap;
      padding: ${xxs} ${sm};
      margin-top: ${xs};
      ${themeBadgeCss(theme, 'success')}
    }
    .order-status.rejected {
      ${themeBadgeCss(theme, 'danger')}
    }
    .order-status:empty {
      display: none;
    }
    .completed-icon svg {
      font-size: ${icon};
      color: ${themeColor(theme, 'success')};
    }
    .completed-icon.rejected svg {
      color: ${themeColor(theme, 'danger')};
    }
  `
}

export const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: auto;

  > h1 {
    text-align: center;
    ${props => blockStill(props.theme)}
  }

  .delivery-container {
    width: 100%;
    display: flex;
    flex-direction: column;

    .date {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 400 })}
      ${props => blockStill(props.theme)}
    }

    .types {
      ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
      margin-bottom: ${props => themeSpace(props.theme, 'lg')};
      ${props => blockStill(props.theme)}
    }

    ${({ orderCompleted }) => orderCompleted && css`
      align-items: center;
      .business-logo {
        img {
          ${props => blockStill(props.theme)}
        }
      }
      .business-info {
        display: flex;
        align-items: flex-start;
        padding: ${props => themeSpace(props.theme, 'lg')} 0px;
        gap: ${props => themeSpace(props.theme, 'md')};
        ${props => blockStill(props.theme)}
        /* the logo's box (order_details.business_logo_size / _radius) */
        ${props => businessLogoCss(props.theme, ORDER_DETAILS)}
      }

      .types {
        ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 700 })}
        margin-bottom: 0px;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .completed-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: ${props => themeSpace(props.theme, 'xl')};
        svg {
          font-size: ${props => themeSize(props.theme, 'lg')};
          color: ${props => primaryText(props.theme)};
          ${props => blockStill(props.theme)}
        }
        ${props => blockStill(props.theme)}
      }
      .date {
        ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
        margin-bottom: 0px;
      }
      .order-status {
        ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
      }
      .order-status.completed {
        color: ${props => primaryText(props.theme)};
      }
      ${props => terminalStatusCss(props.theme)}
      ${props => terminalHeaderCss(props.theme)}
    `}

    @media (min-width: 576px) {
      flex-direction: row;
      justify-content: space-between;
    }
    ${props => blockStill(props.theme)}
  }

  .time-container {
    margin-top: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    ${props => themeText(props.theme, 'display', { props: ['size', 'weight', 'family'], weight: 800 })}
    color: ${(props) => primaryText(props.theme)};

    ${props => blockStill(props.theme)}
  }

  @media (min-width: 650px) {
    width: 100%;
  }
  ${props => blockStill(props.theme)}
`

export const BusinessTitle = styled.div`
  display: flex;
  justify-content: space-between;
  ${props => blockStill(props.theme)}
`

export const OrderPreferences = styled(OrderCustomer)`
  border-width: 0px;
  padding: 0px;

  .order-type-address {
    ${props => blockStill(props.theme)}
  }

  .order-type {
    display: flex;
    align-items: center;
    min-height: ${props => themeIconSize(props.theme, 'lg')};
    max-width: min(100%, 56ch);

    p {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
      font-family: ${props => themeFontFamily(props.theme, 'body')};
      margin: 0;
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  ${props => blockStill(props.theme)}
  /* spaced by the summary (the card's or the page's gap); the
     address tokens.space.xs under its title */
  ${props => css`
    margin: 0;
    .order-type {
      margin-top: ${themeSpace(props.theme, 'xs')};
    }
    /* the title of an address: components.order_details.address_title */
    .order-type-address {
      ${orderPart(props.theme, { text: 'base.address_title' })}
    }
  `}
`

export const HeaderTitle = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 0px;

  /* the total and its amount: emphasized text, not headings */
  p.total {
    margin-top: 0;
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 481px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
  /* spaced by the summary's card; the total and its amount in
     components.order_details.total_text at every width */
  p.total { margin-bottom: 0; }
  ${props => `p.total { ${orderPart(props.theme, { text: 'base.total_text' })} }`}
  ${props => blockStill(props.theme)}
`

export const OrderHistoryContainer = styled.div`
  ${props => blockStill(props.theme)}
`

export const HistoryItemWrapper = styled.div`
  display: flex;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'xl')};
  ${props => dividerLineCss(props.theme, 'item')}

  /* a row of the history, not a control: no hover shadow */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: none;
    }
  }

  > svg {
    width: ${props => themeIconSize(props.theme, 'lg')};
    height: ${props => themeIconSize(props.theme, 'lg')};
    color: ${props => primaryText(props.theme)};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const DetailWrapper = styled.div`
  margin-left: ${props => themeSpace(props.theme, 'xxxl')};
  ${props => props.theme.rtl && css`
    margin-left: 0px;
    margin-right: ${props => themeSpace(props.theme, 'xxxl')};
  `}

  /* a history entry: text, not a heading */
  .history-title {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 600 })}
    margin: 0px;
    ${props => blockStill(props.theme)}
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin: 0px;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ButtonWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  ${props => blockStill(props.theme)}
`

export const MapWrapper = styled.div`
  width: 100%;
  margin-top: 0px;
  ${props => blockStill(props.theme)}
`

export const DirectionButtonWrapper = styled.div`
  ${props => blockStill(props.theme)}
  /* a space under the map, the button as wide as its label */
  margin-top: ${props => themeSpace(props.theme, 'lg')};
`

export const ProfessionalWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 0px ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')};

  /* the photo is the Avatar (components.avatar lg) */
  > p {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'], weight: 600 })}
    margin-left: ${props => themeSpace(props.theme, 'lg')};

    ${props => props.theme.rtl && css`
      margin-left: 0px;
      margin-right: ${props => themeSpace(props.theme, 'lg')};
    `}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ProfessionalBlock = styled.div`
  ${props => dividerLineCss(props.theme, 'item')}
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  ${props => blockStill(props.theme)}
`

export const OrderClonnedMessage = styled.div`
  display: flex;
  justify-content: center;
  /* a full explanation, not a one-line status: && overrides OrderInfo's
     p (clamp: 1), which otherwise cuts this sentence after its first line */
  && p {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
    display: block;
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
  }
  ${props => blockStill(props.theme)}
`

export const PaymentWrapper = styled.div`
  /* on the bill's edge (its table has no cell spacing) */
  margin-left: 0;

  span.title {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 800 })}
    ${props => blockStill(props.theme)}
  }

  .payments-list {
    width: 100%;
    span {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'family'] })}
      ${props => blockStill(props.theme)}
    }

    .payment-item {
      font-weight: 500;
      margin-bottom: ${props => themeSpace(props.theme, 'xl')};

      .paymethod {
        display: flex;
        flex-direction: column;
        ${props => blockStill(props.theme)}
      }

      .paymethod-row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        ${props => blockStill(props.theme)}
      }
      ${props => blockStill(props.theme)}
    }

    .payment-item:last-child {
      margin-bottom: 0px;
    }
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

// The stars open the review, so they are one button (its label
// set in the JSX)
export const ReviewsProgressContent = styled.div.attrs({ as: 'button', type: 'button' })`
  display: flex;
  flex-direction: row;
  justify-content: center;

  svg {
    cursor: pointer;
    ${props => buttonStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
  /* the stars of the rating prompt
, in the rating color
     (tokens.color.rating) at the theme's icon size, apart by tokens.space */
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'xs')};
    svg, svg:first-child {
      padding: 0;
      color: ${themeColor(theme, 'rating')};
      font-size: ${themeIconSize(theme, 'lg')};
    }
  `}
  ${props => bareButtonCss(props.theme)}
`

export const DeliveryPinContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  @media (min-width: 768px) {
    width: fit-content;
  }
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'xs')};
    ${cardBoxCss(theme, 'card', { padding: true })}
  `}
`

export const DeliveryPinLabel = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

export const DeliveryPinValue = styled.span`
  direction: ltr;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'display')}
`

export const DeliveryPinHelp = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}
`
