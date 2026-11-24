import styled, { css } from 'styled-components'
import { primaryText, themeColor } from '~/utils/themeColors'
import { headingText, themeIconSize, themeMedia, themePart, themeRadius, themeShadow, themeSpace, themeText } from '~/utils/themeTokens'
import { ProgressBar } from '~ui/src/styles/Progress'
import { dividerRules } from '~ui/src/styles/Divider'
import { pageContainerRules } from '~ui/src/styles/Page'
import { srOnlyCss } from '~ui/src/styles/Rules'

/* The page of a group's orders: like the order's page, one card
   (components.card) per block (the customer, the summary, each order), xl
   between them and lg inside them (xl from 768px). */
const blockCard = (theme) => {
  const lg = themeSpace(theme, 'lg')
  const xl = themeSpace(theme, 'xl')
  return `
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    box-sizing: border-box;
    margin: 0;
    padding: ${lg};
    @media (min-width: 768px) { padding: ${xl}; }
  `
}

// `prop: <space>;` of the theme (tokens.space)
const spaceRule = (theme, prop, level) => `${prop}: ${themeSpace(theme, level)};`

export const Container = styled.div`
  /* the page fills most of the screen, so the footer is not pushed up under short content */
  min-height: 70dvh;

  h3 {
    margin: 0;
    ${props => headingText(props.theme, 'h3')}
  }

  h4 {
    margin: 0;
    ${props => headingText(props.theme, 'h4')}
  }

  /* a block's title is a section of the page (h2) with the
     theme's h4 (the size of today's h4); an order's number the theme's h3 */
  .section-title {
    margin: 0;
    ${props => headingText(props.theme, 'h4')}
  }
  .order-title {
    margin: 0;
    ${props => headingText(props.theme, 'h3')}
  }

  /* the account pages' box (its width, sides and padding), its blocks xl apart */
  ${props => css`
    ${pageContainerRules(props.theme)}
    display: flex;
    flex-direction: column;
    ${spaceRule(props.theme, 'gap', 'xl')}
  `}
`
export const HeaderContainer = styled.div`
  h1 {
    ${props => headingText(props.theme, 'h1')}
    margin: 0;
    span.name {
      font-weight: 700;
      margin: 0 ${props => themeSpace(props.theme, 'md')};
    }
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    /* sm under the greeting */
    margin: ${props => themeSpace(props.theme, 'sm')} 0 0;
  }
`
export const CustomerInfoContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;

  @media (min-width: 576px) {
    flex-direction: row;
  }
  ${props => blockCard(props.theme)}
`
export const CustomerDetails = styled.div`
  flex: 1;
  > div {
    display: flex;
    flex-direction: column;
    ${props => spaceRule(props.theme, 'margin-top', 'lg')}
  }

  @media (min-width: 576px) {
    > div {
      flex-direction: row;
    }
  }
`
export const PaymentDetails = styled.div`
  flex: 1;
  .section-title {
    ${props => spaceRule(props.theme, 'margin-top', 'xl')}
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: ${props => themeSpace(props.theme, 'sm')} 0;
  }

  @media (min-width: 576px) {
    .section-title:not(.address) {
      margin-top: 0;
    }
  }
`
export const PhotoWrapper = styled.div`
  width: ${({ theme }) => themeMedia(theme, '3xs')};
  aspect-ratio: 1;
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    /* the customer's photo (cover, as before); $isLogo (SingleOrderCard's
       business logo) is never cropped instead (contain) */
    object-fit: cover;
    ${({ $isLogo }) => $isLogo && css`
      object-fit: contain;
    `}
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  }
  svg {
    width: 80%;
    height: 80%;
  }
  /* lg from the data */
  margin-inline-end: ${props => themeSpace(props.theme, 'lg')};
`
export const CustomerData = styled.div`
  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: ${props => themeSpace(props.theme, 'xxs')} 0;
  }
`
export const OrderSummary = styled.div`
  table {
    width: 100%;
    tr {
      td {
        ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
        padding: ${props => themeSpace(props.theme, 'xs')} 0;
        &:last-child {
          ${props => props.theme?.rtl
? css`
            text-align: left;
          `
: css`
            text-align: right;
          `}
        }
      }
    }
  }
  ${props => blockCard(props.theme)}
`
export const Divider = styled.div`
  /* components.divider section */
  ${props => dividerRules(props.theme, 'section')}
`
export const SingleOrderContainer = styled.div`
  p.order-status {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: 0;
  }
  p.order-total {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 600 })}
    margin: 0;
    ${props => props.theme?.rtl
? css`
      text-align: left;
    `
: css`
      text-align: right;
    `}
    ${props => spaceRule(props.theme, 'margin-top', 'xl')}
  }
  ${props => blockCard(props.theme)}
`
export const SingleOrderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;

  > div {
    > div {
      display: flex;
      flex-direction: column;
      align-items: center;
      @media (min-width: 769px) {
        flex-direction: row;
      }
      p {
        ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
        margin: ${props => themeSpace(props.theme, 'xxs')} 0;
        /* the type and its date xs apart */
        &.date {
          margin: 0 ${props => themeSpace(props.theme, 'xs')};
        }
      }
    }
  }

  @media (min-width: 576px) {
    flex-direction: row;
  }
  /* the action md under the title when they stack */
  ${props => spaceRule(props.theme, 'gap', 'md')}
`
export const OrderBusinessDetails = styled.div`
  display: flex;
  justify-content: space-between;
  /* xl from the header and the total */
  margin: ${props => themeSpace(props.theme, 'xl')} 0;
`
export const OrderBusinessWrapper = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: 576px) {
    flex-direction: row;
  }
`
export const BusinessData = styled.div`
  ${props => spaceRule(props.theme, 'margin-top', 'sm')}
  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: ${props => themeSpace(props.theme, 'xxs')} 0;
    &.bold {
      font-weight: 500;
    }
  }
  @media (min-width: 576px) {
    margin-top: 0px;
  }
`
export const ActionsBlock = styled.div`
  display: flex;
  /* icon buttons of the theme (they paint their own icon), sm apart */
  align-items: flex-start;
  ${props => spaceRule(props.theme, 'gap', 'sm')}
  span {
    cursor: pointer;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_disabled')};
    ${props => props.theme?.rtl
? css`
      margin-right: ${themeSpace(props.theme, 'md')};
    `
: css`
      margin-left: ${themeSpace(props.theme, 'md')};
    `}
  }
`
// An order's bar (components.progress)
export const StatusProgress = styled(ProgressBar)`
  ${props => spaceRule(props.theme, 'margin-bottom', 'md')}
`
/* The unread mark rides on the messages' icon button */
export const IconButtonBadge = styled.span`
  position: relative;
  display: inline-flex;
`
export const ExclamationWrapper = styled.div`
  position: absolute;
  svg{
    color: ${props => primaryText(props.theme)}
  }
  /* on the top end corner of the messages' icon button, the theme's sm icon */
  ${props => css`
    top: 0;
    inset-inline-end: 0;
    display: flex;
    transform: translate(${props.theme?.rtl ? '-25%' : '25%'}, -25%);
    pointer-events: none;
    svg {
      font-size: ${themeIconSize(props.theme, 'sm')};
    }
  `}
`

export const StatusBarContainer = styled.div`
  ${props => spaceRule(props.theme, 'margin-top', 'md')}
  p {
    font-weight: 500;
    margin-top: 0;
  }
`

/* The page's title for assistive tech alone (when the theme hides the
   greeting that carries it) */
export const HiddenTitle = styled.h1`
  ${srOnlyCss}
`
