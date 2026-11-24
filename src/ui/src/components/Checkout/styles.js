import styled, { createGlobalStyle, css } from 'styled-components'
import { themeColor, withAlpha, primaryText } from '~/utils/themeColors'
import { headingText, pageGutter, themeBorderStyle, themeBorderWidth, themeFontFamily, themeIconSize, themeRadius, themeSize, themeShadow, themeSpace, themeText, blockStill, buttonStill } from '~/utils/themeTokens'
import { getThemeCss, resolveThemeProps } from '~/utils/themeCss'
import { BOTTOM_NAV_COVER, bottomBarPaddingCss, bottomNavDockedRules } from '~ui/src/components/NavigationBar/styles'
import { motionCss } from '~/utils/themeMotion'
import { dividerLineCss, dividerRules } from '~ui/src/styles/Divider'
import { srOnlyCss } from '~ui/src/styles/Rules'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { iconTileCss } from '~ui/src/styles/IconTile'
import { accordionHeaderPadding, accordionHeaderTextCss } from '~ui/src/styles/Accordion'
import { SectionHeader, sectionTitleGap } from '~ui/src/styles/DetailsSection'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { cardBoxCss } from '~ui/src/styles/Card'
import { RequiredBadge } from '~ui/src/components/ProductOption/styles'
import { CouponContainer, OrderBill, shadowRoomBottom } from '~ui/src/components/Cart/styles'
import { AccordionSection } from '~ui/src/components/BusinessItemAccordion/styles'
import {
  CHECKOUT_COLUMNS_MIN,
  checkoutStoreRowLogoCss,
  checkoutStoreRowNameCss,
  checkoutTotalsBlockCss,
  checkoutGap,
  checkoutGridColumns,
  checkoutPaddingCss,
  checkoutSectionTitleCss,
  checkoutTotalsPadding,
  driverTipsSubtitleCss
} from './checkoutTheme'

// `prop` set to the space between the sections (checkout.section_gap)
const gapCss = (theme, ...props) => props.map((prop) => `${prop}: ${checkoutGap(theme)};`).join(' ')

/* implementation notes round 4 (proposal B): a fixed two-column grid replaces the
   theme's own row-of-sections layout. From here on, inside /checkout, the
   theme no longer decides:
   - `pages.checkout.sections[].group` (main/side): each section's zone (step
     1, step 2, the summary) is fixed by the mockup. Its `.order` still
     applies inside each zone (inThemeOrder, Checkout index.js), and
     `components.checkout.main_width` still splits the two columns, the
     summary never under CHECKOUT_SUMMARY_MIN (checkoutGridColumns);
   - `components.checkout.section_title` / `section_title_color` for the
     step cards and the context card (their heading is the step's own look,
     not a themeable "section title"); still used by any plain `h2`/`h4`
     left over at `checkoutSectionTitleCss`'s call sites (business' error
     state, delivery_instructions, etc.) that keep their old look inside a
     card now;
   - `components.checkout.business_logo_size`, `business_name` and
     `totals_padding` apply with a cap (option b, checkoutTheme.js): the
     store row's logo at most CHECKOUT_LOGO_MAX px, its name in the theme's
     face at most the body size and bold, the totals' padding as room above
     and below the totals block — never a card inside the summary card;
   - `components.accordion`'s header text on the payment step: it is the
     step's title, the same as "Your details".
   `pages.checkout.sections[].visible`, `checkout.business.*` and every
   other visibility flag ARE still respected (sectionVisible, Checkout
   index.js) — hidden stays hidden, only where/when it paints changed.
   `padding_y`/`padding_x` (checkoutPaddingCss) and `section_gap`
   (checkoutGap, still used for the vertical rhythm of the stacked cards)
   keep applying. */
/* Names and addresses wrap to two lines before they are cut, and the
   element carries the full text in its title. */
const twoLineClamp = css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
`

export const Container = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  min-height: auto;

  @media (min-width: ${CHECKOUT_COLUMNS_MIN}px) {
    display: grid;
    grid-template-columns: ${props => checkoutGridColumns(props.theme)};
    align-items: start;
    gap: ${props => themeSpace(props.theme, 'xxl')};
  }

  /* the page keeps the footer under the fold while it is short: the screen less header, footer and margins (~5 headers, as the 337 px it was) */
  @media (min-width: 993px) {
    min-height: calc(100dvh - 5 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
    box-sizing: border-box;
  }
  ${props => blockStill(props.theme)}
`

/* The order context docked under the header (769-1023px): a row of its own
   across both columns, not the grid's first cell (that pushed the details
   into the summary's column and the summary under them). */
export const DockedOrderContextRow = styled.div`
  grid-column: 1 / -1;
  width: 100%;
  min-width: 0;
`

/* The left column stacked: the page's sides. Side by side: its padding
   (components.checkout, checkoutPaddingCss) — its width is the grid's
   main_width share above. */
export const WrapperLeftContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 0 ${props => pageGutter(props.theme)}px ${props => themeSpace(props.theme, 'sm')};
  ${props => blockStill(props.theme)}
  ${props => checkoutPaddingCss(props.theme)}
`

export const WrapperRightContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => pageGutter(props.theme)}px;

  /* the place order bar fixed at the bottom: the page's end keeps its room
     (CheckoutBottomRoom, as tall as the bar) */
  ${props => blockStill(props.theme)}
  /* its padding (components.checkout); the one summary card, stuck near the
     top of the viewport while the left column scrolls past it */
  ${props => checkoutPaddingCss(props.theme)}
  @media (min-width: ${CHECKOUT_COLUMNS_MIN}px) {
    position: sticky;
    top: ${props => themeSpace(props.theme, 'lg')};
  }
`

export const WrapperUserDetails = styled.div`
  width: 100%;
  ${props => blockStill(props.theme)}
`

export const UserDetailsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  ${props => blockStill(props.theme)}
  /* section_gap apart from the sections around it (the
     dividers between them take the same space: one gap whatever the order) */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
  padding-bottom: 0;
`

/* The business of a pickup-like order, inside the context card: "Pickup at
   {business} · {moment}" in bold, then its address, phone and notes small
   and muted (each as checkout.business.* shows it). */
export const BusinessDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    overflow-wrap: anywhere;
  }
  /* the title of the block when the business fails to load (an h2 of the
     page with the look of the h4 it was) */
  h2.section-title {
    margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
    ${props => headingText(props.theme, 'h4')}
    ${props => checkoutSectionTitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const PaymentMethodContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;

  /* the title of a checkout block (wallet, driver tips): an h2 of the page */
  h2, h4 {
    margin: 0px;
    ${props => headingText(props.theme, 'h4')}
    color: ${props => themeColor(props.theme, 'text')};
    /* checkout.section_title */
    ${props => checkoutSectionTitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const DriverTipContainer = styled(PaymentMethodContainer)`
  margin: ${props => themeSpace(props.theme, 'xl')} 0px 0px;

  /* its title is a section title of the checkout (checkout.section_title) */
  > p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    font-family: ${props => themeFontFamily(props.theme, 'body')};
    color: ${props => themeColor(props.theme, 'text_muted')};
    /* the subtitle of components.driver_tips */
    ${props => driverTipsSubtitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

export const CartContainer = styled(PaymentMethodContainer)`
  margin: ${props => themeSpace(props.theme, 'xl')} 0px 0px;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  position: relative;

  ${({ hideOrderBill }) => hideOrderBill && css`
    margin-top: 0px;
    margin-bottom: 0px;
  `}

  ${({ hideProductList }) => hideProductList && css`
    /* the totals are plain rows of the summary card (never a card inside
       it): the bill's own space (the bill's 10px above and below, the
       accordion's and the coupon's 10px below) gives way to the summary
       card's gap; the coupon row is checkout.totals_padding under the row
       above it (each box keeps below it the room of its shadow) */
    ${props => css`
      && ${AccordionSection} {
        margin-bottom: 0;
      }
      /* totals_padding: the totals block's room above and below (capped
         use in B: no card, no border — checkoutTotalsBlockCss) */
      && ${OrderBill} {
        ${checkoutTotalsBlockCss(props.theme)}
      }
      /* the rows' text on the card's edge, as the product lines and the
         comments over and under them (no table spacing of the browser) */
      && ${OrderBill} table {
        border-spacing: 0;
      }
      && ${OrderBill} td {
        padding-inline: 0;
      }
      && ${CouponContainer} {
        margin: ${checkoutTotalsPadding(props.theme)} 0 0;
        padding-bottom: ${shadowRoomBottom(props.theme)}px;
      }
      && table:has(+ ${CouponContainer}) tr:last-child td {
        padding-bottom: ${shadowRoomBottom(props.theme)}px;
      }
      /* (the comment field a block: no line's descent under it) */
      && table.comments textarea {
        display: block;
      }
    `}
  `}

  ${({ isGiftCardCart }) => isGiftCardCart && css`
    table .subtotal td {
      padding: 0px;
    }
  `}
  ${props => blockStill(props.theme)}
  /* section_gap apart from the sections around it */
  ${props => !props.hideOrderBill && gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

export const WalletPaymentOptionContainer = styled(PaymentMethodContainer)`
  margin: ${props => themeSpace(props.theme, 'xl')} 0px 0px;
  ${props => blockStill(props.theme)}
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}

  /* inside the payment step, under the methods: a label of the step (h3
     under the step's h2), not a section title of the page */
  h3 {
    margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
    ${props => themeText(props.theme, 'body', { props: ['size', 'line', 'weight', 'family'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const WrapperPlaceOrderButton = styled.div`
  display: flex;
  align-items: flex-end;

  > div {
    width: 100%;
    display: flex;
    /* implementation notes round 2: the missing list, the messages and the button
       stack full width, in that order — never side by side (a row flex
       here squashed the button to the width of its neighbors) */
    flex-direction: column;
    gap: ${props => themeSpace(props.theme, 'sm')};
  }
  /* the space of a section (tokens.space.xl) over it, as between the other
     blocks of the column */
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  /* section_gap over it (components.checkout) */
  ${props => gapCss(props.theme, 'margin-top')}
  ${props => blockStill(props.theme)}
`

/* an alert of the theme (components.alert): `$variant` info
   (the order is being processed), danger (the payment failed) or warning */
export const WarningMessage = styled.div.attrs(({ theme, $variant = 'warning' }) => alertAttrs($variant)({ theme }))`
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  ${props => alertRules(props.theme, props.$variant || 'warning')}
`

export const PendingCartNoticeContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'md')};
  padding: ${props => themeSpace(props.theme, 'xl')} 0;

  /* the title as the warning's own text, the description smaller */
  && p {
    margin: 0 7.5ch;
    text-align: center;
    ${props => themeText(props.theme, 'body')}
  }
  && p.title {
    ${props => themeText(props.theme, 'body_lg')}
  }

`

// the pending notice's action: the space over it is the wrapper's, not a rule on the button
export const PendingCartNoticeAction = styled.div`
  display: flex;
  margin-top: ${props => themeSpace(props.theme, 'xs')};
`

export const CartsList = styled.div`
  display: flex;
  flex-direction: column;
  width: 90%;
  margin: auto;

  @media (min-width: 381px) {
    width: 80%;
  }
  ${props => blockStill(props.theme)}
`

/* a warning alert of the theme (why the order cannot be placed
   yet), a status */
export const WarningText = styled.p.attrs(alertAttrs('warning'))`
  margin: ${props => themeSpace(props.theme, 'md')} auto;
  text-align: center;
  color: ${props => primaryText(props.theme)};
  ${props => blockStill(props.theme)}
  ${props => alertRules(props.theme, 'warning')}
`

export const WrapperLeftContent = styled.div`
  width: 100%;

  /* "Checkout": the title of the page */
  h1.checkout-title {
    margin: 0;
    ${props => headingText(props.theme, 'h1')}
    color: ${props => themeColor(props.theme, 'text')};
    /* the page title (section_header, page variant); its space
       is the checkout's */
    ${props => sectionTitleCss(props.theme, { level: 'h1', spaced: false })}
    /* section_gap under it, as between the sections (whichever
       comes first) */
    ${props => gapCss(props.theme, 'margin-bottom')}
  }
  /* the title of a detail section (Customer Details, Delivery
     Address) is checkout.section_title, as the other sections' */
  ${SectionHeader} h2, ${SectionHeader} h4 {
    ${props => checkoutSectionTitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const CheckOutDivider = styled.div`
  height: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })};
  width: calc(100%);
  background: ${props => themeColor(props.theme, 'surface_alt')};
  ${props => blockStill(props.theme)}
  /* components.divider section (its margins collapse with the
     sections' own, so its spacing is the space around it) */
  ${props => dividerRules(props.theme, 'section')}
  /* section_gap above and below (components.checkout: the space
     between the sections, the same with or without the divider's line) */
  ${props => `&&& { margin-top: ${checkoutGap(props.theme)}; margin-bottom: ${checkoutGap(props.theme)}; }`}
`

export const DeliveryOptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  gap: ${props => themeSpace(props.theme, 'md')};

  /* the section's title: an h2 of the page with the look of the h4 it was */
  h2, h4 {
    ${props => headingText(props.theme, 'h4')}
    margin-top: 1.33em;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    ${props => checkoutSectionTitleCss(props.theme)}
  }

  .delivery-options-list {
    display: flex;
    flex-direction: column;
    /* the space between the options of a list (components.choice gap) */
    gap: ${props => getThemeCss(props.theme, 'choice').base.gap};
  }

  ${props => blockStill(props.theme)}
  /* section_gap apart from the sections around it; the title
     the sm space over its options, as the other sections' */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
  h2, h4 {
    margin: 0;
  }
  gap: ${props => sectionTitleGap(props.theme)};
`

export const SelectSpotContainer = styled.div`
  ${props => blockStill(props.theme)}
  /* section_gap apart from the sections around it */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

/* The reservation's section: section_gap apart from the others */
export const ReservationContainer = styled.div`
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
`

export const WrapperActionsInput = styled.div`
  /* an h2 of the page with the look of the h4 it was */
  h2, h4 {
    margin: 1.33em 0;
    ${props => headingText(props.theme, 'h4')}
    ${props => checkoutSectionTitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

/* Small screens: the room at the page's end (after the footer)
   that the place order bar fixed at the bottom covers, beyond the one the
   app already leaves there for the navigation the bar lies over
   ($room, px) */
export const checkoutBottomRoomCss = (room) => `
  body::after {
    content: '';
    display: block;
    height: ${room}px;
  }
`

export const CheckoutBottomRoom = createGlobalStyle`
  ${props => checkoutBottomRoomCss(props.$room)}
`

export const MobileWrapperPlaceOrderButton = styled.div.attrs({ [BOTTOM_NAV_COVER]: '' })`
  position: fixed;
  width: 100%;
  inset-inline-start: 0;
  bottom: 0;
  background-color: ${props => themeColor(props.theme, 'surface')};
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xl')};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
  box-sizing: border-box;
  z-index: 1006;
  box-shadow: ${props => themeShadow(props.theme, 'lg')};

  /* the keyboard is up over a text field (implementation notes, useKeyboardOpen): the bar is no longer fixed over the form
     but the end of the content (the field being typed in does not move); it is fixed again when the keyboard goes */
  html[data-keyboard-open] & {
    position: static;
  }

  /* a bar at the bottom, as the navigation (over it): its
     background, border, shadow and padding (components.bottom_nav) */
  ${props => bottomNavDockedRules(props.theme)}
  ${props => blockStill(props.theme)}
  ${props => bottomBarPaddingCss(props.theme)}
`

/* the warning alert of the theme, as the WarningText it
   stands for on small screens */
export const MobilePlaceOrderHint = styled.p.attrs(alertAttrs('warning'))`
  margin: 0;
  text-align: center;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${props => primaryText(props.theme)};
  ${props => alertRules(props.theme, 'warning')}
`

export const OrderContextUIWrapper = styled.div`
  flex: 1;
  margin-inline-start: ${props => themeSpace(props.theme, 'lg')};
  max-width: 85%;

  @media (min-width: 480px) {
    max-width: 90%;
  }
  ${props => blockStill(props.theme)}
`

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  .back-arrow {
    ${props => themeText(props.theme, 'h2', { props: ['size', 'family'] })}
    cursor: pointer;

    &:hover {
      transform: translateX(calc(-1 * ${props => themeSpace(props.theme, 'xxs')}));
    }
    /* still, as the buttons */
    transition: none;
    &:hover, &:active {
      transform: none;
      box-shadow: none;
    }
    ${props => buttonStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
  /* empty on wide screens (the order context docks under the header on small
     ones): no room of its own above the title */
  &:empty {
    display: none;
  }
`

/* implementation notes round 4 (proposal B): the progress under "Checkout" — its
   label row (the step text left, "Pickup · ASAP" muted right) and, below,
   two DISCRETE segments (one per step), never a single continuously filling
   bar: components.progress's own states mix in a success green the mockup
   explicitly rules out, and its bar is one piece, not two — so this reads
   the plain color/radius/space tokens directly instead of that primitive
   (documented exception, see the round 4 report). Hidden in kiosk mode,
   customer mode and when the customer section is not painted. */
export const CheckoutProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};
  ${props => gapCss(props.theme, 'margin-bottom')}

  .checkout-progress-labels {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${props => themeSpace(props.theme, 'sm')};
  }

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
  }

  .checkout-progress-context {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    white-space: nowrap;
  }
  ${props => blockStill(props.theme)}
`

/* The two segments themselves: tokens.space.xs apart, full radius, each
   tokens.space.xs tall (the nearest token to the mockup's 4px). */
export const ProgressSegmentsTrack = styled.div`
  display: flex;
  gap: ${props => themeSpace(props.theme, 'xs')};
`

export const ProgressSegment = styled.div`
  flex: 1;
  height: ${props => themeSpace(props.theme, 'xs')};
  border-radius: ${props => themeRadius(props.theme, 'full')};
  background: ${props => props.$done ? themeColor(props.theme, 'primary') : themeColor(props.theme, 'surface_alt')};
  ${props => blockStill(props.theme)}
`

/* The numbered circle of a step card's header: pending = muted/neutral,
   current = primary, done = a check in the success color over its subtle
   fill (components.steps' "complete" state is primary, not this done-only
   color — hand-read instead of reused). The icon.lg box, the caption's
   size for the number, the icon.sm check. */
export const StepNumberCircle = styled.span`
  flex-shrink: 0;
  box-sizing: border-box;
  width: ${props => themeIconSize(props.theme, 'lg')};
  height: ${props => themeIconSize(props.theme, 'lg')};
  border-radius: ${props => themeRadius(props.theme, 'full')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  ${props => themeText(props.theme, 'caption', { props: ['size', 'family', 'weight'], weight: 600 })}
  line-height: 1;

  ${props => props.$state === 'done' && css`
    background: ${themeColor(props.theme, 'success_subtle')};
    color: ${themeColor(props.theme, 'success')};
  `}
  ${props => props.$state === 'current' && css`
    background: ${themeColor(props.theme, 'primary')};
    color: ${themeColor(props.theme, 'on_primary')};
  `}
  ${props => (!props.$state || props.$state === 'pending') && css`
    background: ${themeColor(props.theme, 'surface_alt')};
    color: ${themeColor(props.theme, 'text_muted')};
  `}

  svg {
    flex: none;
    width: ${props => themeIconSize(props.theme, 'sm')};
    height: ${props => themeIconSize(props.theme, 'sm')};
    font-size: ${props => themeIconSize(props.theme, 'sm')};
  }
  ${props => blockStill(props.theme)}
`

/* A step card (Your details, Payment): components.card's look (background,
   radius, shadow) plus an explicit 1px border (card.base.border is null by
   default). `$current` (the step being worked on) gets a primary-tinted
   border and a bit more lift instead of a literal primary-tinted shadow —
   THEMING.md serves shadows ready, never built from a mixed color; a plain
   theme shadow stands in for it (documented exception). */
export const StepCard = styled.section`
  box-sizing: border-box;
  ${props => cardBoxCss(props.theme, 'card')}
  border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
  /* The details contain actions at the edges, even with a pill-shaped card. */
  overflow: ${props => props.$allowFocusOverflow ? 'visible' : 'hidden'};
  ${props => gapCss(props.theme, 'margin-top')}
  ${props => blockStill(props.theme)}

  ${props => props.$current && css`
    border-color: ${withAlpha(themeColor(props.theme, 'primary'), 0.35)};
    box-shadow: ${themeShadow(props.theme, 'md')};
  `}
`

export const StepCardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'md')};
  padding: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'lg')};

  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 600 })}
    color: ${props => props.$pending ? themeColor(props.theme, 'text_muted') : themeColor(props.theme, 'text')};
  }
  ${props => blockStill(props.theme)}
`

/* The collapsed step's own summary (two lines at most, then cut: the full
   text in its title, implementation notes; never a focusable control of its own —
   "Edit" above is the only action). */
export const StepCollapsedSummary = styled.span`
  flex-shrink: 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
  max-width: 55%;
  ${twoLineClamp}
`

export const StepCardBody = styled.div`
  padding: 0 ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};

  /* the pieces inside (UserDetailsContainer, DeliveryOptionsContainer…) keep
     their own look; only their outer rhythm (section_gap margins meant for
     a flat column of sections) is reset — the card's own gap takes over */
  > * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  ${props => blockStill(props.theme)}
`

/* The payment step: the methods' accordion fills the card, its header row
   is the step's header (the padding, gap and title of StepCardHeaderRow) and
   the methods, the cash amount and the wallet are the step's body (the
   padding of StepCardBody), never touching the card's edges. */
export const PaymentStepCard = styled(StepCard)`
  && .paymentsContainer {
    margin: 0;
  }
  && .header-row {
    gap: ${props => themeSpace(props.theme, 'md')};
    padding: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'lg')};
  }
  && .header > span.title {
    gap: ${props => themeSpace(props.theme, 'md')};
    ${props => themeText(props.theme, 'h4', { props: ['size', 'line', 'weight', 'family'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};

    > span:first-child {
      margin-inline-end: 0;
    }
  }
  && .header-row ~ .content {
    padding: 0 ${props => themeSpace(props.theme, 'lg')};
  }
  && #checkout-payment-content {
    margin: 0;
    padding: 0 ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
  }
  /* the methods start at the body's top, right under the header row (no
     margin of their own above them) */
  && #checkout-payment-content [data-doc-section='payment-method-options'] {
    margin-top: 0;
  }
  && .payment-step-extra {
    margin: 0;
    padding: 0 ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
  }
`

/* An icon on the first line of the text beside it (flex-start rows of a
   context, a notice or an alert): a box one line of `textCss` tall (1lh),
   the icon centered in it. */
const firstLineIconCss = (textCss, size, color) => `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  ${textCss}
  height: 1lh;
  color: ${color};

  svg {
    flex: none;
    width: ${size};
    height: ${size};
    font-size: ${size};
  }
`

// The look of components.alert's `variant` as CSS (its view)
const alertLook = (theme, variant) => resolveThemeProps(getThemeCss(theme, 'alert'), { variant })

/* The context card (pickup-like: "Pickup at {business} · {moment}" and the
   business' address; delivery: "Deliver to" and the address,
   AddressDetails' own Change). A neutral-subtle box, not a card border — it
   is information, not a step. */
export const ContextCard = styled.div`
  display: flex;
  gap: ${props => themeSpace(props.theme, 'md')};
  align-items: flex-start;
  padding: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'lg')};
  background: ${props => themeColor(props.theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  ${props => gapCss(props.theme, 'margin-top')}
  ${props => blockStill(props.theme)}

  .checkout-context-icon {
    ${props => firstLineIconCss(themeText(props.theme, 'body', { props: ['size', 'line'] }), themeIconSize(props.theme, 'md'), themeColor(props.theme, 'primary'))}
  }

  .checkout-context-body {
    min-width: 0;
    flex: 1;
  }

  .checkout-context-title {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size', 'line', 'weight'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
  }

  /* delivery: AddressDetails reused as it is, laid out from here — its
     title row's action (Change) at the end of "Deliver to", its own title
     only for assistive tech (the card's says it), the address small and
     muted under them, then its map link */
  .checkout-context-body.checkout-context-address {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: ${props => themeSpace(props.theme, 'sm')};
  }
  [data-doc-section='checkout-fulfillment-address'] {
    display: contents;

    > * {
      grid-column: 1 / -1;
    }
    /* one line of the title tall (1lh), its Change centered on that line
       (the button overflows into the card's padding), so the icon, "Deliver
       to" and Change share the first line */
    > ${SectionHeader} {
      grid-column: 2;
      grid-row: 1;
      margin: 0;
      ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
      height: 1lh;
      align-items: center;

      h2 {
        ${srOnlyCss}
      }
    }
    > p {
      ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
      color: ${props => themeColor(props.theme, 'text_muted')};
    }
  }

  /* the business block and AddressDetails, reused as they are: no card
     margins of their own inside this box (the context card's gap/padding
     already space everything) */
  > * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`

/* The right column's one summary card: store row → products → totals
   (+ driver tips, rewards) → warnings → the CTA → what is still needed.
   Stacked (one column) it is the page itself, no box of its own. */
export const SummaryCard = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'lg')};
  ${props => blockStill(props.theme)}

  @media (min-width: ${CHECKOUT_COLUMNS_MIN}px) {
    ${props => cardBoxCss(props.theme, 'card', { padding: true })}
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
  }

  /* the pieces inside keep their own internal look; only the stale
     flat-column rhythm (section_gap margins) collapses to the card's gap */
  > * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`

/* The summary card's store row: its logo in the compact box
   (checkout.business.logo; hidden, nothing in its place), its name in bold
   and its address muted, the item divider under it. $short: the context
   card has the business' whole block (a pickup-like order), so the address
   is one line here; otherwise the row holds that block (phone, notes,
   skeleton, error) and nothing is cut. */
export const StoreStrip = styled.div`
  display: flex;
  align-items: ${props => props.$short ? 'center' : 'flex-start'};
  gap: ${props => themeSpace(props.theme, 'md')};
  padding-bottom: ${props => themeSpace(props.theme, 'md')};
  ${props => dividerLineCss(props.theme, 'item')}
  ${props => checkoutStoreRowLogoCss(props.theme)}
  ${props => blockStill(props.theme)}

  .business-logo, img, .business-logo-placeholder {
    flex-shrink: 0;
  }

  /* block + overflow: an inline broken img ignores width/height and lays out its alt text */
  img {
    display: block;
    overflow: hidden;
  }

  .business-logo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => themeColor(props.theme, 'surface_alt')};
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  .business-logo-placeholder svg {
    flex: none;
    width: ${props => themeIconSize(props.theme, 'md')};
    height: ${props => themeIconSize(props.theme, 'md')};
    font-size: ${props => themeIconSize(props.theme, 'md')};
  }

  .store-strip-text {
    min-width: 0;
    flex: 1;
  }

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    ${props => props.$short && twoLineClamp}
  }
  p.store-strip-name {
    ${props => checkoutStoreRowNameCss(props.theme)}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

/* "Still sending your order…" under the button while it takes long: the
   clock on the first line of a small muted text (a status, no box). */
export const SlowNotice = styled.p.attrs({ role: 'status' })`
  display: flex;
  align-items: flex-start;
  gap: ${props => themeSpace(props.theme, 'sm')};
  margin: 0;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};

  .notice-icon {
    ${props => firstLineIconCss(themeText(props.theme, 'body', { props: ['size', 'line'] }), themeIconSize(props.theme, 'sm'), themeColor(props.theme, 'text_muted'))}
  }
`

/* "Your order wasn't placed…" over the button: a danger alert of the theme
   (components.alert), its icon on the first line of its text. */
export const PlaceOrderErrorAlert = styled.div.attrs(alertAttrs('danger'))`
  ${props => alertRules(props.theme, 'danger')}

  .notice-icon {
    ${props => {
      const look = alertLook(props.theme, 'danger')
      return firstLineIconCss(look.text.css, look.icon_size, look.icon_color)
    }}
  }
`

/* Above the guest's inline form (step 1, guest allowed): "Ordered here
   before? Log in for faster checkout" and "Sign up for faster checkout",
   secondary links (components.link), not buttons. */
export const GuestCheckoutLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'md')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};

  ${props => blockStill(props.theme)}
`

/* implementation notes round 3: while the guest's form is open and nothing it has is
   required, says so next to the links above — a "Ready" CTA next to an open
   form must not read as if filling it were mandatory. */
export const GuestDetailsOptionalNote = styled.p`
  margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

/* "Still needed: …" under the Place Order button, small and centered: the
   ordered fixable gaps (missingItems), each a text action (components.link,
   sm) to its field. */
export const MissingItemsHint = styled.p`
  margin: 0;
  text-align: center;
  ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

export const AuthButtonList = styled.div`
  display: flex;
  flex-direction: column;

  /* an h2 of the page with the look of the h4 it was */
  h2, h4 {
    ${props => headingText(props.theme, 'h4')}
    margin-top: 1.33em;
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    ${props => checkoutSectionTitleCss(props.theme)}
  }

  ${props => blockStill(props.theme)}
`

// one action of the list: its full width and the space over it live here, the button is a piece
export const AuthButtonSlot = styled.div`
  display: flex;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`

export const Flag = styled.span`
  ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 500 })}
  margin: 0px ${props => themeSpace(props.theme, 'md')} 0px 0px;
  text-transform: capitalize;
  color: ${props => themeColor(props.theme, 'danger_text')};

  p {
    margin: 0;
    color: ${props => themeColor(props.theme, 'text')};
  }

  @media (min-width: 381px) {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }
  ${props => blockStill(props.theme)}
`

/* "Required" as a badge of the theme (checkout.slots.required),
   the sm space off the chevron */
export const RequiredFlag = styled(RequiredBadge)`
  margin-inline-end: ${props => themeSpace(props.theme, 'sm')};
`

export const SectionTitleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2, h4 {
    margin: 0px;
    ${props => headingText(props.theme, 'h4')}
    ${props => checkoutSectionTitleCss(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const OrderDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xxl')} ${props => themeSpace(props.theme, 'lg')};

  /* the address and the order type: text, not headings */
  > p {
    margin: 1em 0;
    ${props => themeText(props.theme, 'body_lg')}
  }
  ${props => blockStill(props.theme)}
`

export const SpinnerContainer = styled.div`
  position: absolute;
  width: 100%;
  inset-inline-start: 0;
  top: -100%;
  ${props => blockStill(props.theme)}
`

export const SummaryAccordion = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  ${props => blockStill(props.theme)}
  /* section_gap apart from the sections around it; its own
     box (flow-root), so the negative margin of its open content does not
     pull that space in */
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}
  display: flow-root;
`

export const NoPaymentNeededMsg = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  ${props => gapCss(props.theme, 'margin-top', 'margin-bottom')}

  p {
    margin: ${props => themeSpace(props.theme, 'xs')} 0 0 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    /* secondary text (text_muted) */
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const SummaryAccordionHeader = styled.div`
  display: flex;
  flex-direction: column;
  ${({ theme }) => motionCss(theme, 'accordion', ['background-color', 'color'])}

  /* the section's heading (h2 of the page): the button inside sets the look */
  .accordion-heading {
    flex: 1;
    min-width: 0;
    margin: 0;
    font: inherit;
  }

  /* the payment's row: its heading and, a method chosen, "Change" beside it */
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => themeSpace(props.theme, 'sm')};
    /* components.accordion header_padding above and below, as
       the summary's header */
    padding: ${props => accordionHeaderPadding(props.theme)} 0;
  }

  .header {
    > span.title {
      display: flex;
      align-items: center;
      ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 600 })}
      /* the header text of components.accordion */
      ${props => accordionHeaderTextCss(props.theme)}

      /* the step's numbered circle (StepNumberCircle), the sm space before
         the heading's text */
      > span:first-child {
        margin-inline-end: ${props => themeSpace(props.theme, 'sm')};
      }
    }

    .align-content {
      display: flex;
      align-items: center;
    }
  }

  .content {
    padding: 0px;
    /* as components.accordion (animated / speed), else at once */
    ${props => motionCss(props.theme, 'accordion', ['max-height', 'opacity'])}
    opacity: ${props => props.active ? '0' : '1'};
    max-height: ${props => props.active ? '0' : '80em'};
    overflow: ${props => props.active ? 'hidden' : 'visible'};

    /* the payment selected: text, not a heading */
    p.payment-name {
      margin: 0;
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'family'], weight: 400 })}
    }
  }
  ${props => blockStill(props.theme)}
`

export const SummaryAccordionContent = styled.div`
  max-height: ${props => props.active ? '80em' : '0'};
  opacity: ${props => props.active ? '1' : '0'};
  overflow: hidden;
  /* as components.accordion (animated / speed), else at once */
  ${props => motionCss(props.theme, 'accordion', ['max-height', 'opacity'])}
  transform-origin: bottom;
  /* room for the shadows of its content (inputs, cards) that the clip would
     cut, without moving the layout */
  ${props => props.active && css`
    margin: calc(-1 * ${props => themeSpace(props.theme, 'sm')});
    padding: ${props => themeSpace(props.theme, 'sm')};
  `}
`

// the delete action of the card: the sm space off the card's text; the button is a piece
export const CardItemAction = styled.div`
  display: flex;
  flex-shrink: 0;
  margin-inline-start: ${props => themeSpace(props.theme, 'sm')};
`

export const CardItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-weight: bold;
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  /* still, as the buttons */
  transition: none;
  &:hover, &:active {
    transform: none;
    box-shadow: none;
  }
  /* the card's spans (brand, name, number), not the one inside the delete button (CardItemAction) */
  > span,
  > :not(${CardItemAction}) span {
    display: flex;
  }

  img {
    width: ${props => themeSize(props.theme, 'sm')};
    height: ${props => themeSize(props.theme, 'sm')};
    /* the brand mark keeps its ratio in this box (CardBrand's contain, restated
       here because this rule resizes the box) */
    object-fit: contain;
    ${props => blockStill(props.theme)}
  }

  .card-number {
    display: flex;
    align-items: center;
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}

    p {
      margin: 0;
      padding-inline-end: ${props => themeSpace(props.theme, 'xs')};
      font-weight: 900;
    }
    ${props => blockStill(props.theme)}
  }

  .payment-container {
    flex: 1;
    min-width: 0;
    ${props => blockStill(props.theme)}
  }

  .payment-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;

    span {
      ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 500 })}
    }
    ${props => blockStill(props.theme)}
  }

  .brand {
    margin-inline-end: ${props => themeSpace(props.theme, 'md')};
    flex-shrink: 0;
  }

  ${props => blockStill(props.theme)}
  /* the card's brand in an icon tile of the theme (md, outline) */
  .brand {
    ${props => iconTileCss(props.theme, { size: 'md', variant: 'outline' })}
  }
`
