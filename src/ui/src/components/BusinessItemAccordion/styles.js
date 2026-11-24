import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { buttonStill, themePart, themeText, blockStill, themeSpace, themeSize, themeIconSize } from '~/utils/themeTokens'
import { motionCss } from '~/utils/themeMotion'
import { focusRingRoomCss } from '~ui/src/styles/Focus'
import { TouchSlot, touchRoomXCss } from '~ui/src/styles/TouchSlot'
import { accordionHeaderBoxCss } from '~ui/src/styles/Accordion'
import { themeTextKeepWeight } from '~/utils/productCartTheme'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

export const AccordionSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  opacity: 1;

  ${({ isCartOnProductsList }) => isCartOnProductsList && css`
    position: sticky;
    top: ${props => themeSpace(props.theme, 'xl')};
  `}

  /*
   * 3-zone sticky-footer cart layout ().
   * When isStickyFooter is set (cart popover / sidebar drawer / inline cart),
   * the footer (PriceContainer with Total + Checkout + Add more) stays pinned
   * (position: sticky). Only the inline cart beside the products list, a
   * sticky column, is a bounded flex column whose middle product zone
   * (AccordionContent) scrolls; in the drawer the modal is the one scroller
   * (a bound there nested a second scroll, by a pixel at times).
   */
  ${({ isStickyFooter, isCartOnProductsList }) => isStickyFooter && isCartOnProductsList && css`
    max-height: 70vh;
    min-height: 0;
  `}

  &:last-child {
    border-bottom: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
  }

  /*
   * the last cart of a modal or drawer ends where the body's own padding begins
   * (--layer-pad-bottom, published by Dialog and Sheet; unset elsewhere, where this stays the
   * md above). Its sticky footer reaches the body's edge, so what lies after it is that padding
   * alone: the section margin takes the padding back (-pad), or the footer rested at its natural
   * place (margin + padding above the edge) and jumped to the edge on scrolling up. Only a section
   * that renders its footer ($hasStickyFooter: open, with products, not the checkout) does it: with
   * no footer to paint the strip the content keeps its room. A cart that is not the last
   * (not .cart:last-child) keeps its margin: its footer does not overhang.
   */
  ${({ $hasStickyFooter, theme }) => $hasStickyFooter && css`
    .cart:last-child &&:last-child {
      margin-bottom: calc(-1 * var(--layer-pad-bottom, calc(-1 * ${themeSpace(theme, 'md')})));
    }
  `}
`

export const Accordion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${({ isClosed }) => isClosed ? 'not-allowed' : 'pointer'};
  position: relative;
  padding: ${props => themeSpace(props.theme, 'sm')} 0px;
  box-sizing: border-box;


  ${props => props.isClosed && css`
    /* the overlay color of the theme (color.overlay) */
    background: ${themeColor(props.theme, 'overlay')};
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xs')};
  `}

  /* Fixed, non-scrolling HEADER zone (store name) for the sticky-footer layout. */
  ${({ isStickyFooter }) => isStickyFooter && css`
    flex-shrink: 0;
  `}
  ${props => blockStill(props.theme)}
  /* the header of components.accordion (its padding above and
     below, its background and hover); a closed store keeps its overlay */
  ${({ theme, isClosed }) => !isClosed && accordionHeaderBoxCss(theme)}

  /* the cart's view (popover, modal, drawer): the store (or the count of
     items) and its quiet Clear cart on one line; a cart alone neither
     opens nor closes */
  ${({ $cartView, theme }) => $cartView && css`
    gap: ${themeSpace(theme, 'sm')};
    > :first-child {
      flex: 1 1 auto;
      width: auto;
      min-width: 0;
    }
    .items-count {
      margin: 0;
      color: ${themeColor(theme, 'text_muted')};
      ${themeText(theme, 'body')}
    }
  `}
  ${({ $solo }) => $solo && css`
    cursor: default;
  `}
`

export const ContentInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;

  > div {
    display: flex;
    align-items: center;

    /* the store's actions (Go to store, Clear cart) are buttons xs apart,
       wrapping on a narrow column */
    flex-wrap: wrap;
    gap: ${props => themeSpace(props.theme, 'xs')};
  }
  ${props => props.theme?.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'md')};
    margin-left: 0;
  `}

  /* the reservation's line, a span of a row: not the label spans of the
     store's buttons (Go to store, Clear cart), which are the Button's own */
  > div > span {
    cursor: pointer;

    ${props => buttonStill(props.theme)}
  }

  span.danger{
    color: ${({ theme }) => themeColor(theme, 'danger_text')};
  }

  h3, > div > span {
    margin: 0px;
  }

  /* the business of the cart: the title of its block */
  h3 {
    color: ${props => themeColor(props.theme, 'text')};
    /* the cart's business name (cart.base.business_name) */
    ${props => themePart(props.theme, 'cart', { text: 'base.business_name' })}

    ${props => blockStill(props.theme)}
  }

  @media (min-width: 576px) {
    > div > span {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }
  }
`

// Capitalize the label without overriding the button's themed typography.
export const ChangeStoreLabel = styled.span`
  display: inline-block;
  &::first-letter {
    text-transform: uppercase;
  }
`

export const BusinessLink = React.forwardRef(({ $variant, ...props }, ref) => (
  <Button {...props} ref={ref} appearance='link' linkVariant={$variant} size='sm' />
))
BusinessLink.displayName = 'BusinessLink'

export const AccordionContent = styled.div`
  overflow: hidden;
  /* as components.accordion (animated / speed), else at once */
  ${props => motionCss(props.theme, 'accordion', ['min-height'])}
  /* it clips (for the collapse and the scroll), so it leaves
     room for the focus ring of the controls at its edges (the comment field,
     the coupon box, the steppers) without moving them; open only (closed,
     its 0 height must show nothing) */
  ${props => props.isOpen && focusRingRoomCss(props.theme)}
  /* and for the touch areas of its controls (the Edit link and the steppers of the cart's lines) */
  ${props => props.isOpen && touchRoomXCss(props.theme)}

  /*
   * Scrollable MIDDLE zone (the product list + bill + tips + comments).
   * Only enable internal scrolling once the accordion is open; while collapsed
   * the inline maxHeight:0 keeps it hidden and we must not show a scrollbar.
   */
  ${({ isStickyFooter, isCartOnProductsList, isOpen }) => isStickyFooter && isCartOnProductsList && isOpen && css`
    /*
     * Grow to fill the space between header and sticky footer (flex-grow: 1) and
     * allow shrinking (min-height: 0) so a TALL product list scrolls inside this
     * zone only, keeping the footer pinned. A short cart still hugs the footer
     * because the column's height is content-driven below its max-height cap.
     */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  `}
`

export const AccordionText = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
  padding: ${props => themeSpace(props.theme, 'lg')};
`

export const BusinessInfo = styled.div`
  display: flex;
  align-items: center;
  /* the actions' room: the theme's sm size */
  width: calc(100% - ${props => themeSize(props.theme, 'sm')});
  ${({ isOtherInfo }) => isOtherInfo && css`
    /* with metadata and actions: two lg sizes */
    width: calc(100% - 2 * ${props => themeSize(props.theme, 'lg')});
  `}

  h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const BusinessTotal = styled.div`
  width: ${({ isCartOnProductsList }) => isCartOnProductsList ? '30%' : '25%'};
  display: none;
  flex-direction: column;
  align-items: center;

  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 300 })}
    margin: 0px ${props => themeSpace(props.theme, 'xs')};


    &:nth-child(1) {
      font-weight: 500;
    }
    ${props => blockStill(props.theme)}
  }

  &.closed {
    flex: 1;
    p {
      text-align: center;
      margin: 0px ${props => themeSpace(props.theme, 'xl')};
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }

    &.has-clear {
      flex: 0 0 auto;
      width: auto;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: ${props => themeSpace(props.theme, 'sm')};

      p {
        margin: 0px;
        white-space: nowrap;
      }
    }
  }

  @media (min-width: 481px) {
    display: flex;
  }
`

// The node stays mounted when there is no neighboring action to separate.
export const HeaderActionSlot = styled(TouchSlot).attrs({ as: 'div', $mobile: true })`
  ${({ $reserved }) => !$reserved && 'display: contents;'}
`

export const BusinessActions = styled.div`
  max-width: ${props => themeSize(props.theme, 'sm')};
  ${({ $cartView, theme }) => $cartView && css`
    max-width: none;
    flex-shrink: 0;
    gap: ${themeSpace(theme, 'sm')};
  `}
  display: flex;
  align-items: center;
  justify-content: flex-end;

  span {
    height: ${props => themeIconSize(props.theme, 'lg')};

    &:hover {
      transform: scale(1.1);
    }
    /* still, like every button */
    ${props => buttonStill(props.theme)}

    &:not(:last-child) {
      margin-right: ${props => themeSpace(props.theme, 'xs')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'xs')};
        margin-right: 0;
    `}
    }
  }

  @media (min-width: 768px) {
    span {
      height: ${props => themeIconSize(props.theme, 'lg')};
    }
  }
`

/* The slot of one footer action: it takes the widths below, and the Button inside fills it (`fullWidth`),
   so no rule of the footer reaches the Button */
export const FooterAction = styled.div`
  display: flex;
  /* its min and max widths are measured in the Button's own characters, as they were on the Button */
  ${({ theme, $size }) => controlMeasureCss(theme, 'button', { size: $size })}
`

export const PriceContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* the cart total: text, not a heading */
  p.total {
    margin: 0;
    ${props => themeText(props.theme, 'h4')}
    /* cart.base.checkout_text, bold as today */
    ${props => themeTextKeepWeight(props.theme, 'cart', 'checkout_text')}

    ${props => blockStill(props.theme)}
  }

  /* the widths of its actions (the design system Buttons inside fill them: their box, text and
     one line are the piece's) */
  ${FooterAction} {
    min-width: 18ch;
    max-width: 70%;
    /* down to its min-width next to the total, as the legacy button did (the piece does not shrink) */
    flex-shrink: 1;
  }

  ${({ showUpsellingInBusinessInfo }) => showUpsellingInBusinessInfo && css`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: ${props => themeSpace(props.theme, 'md')};
    margin-top: ${props => themeSpace(props.theme, 'lg')};

    ${FooterAction} {
      max-width: none;
      width: auto;
    }

    /* "Add more products" takes its label's width; the primary Checkout
       (rendered last) fills the rest */
    ${FooterAction}:first-child {
      flex: 0 0 auto;
    }
    ${FooterAction}:last-child {
      flex: 1 1 0;
      min-width: 0;
    }
  `}

  /* a cart alone (not in a group): Checkout, the one action, at full width,
     and under it the quiet Add more products (a ghost), xs apart */
  ${({ showUpsellingInBusinessInfo, $inCartGroup, theme }) => showUpsellingInBusinessInfo && !$inCartGroup && css`
    flex-direction: column-reverse;
    gap: ${themeSpace(theme, 'xs')};

    && ${FooterAction}:first-child,
    && ${FooterAction}:last-child {
      flex: 0 0 auto;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
  `}


  /* In a cart group (cart drawer) both buttons share the row in equal
     halves, whatever their labels (the price would make them uneven) */
  ${({ $inCartGroup }) => $inCartGroup && css`
    ${FooterAction} {
      min-width: 0;
      max-width: none;
    }
    ${FooterAction}:first-child:not(:last-child) {
      flex: 1 1 0;
    }
    ${FooterAction}:last-child {
      flex: 1 1 0;
    }

    /* mobile: one under the other, Checkout first */
    @media (max-width: 768px) {
      flex-direction: column-reverse;
      align-items: stretch;
      gap: ${props => themeSpace(props.theme, 'sm')};

      ${FooterAction}:first-child:not(:last-child),
      ${FooterAction}:last-child {
        flex: 0 0 auto;
        width: 100%;
      }
    }
  `}

  /*
   * Always-visible sticky FOOTER zone (Total + Checkout + Add more) for the
   * 3-zone cart layout (). It never shrinks, sits at the bottom of the
   * bounded flex column, and gets a divider + the panel's surface so it visually
   * detaches from the scrolling product list above it.
   */
  ${({ isStickyFooter }) => isStickyFooter && css`
    flex-shrink: 0;
    position: sticky;
    z-index: 2;
    margin-top: 0;
    padding-top: ${props => themeSpace(props.theme, 'xs')};
    /*
     * inside a modal or drawer the scroller's padding shrinks the sticky rectangle,
     * so bottom: 0 pinned the footer that padding above the edge (the list showed under it). The
     * layer publishes it (--layer-pad-bottom, 0 where there is none): the footer reaches the edge
     * and its own padding grows by it, so the footer paints the strip and the buttons stay where
     * they were. At the end of the list the same edge is its natural place (AccordionSection).
     */
    bottom: calc(-1 * var(--layer-pad-bottom, 0px));
    padding-bottom: calc(${props => themeSpace(props.theme, 'xs')} + var(--layer-pad-bottom, 0px));
    background: ${props => themeColor(props.theme, 'surface')};
    /* cart.base.footer_background */
    ${props => themePart(props.theme, 'cart', { background: 'base.footer_background' })}
  `}
`
