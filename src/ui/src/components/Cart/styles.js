import { InlineDisclosureButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { buttonStill, headingText, themeBorderWidth, themeFontFamily, themeRadius, themeShadow, themeText, blockStill, themeSpace, themeSize, themeIconSize, themeShadowParts } from '~/utils/themeTokens'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { focusRingCss } from '~ui/src/styles/Focus'
import { themeTextKeepWeight } from '~/utils/productCartTheme'
import { getThemeComponent, getThemeCss, getThemeMobileOverrides } from '~/utils/themeCss'
import { motionCss } from '~/utils/themeMotion'
import { srOnlyCss } from '~ui/src/styles/Rules'

// the theme's `components.button.base.cta_full_width`, read as the Button piece reads it (the phone's value over the screen's)
const ctaFullWidth = (theme) => {
  const phone = theme.platform ? getThemeMobileOverrides(theme, 'button')?.base?.cta_full_width : undefined
  return phone ?? getThemeComponent(theme, 'button')?.base?.cta_full_width
}

/*
 * Side room for the theme's shadow (tokens.shadow at the Identity
 * size, cast in its direction) around the comment field and the coupon box.
 * The cart accordion clips its content (overflow: hidden, for the collapse)
 * at the bill's edges, which cut the side of the shadow that falls outside.
 * Both boxes take the same room so they keep the same width and edges.
 */
const shadowRoom = (theme) => {
  const { left, right } = themeShadowParts(theme, 'sm').reach
  return `padding-left: ${left}px; padding-right: ${right}px;`
}

/** The room in px the shadow of those boxes takes below them. */
export const shadowRoomBottom = (theme) => themeShadowParts(theme, 'sm').reach.bottom

export const CartContainer = styled.div`
  width: 100%;
`

export const CartSticky = styled.div`
  /*
   * the scroll is now owned by the MIDDLE product zone inside the
   * BusinessItemAccordion (AccordionContent) so the store-name header and the
   * Total + Checkout + Add more footer stay pinned. CartSticky is therefore a
   * passthrough flex column that lets AccordionSection bound its own height,
   * instead of being a single scroll container that pushed the actions off-screen.
   */
  ${({ isCartOnProductsList }) => isCartOnProductsList && css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: sticky;
    top: ${props => themeSpace(props.theme, 'xl')};
  `}
  width: 100%;

  span.clear-cart {
    margin-top: ${props => themeSpace(props.theme, 'lg')};
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  }

  div.clear-cart {
    display: flex;
    justify-content: center;
    margin-top: ${props => themeSpace(props.theme, 'md')};
    margin-bottom: ${props => themeSpace(props.theme, 'md')};

  }
`

/* "Taxes and fees" and its chevron: a button with no box of the browser,
   xs between them, the focus ring of the theme */
export const TaxesFeesToggle = (props) => <InlineDisclosureButton {...props} />

export const OrderBill = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: ${props => themeSpace(props.theme, 'sm')} 0px;
  background-color: ${isCheckout => isCheckout ? 'transparent' : themeColor(isCheckout.theme, 'surface')};
  table {
    font-family: ${props => themeFontFamily(props.theme, 'body')};
    width: 100%;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    /* the text of the bill (cart.base.bill_text; the bold rows keep theirs) */
    ${props => themeTextKeepWeight(props.theme, 'cart', 'bill_text')}

    td {
      padding-bottom: ${props => themeSpace(props.theme, 'sm')};
    }

    td span {
      unicode-bidi: bidi-override;
    }

    tr td:nth-child(2) {
      text-align: right;
      ${props => props.theme?.rtl && css`
        text-align: left;
      `}
    }
    .subtotal {
      td {
        font-weight: 600;
      }
    }
    .icon {
      display: flex;
      align-items: center;
      max-height: ${props => themeIconSize(props.theme, 'lg')};
      overflow: visible;
    }
    /* the delivery fee's tooltip button, xs off its label */
    .delivery-tooltip-trigger {
      margin-inline-start: ${props => themeSpace(props.theme, 'xs')};
    }
    .taxes-fees-summary {
      cursor: pointer;

      /* no hover color of its own (the theme has none for a row): its label
         keeps its color, the pointer says it opens */
      ${props => buttonStill(props.theme)}
    }
    .taxes-fees-detail {
      td {
        color: ${props => themeColor(props.theme, 'text_muted')};
        ${props => themeText(props.theme, 'body', { props: ['size'] })}
      }
      td.icon {
        padding-left: ${props => themeSpace(props.theme, 'lg')};
      }
    }
  }
  table.total {
    border-top: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'border')};
    ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
    padding-top: ${props => themeSpace(props.theme, 'sm')};
    tr {
      td {
        ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 'bold' })}
        /* cart.base.total_text, bold as today */
        ${props => themeTextKeepWeight(props.theme, 'cart', 'total_text')}
        color: ${props => themeColor(props.theme, 'text')};

        &#loyalty {
          ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 'normal' })}
        }
      }
    }
  }
  table.comments {
    margin-top: ${props => themeSpace(props.theme, 'xl')};
    tr {
      td:nth-child(1) {
        font-weight: bold;
      }
    }
    /* no cell spacing, the field spans the bill like the coupon box */
    border-spacing: 0;
  }
  table.spot {
    tr {
      td:nth-child(1) {
        font-weight: bold;
      }
      td:nth-child(2) {
        font-weight: bold;
        color: ${({ theme }) => primaryText(theme)};
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
          &:hover {
            text-decoration: underline;
          }
        }
        ${props => buttonStill(props.theme)}
      }
    }
  }
`

export const CouponContainer = styled.div`
  width: 100%;
  margin: ${props => themeSpace(props.theme, 'md')} 0;
  box-sizing: border-box;
  ${props => shadowRoom(props.theme)}
`

export const CheckoutAction = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${props => themeSpace(props.theme, 'md')};
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
  box-sizing: border-box;
  p {
    margin: 0;
    ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 600 })}
    /* cart.base.checkout_text, of its weight today */
    ${props => themeTextKeepWeight(props.theme, 'cart', 'checkout_text')}
    color: ${props => themeColor(props.theme, 'text')};

    ${props => blockStill(props.theme)}
  }
`

// The slot of the Checkout: it gives the row its width, the Button fills it (`fullWidth`)
export const CheckoutButtonSlot = styled.div`
  display: flex;
  /* no fixed floor — a 150px min-width forced horizontal overflow
     inside the cart modal on narrow (<=320px) screens */
  min-width: 0;
  /* half of the row; the whole row when the theme makes a main action full width (its
     Checkout is a cta), as the legacy button's own rule did over this one */
  width: ${({ theme }) => ctaFullWidth(theme) ? '100%' : '50%'};
  /* it gives room to the total, as the legacy button did (the piece does not shrink) */
  flex-shrink: 1;
`

export const Exclamation = styled.div`
  position: relative;
  display: inline-flex;
  cursor: pointer;
  margin-left: ${props => themeSpace(props.theme, 'xs')};
  top: ${props => themeSpace(props.theme, 'xs')};

  /* still, like every button */
  ${props => buttonStill(props.theme)}
`

/* The "Comments" label of the field: the saving indicator rides on its row,
   out of the text area (the field is a base Textarea, whose padding a screen
   does not rewrite), so it never covers what the customer types, and it
   takes no room of its own (no jump when it appears). */
export const CommentLabel = styled.div`
  position: relative;
`

export const CommentSaving = styled.span`
  position: absolute;
  top: 50%;
  inset-inline-end: ${props => themeSpace(props.theme, 'xs')};
  display: inline-flex;
  transform: translateY(-50%);
`

// what a screen reader hears while it saves (the ring is decorative)
export const CommentSavingStatus = styled.span`
  ${srOnlyCss}
`

// what a screen reader hears while the cart updates a product (the rings are decorative): always mounted, so the text is announced when it appears
export const CartUpdatingStatus = styled.p`
  margin: 0;
  ${srOnlyCss}
`

/* The ring beside an amount that is being recalculated (the total), in the
   line of its text. Before the amount (the bill's total, aligned to the end)
   it appears where the amount does not move. With $after (the total beside
   the Checkout) it is a slot of the ring's size that is always there, empty
   or not, so the ring appearing does not make the button give way. */
export const TotalSpinner = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  ${({ theme, $after }) => $after
    ? css`
      width: ${getThemeCss(theme, 'spinner').sizes.sm.diameter};
      height: ${getThemeCss(theme, 'spinner').sizes.sm.diameter};
      margin-inline-start: ${themeSpace(theme, 'sm')};
    `
    : css`margin-inline-end: ${themeSpace(theme, 'sm')};`}
`

export const CommentContainer = styled.td`
  position: relative;
  ${props => shadowRoom(props.theme)}
`

export const IconContainer = styled.div`
  position: relative;
  display: inline-flex;
  cursor: pointer;
  margin-left: ${props => themeSpace(props.theme, 'xs')};
  height: ${props => themeIconSize(props.theme, 'md')};

  /* still, like every button */
  ${props => buttonStill(props.theme)}

  svg:nth-child(1){
    position: relative;
  }
  svg:nth-child(2){
    position: relative;
    top: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
  }
  /* the icons inside their buttons: the second one (remove) as before */
  > button:nth-child(2) svg {
    top: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
  }
  /* the inline actions are xs buttons of the theme (their own height and
     icon), xs apart and from the text; no pointer of its own */
  ${({ theme }) => css`
    && {
      height: auto;
      align-items: center;
      cursor: default;
      margin-left: 0;
      margin-inline-start: ${themeSpace(theme, 'xs')};
      gap: ${themeSpace(theme, 'xs')};
      vertical-align: middle;
    }
    && svg, && > button:nth-child(2) svg {
      top: 0;
    }
  `}
`

const showDeliveryTooltip = css`
  visibility: visible;
  opacity: 1;
`

/** Delivery fee tooltip. A touch focuses the anchor and reveals the text. */
export const DeliveryTooltipAnchor = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: ${props => themeSpace(props.theme, 'xs')};
  outline: none;
  vertical-align: middle;
  flex-shrink: 0;

  &:focus-visible {
    /* the focus ring of the theme */
    ${props => focusRingCss(props.theme)}
  }

  .delivery-tooltip-bubble {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    left: 0;
    bottom: calc(100% + ${props => themeSpace(props.theme, 'md')});
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'sm')};
    /* a tooltip is the inverse surface of the theme */
    background-color: ${props => themeColor(props.theme, 'inverse_surface')};
    color: ${props => themeColor(props.theme, 'on_inverse')};
    font-family: ${props => themeFontFamily(props.theme, 'body')};
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
    text-align: left;
    white-space: normal;
    width: max-content;
    max-width: min(35ch, 85vw);
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    box-shadow: ${props => themeShadow(props.theme, 'lg')};
    z-index: 10050;
    pointer-events: none;
    unicode-bidi: plaintext;

    ${props => props.theme?.rtl && css`
      left: auto;
      right: 0;
      text-align: right;
    `}
    ${({ theme }) => motionCss(theme, 'tooltip', ['opacity', 'visibility'])}
  }

  &:focus-visible .delivery-tooltip-bubble {
    ${showDeliveryTooltip}
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover .delivery-tooltip-bubble {
      ${showDeliveryTooltip}
    }
  }
  @media not ((hover: hover) and (pointer: fine)) {
    &:focus .delivery-tooltip-bubble {
      ${showDeliveryTooltip}
    }
  }
  ${props => blockStill(props.theme)}
`

export const DeliveryFeeStrikethrough = styled.span`
  text-decoration: line-through;
  color: ${props => themeColor(props.theme, 'disabled')};
  margin-right: ${props => themeSpace(props.theme, 'sm')};
  font-weight: 400;
`

export const DeliveryFeeFreeLabel = styled.span`
  color: ${props => primaryText(props.theme)};
  font-weight: 600;
`

export const NoValidProductMessage = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`

export const InvalidCartMessage = styled.p`
  margin: ${props => themeSpace(props.theme, 'sm')} 0;
  ${props => alertRules(props.theme, 'danger')}
`

export const DriverTipContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: ${props => themeSpace(props.theme, 'xl')} 0px 0px;
  h3 {
    margin: 0px;
    ${props => headingText(props.theme, 'h3')}
    color: ${props => themeColor(props.theme, 'text')};
  }
  > p {
    margin: 0;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const WarningText = styled.p`
  margin: ${props => themeSpace(props.theme, 'md')} auto;
  text-align: center;
  color: ${props => primaryText(props.theme)};

  ${props => blockStill(props.theme)}
`

/* a danger alert of the theme (the reservation is missing) */
export const ReservationAlert = styled.div.attrs(alertAttrs('danger'))`
  p{
    color: ${props => themeColor(props.theme, 'danger_text')};

    ${props => blockStill(props.theme)}
  }
  ${props => alertRules(props.theme, 'danger')}
`

export const LoyaltyContainer = styled.div`
  display: flex;
  justify-content: center;
  background-color: ${props => themeColor(props.theme, 'surface')};
  margin: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'lg')};
  align-items: center;
  min-height: calc(1.3 * ${props => themeSize(props.theme, 'xl')});
  border-radius: ${props => themeRadius(props.theme, 'xxl')};
  box-shadow: ${props => themeShadow(props.theme, 'sm')};

  .icon {
    color: ${props => themeColor(props.theme, 'warning')};
    font-size: ${props => themeSize(props.theme, 'lg')};
    margin-top: ${props => themeSpace(props.theme, 'xl')};
    padding-right: ${props => themeSpace(props.theme, 'xxl')};
    transform: rotate(15deg);
  }

  span {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 700 })}
  }

  .red {
    color: ${props => primaryText(props.theme)};
  }
`
