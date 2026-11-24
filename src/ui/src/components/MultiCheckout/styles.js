import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeRadius, themeSpace, themeText, headingText, themePart, blockStill } from '~/utils/themeTokens'
import { themeTextKeepWeight } from '~/utils/productCartTheme'
import { getThemeCss } from '~/utils/themeCss'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { SectionHeader } from '~ui/src/styles/DetailsSection'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import {
  CHECKOUT_COLUMNS_MIN,
  checkoutColumnCss,
  checkoutInlinePadding,
  checkoutGap,
  checkoutSectionTitleCss,
  checkoutTotalsPadding,
  driverTipsSubtitleCss
} from '~ui/src/components/Checkout/checkoutTheme'

// components.checkout, its multi variant
const MULTI = { multi: true }

// `props` set to the space between the sections (checkout.section_gap)
const gapCss = (theme, ...props) => {
  const gap = checkoutGap(theme, MULTI)
  return props.map((prop) => `${prop}: ${gap};`).join(' ')
}

export const Container = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  min-height: auto;

  @media (min-width: 769px) {
    flex-direction: row;
  }

  @media (min-width: 993px) {
    min-height: calc(100dvh - 5 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
    box-sizing: border-box;
  }
`
export const WrapperLeftContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => themeSpace(props.theme, 'xxl')} ${props => themeSpace(props.theme, 'lg')};
  /* its share of the width and its padding on wide screens (components.checkout) */
  ${props => checkoutColumnCss(props.theme, 'main', MULTI)}
`
export const WrapperLeftContent = styled.div`
  width: 100%;

  .checkout-title {
    margin: 0;
    /* the page title (section_header, page variant); its space
       is the page's */
    ${props => sectionTitleCss(props.theme, { level: 'h1', spaced: false })}
  }

  /* the title of a detail section (Customer Details, Delivery
     Address) is checkout.section_title (multi), as the other sections' */
  ${SectionHeader} h2, ${SectionHeader} h4 {
    ${props => checkoutSectionTitleCss(props.theme, MULTI)}
  }
`

// The back action (an icon button of the theme sits in it); under it the
// space the store page leaves between its back button and its title (md)
export const BackAction = styled.div`
  display: flex;
  margin: 0 0 ${props => themeSpace(props.theme, 'md')};
`

export const CouponContainer = styled.div`
  width: 100%;

  input {
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  }
`

export const WrapperRightContainer = styled.div`
  width: 100%;
  background: ${props => themeColor(props.theme, 'surface_alt')};
  box-sizing: border-box;
  --checkout-tip-inset: ${props => themeSpace(props.theme, 'lg')};
  padding: ${props => themeSpace(props.theme, 'xxl')} var(--checkout-tip-inset);
  ${props => checkoutColumnCss(props.theme, 'side', MULTI)}

  @media (min-width: ${CHECKOUT_COLUMNS_MIN}px) {
    --checkout-tip-inset: ${props => checkoutInlinePadding(props.theme, MULTI)};
  }
`
export const PaymentMethodContainer = styled.div`
  display: flex;
  flex-direction: column;
  /* the sections' titles are h2 under the page's h1 (no skipped level), with the look they had as h3 */
  h2, h3 {
    margin: 0px;
    ${props => headingText(props.theme, 'h3')}
    /* checkout.section_title (multi), its color too */
    ${props => checkoutSectionTitleCss(props.theme, MULTI)}
  }
  /* section_gap apart from the sections around it */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

export const DriverTipContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  h2, h3 {
    margin: 0px;
    ${props => headingText(props.theme, 'h3')}
    /* checkout.section_title (multi) and its color, the driver tips' too */
    ${props => checkoutSectionTitleCss(props.theme, MULTI)}
  }
  > p {
    margin: 0;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    /* driver_tips.subtitle (multi) */
    ${props => props.$driverTips && driverTipsSubtitleCss(props.theme, MULTI)}
  }
  /* section_gap apart from the sections around it */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

export const CartContainer = styled(PaymentMethodContainer)`
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  /* the first block of its column (the column has the padding) */
  margin-top: 0;
`
export const CartHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;

  h2, h3 {
    ${props => headingText(props.theme, 'h3')}
    ${props => checkoutSectionTitleCss(props.theme, MULTI)}
  }

  h2, h3 {
    margin: ${props => themeSpace(props.theme, 'xs')} 0px;
  }

  @media (min-width: 300px) {
    flex-direction: row;
    align-items: center;
  }
`
export const DriverTipDivider = styled.div`
  /* The band reaches both edges of its padded checkout column. */
  width: calc(100% + 2 * var(--checkout-tip-inset));
  margin-inline-start: calc(-1 * var(--checkout-tip-inset));
  /* components.divider band; it keeps its bleed */
  ${props => dividerRules(props.theme, 'band', { inline: false })}
`
export const MultiCartPriceContainer = styled.div`
  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* the total line: text, not a heading */
    > span {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'family'], weight: 600 })}
      margin: 0;
    }
  }
  > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin: 0;
  }
  /* the totals are a card (components.card) as the checkout's,
     with checkout.totals_padding (multi) and section_gap above; its rows
     tokens.space.sm apart, the total line under a divider (item) in the
     cart's total_text, as the checkout's bill */
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${themeSpace(theme, 'sm')};
    margin-top: ${checkoutGap(theme, MULTI)};
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    padding: ${checkoutTotalsPadding(theme, MULTI)};
    ${blockStill(theme)}
    > div, > span {
      margin: 0;
      gap: ${themeSpace(theme, 'sm')};
    }
    > div {
      ${dividerLineCss(theme, 'item', { edge: 'top' })}
      padding-top: ${themeSpace(theme, 'sm')};
      > span {
        ${themeTextKeepWeight(theme, 'cart', 'total_text')}
      }
    }
    /* the total line first (no fee, tip or wallet rows above it): no
       divider over it, the card's padding is its room */
    > div:first-child {
      border-top: none;
      padding-top: 0;
    }
  `}
`
export const WrapperUserDetails = styled.div`
  width: 100%;
`

export const UserDetailsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  /* section_gap apart from the sections around it, no line of
     its own (SectionDivider stands between the sections, whatever their order) */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

/* The divider between two sections of the details column
   (components.divider section), section_gap above and below */
export const SectionDivider = styled.div`
  ${props => dividerRules(props.theme, 'section')}
  ${props => `&&& { ${gapCss(props.theme, 'margin-top', 'margin-bottom')} }`}
`
export const WrapperPlaceOrderButton = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`
/* a warning alert of the theme (why a cart cannot be placed as
   it is), a status */
export const WarningText = styled.p.attrs(alertAttrs('warning'))`
  margin: ${props => themeSpace(props.theme, 'md')} auto;
  /* its box, colors and text (components.alert) */
  ${props => alertRules(props.theme, 'warning')}
`

export const AuthButtonList = styled.div`
  display: flex;
  flex-direction: column;
  h2, h3 {
    ${props => headingText(props.theme, 'h3')}
    margin-top: 1em;
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    ${props => checkoutSectionTitleCss(props.theme, MULTI)}
  }
`

// one action of the list: its full width and the space over it live here, the button is a piece
export const AuthButtonSlot = styled.div`
  display: flex;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`

/* an alert of the theme (components.alert): `$variant` info
   (the payment is being processed), danger (it failed) or warning */
export const WarningMessage = styled.div.attrs(({ theme, $variant = 'warning' }) => alertAttrs($variant)({ theme }))`
  /* its box, icon, text and colors (components.alert) */
  ${props => alertRules(props.theme, props.$variant || 'warning')}
`
