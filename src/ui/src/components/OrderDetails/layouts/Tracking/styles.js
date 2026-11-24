import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeBorderWidth, themeMedia, themePart, themeRadius, themeSize, themeSpace, themeText, themeValue, headingText, blockStill, pageGutter } from '~/utils/themeTokens'
import { motionCss } from '~/utils/themeMotion'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { focusRingCss } from '~ui/src/styles/Focus'
import { badgeCss } from '~ui/src/styles/Badge'
import { cardBoxCss } from '~ui/src/styles/Card'
import { layerBackground } from '~ui/src/styles/Layer'
import { getThemeCss, getThemeMobileCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'

/* A block of the tracking page (the canceled notice, a person, the tabs'
   panel) is a content container: components.card (its background, border,
   radius, shadow, font and padding). */
const trackingCard = (theme) => `${cardBoxCss(theme, 'card', { padding: true })}\nbox-sizing: border-box;`

/* The blocks under the header (the live map, the tabs, the customer's and
   the driver's cards; pages.order_details, group tracking) each with
   tokens.space.xl under it and none above, so they keep one space between
   them in any order. */
const trackingBlockSpace = (theme) => `margin-top: 0; margin-bottom: ${themeSpace(theme, 'xl')};`

/* A control drawn by hand (a product's accordion) is a real button with no
   box of its own and the focus ring of the theme. */
const bareButtonCss = (theme) => {
  return `
    &:focus-visible {
      ${focusRingCss(theme)}
    }
  `
}

/* The page: tokens.space.xl above and below, the page's side space
   (tokens.layout.page_gutter) at its sides. */
export const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${({ theme }) => themeSpace(theme, 'xl')} 0;
  overflow-x: hidden;
`

export const WrapperContainer = styled.div`
  width: 100%;
  padding: 0 ${({ theme }) => pageGutter(theme)}px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
`

export const HeaderContent = styled.div`
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xxl')};

  /* the page's title (an h1): the status, in its own typography */
  .order-status {
    text-align: center;
    margin: 0;
    padding: 0;
  }

  p.eta-range {
    margin: ${({ theme }) => themeSpace(theme, 'lg')} 0 0;
    text-align: left;
  }

  .delivery-pin {
    margin-top: ${({ theme }) => themeSpace(theme, 'lg')};
  }

  /* components.order_tracking, the status (status_text, its
     platforms.mobile_web value below 576px, status_color) and the delivery
     time (eta_text, eta_color) */
  ${({ theme }) => css`
    .order-status {
      ${themePart(theme, 'order_tracking', { text: 'base.status_text', color: 'base.status_color' })}
    }
    p.eta-range {
      ${themePart(theme, 'order_tracking', { text: 'base.eta_text', color: 'base.eta_color' })}
    }
    ${getThemeMobileCss(theme, 'order_tracking')?.base?.status_text && `
      @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px) {
        .order-status {
          ${getThemeMobileCss(theme, 'order_tracking').base.status_text.css}
        }
      }
    `}
  `}
`

// components.order_tracking.base as CSS (its view)
const trackingCss = (theme) => getThemeCss(theme, 'order_tracking').base

// The size of a stage of the bar in px, a number (components.order_tracking
// step_size)
const stageSize = (theme) => themeValue(theme, 'order_tracking', 'base.step_size')

/* The row of the bar: as tall as a stage (components.order_tracking
   step_size), so the stages centered on the bar stay inside it; md under the
   title. */
export const StatusBarContainer = styled.div`
  position: relative;
  margin-top: ${({ theme }) => themeSpace(theme, 'md')};
  min-height: ${({ theme }) => trackingCss(theme).step_size};
  /* the bar is components.progress inside (its height); the stage icons stay over it */
  display: flex;
  align-items: center;
`

/* The size of a stage of the bar (components.order_tracking step_size, a
   circle centered on its point) and of its icon (step_icon_size). */
export const stageSizeCss = (theme, position) => {
  const size = stageSize(theme)
  const icon = trackingCss(theme).step_icon_size
  return `
    width: ${size}px; height: ${size}px; left: calc(${position}% - ${size / 2}px);
    font-size: ${icon}; svg { width: ${icon}; height: ${icon}; }
  `
}

/* A stage of the bar, a circle over it (components.order_tracking): one
   reached is filled with step_active, its icon on_primary; one still to come
   is a ring of step_inactive on the page, its icon of that color, so it reads
   on the page as a control's border does. */
export const StageIcon = styled.span`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  box-sizing: border-box;
  border-radius: ${props => themeRadius(props.theme, 'full')};
  display: flex;
  justify-content: center;
  align-items: center;
  ${({ active, theme }) => active
    ? `
      background-color: ${trackingCss(theme).step_active};
      color: ${themeColor(theme, 'on_primary')};
    `
    : `
      background-color: ${layerBackground(theme)};
      color: ${trackingCss(theme).step_inactive};
      border: ${themeBorderWidth(theme, 'thin', { fixed: true })} solid
 ${trackingCss(theme).step_inactive};
    `}
  /* components.order_tracking step_size (the circle, centered
     on its point) and step_icon_size (its icon) */
  ${({ theme, position }) => stageSizeCss(theme, position)}
`

export const ReviewedText = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => themeSpace(theme, 'xl')} 0 0;

  p {
    ${({ theme }) => themeText(theme, 'label')}
    text-align: center;
  }
  ${props => trackingCard(props.theme)}
`

export const MapWrapper = styled.div`
  width: 100%;
  /* tokens.space.xxl over the map */
  margin-top: ${props => themeSpace(props.theme, 'xxl')};
`

export const MapBox = styled.div`
  margin-bottom: ${({ theme }) => themeSpace(theme, 'sm')};
  width: 100%;
  /* components.order_tracking map_height (the expanded map
     fills the screen) */
  ${props => themePart(props.theme, 'order_tracking', { height: 'base.map_height' })}

  > div {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const MapTrackingWrapper = styled.div`
  position: relative;
  width: 100%;
  ${props => trackingBlockSpace(props.theme)}
  ${({ expanded }) => !expanded && css`
    width: min(100vw, 225ch);
    max-width: 225ch;
    left: 50%;
    transform: translateX(-50%);
  `}
  ${({ expanded }) => expanded && css`
    position: fixed;
    inset: 0;
    z-index: 1050;
    width: 100vw;
    height: 100vh;
    background: ${props => themeColor(props.theme, 'surface')};
    display: flex;
    flex-direction: column;
    ${MapBox} {
      flex: 1;
      height: auto;
      margin-bottom: 0;
    }
  `}
`

/* The button of components.order_tracking slots.map_toggle under the map;
   map_toggle_expanded floating on the expanded map (set in the JSX). Only its
   place lives here: the map's block spaces what follows it. */
export const MapToggleLane = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0;

  ${({ expanded }) => expanded && css`
    position: absolute;
    /* over the map's own controls: two xxxl spaces above the safe area */
    bottom: calc(env(safe-area-inset-bottom, 0px) + 2 * ${({ theme }) => themeSpace(theme, 'xxxl')});
    left: 0;
    right: 0;
    width: fit-content;
    margin: 0 auto;
    z-index: 2;
  `}
`

export const InfoCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  p {
    margin: 0 0 ${({ theme }) => themeSpace(theme, 'xs')};
    color: ${props => themeColor(props.theme, 'text')};
    overflow-wrap: anywhere;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  /* the person's name (an h3 under the card's h2) */
  h3, h4 {
    ${props => headingText(props.theme, 'h4')}
    margin: 0 0 ${({ theme }) => themeSpace(theme, 'xs')};
  }
  /* components.card */
  ${props => trackingCard(props.theme)}
  ${props => trackingBlockSpace(props.theme)}
`

export const SectionTitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* the card's title (an h2), in the h3 typography */
  h2, h3 {
    ${props => headingText(props.theme, 'h3')}
    margin: 0 0 ${({ theme }) => themeSpace(theme, 'xs')};
  }
`

export const PersonRow = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  /* the person's avatar (components.avatar) xl apart from the texts */
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'lg')};
  padding-top: ${props => themeSpace(props.theme, 'sm')};
`

export const SkeletonCenter = styled.div`
  display: flex;
  justify-content: center;
`

export const TabsContainer = styled.div`
  width: 100%;
  /* the bar over its panel (a card), md apart */
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  ${props => trackingBlockSpace(props.theme)}
`

export const Panel = styled.div`
  ${props => trackingCard(props.theme)}
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
  ${props => dividerLineCss(props.theme, 'item')}

  .label {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 700 })}
    color: ${({ theme }) => themeColor(theme, 'text')};
    margin-bottom: ${props => themeSpace(props.theme, 'xxs')};
  }

  .value {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
  }
`

export const DriverRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => themeSpace(theme, 'md')} 0 ${({ theme }) => themeSpace(theme, 'xs')};

  .info {
    display: flex;
    align-items: center;
    gap: ${props => themeSpace(props.theme, 'md')};
  }

  .texts {
    /* the driver name: a line of text, not a heading */
    .name {
      margin: 0;
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }

    p {
      margin: ${props => themeSpace(props.theme, 'xxs')} 0 0;
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      color: ${({ theme }) => themeColor(theme, 'text_muted')};
    }
  }
`

// The label of a summary row: text, not a heading
export const SummaryTitle = styled.p`
  margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 700 })}
`

export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}

  &.total {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 700 })}
    ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    padding-top: ${props => themeSpace(props.theme, 'md')};
  }
`

export const ProductsBlock = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  overflow-x: hidden;
  ${({ scroll }) => scroll && css`
    overflow-y: auto;
  `}
`

export const PaymentBlock = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  padding-top: ${props => themeSpace(props.theme, 'lg')};

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }
`

export const OrderNoteBlock = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'lg')};

  &:first-child {
    margin-top: 0;
  }

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
`

export const SurveyContainer = styled.div`
  width: 100%;
  margin: ${props => themeSpace(props.theme, 'sm')} 0 ${props => themeSpace(props.theme, 'xl')};
`

export const IntroWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xl')};
`

export const BagImage = styled.img`
  width: ${({ theme }) => themeMedia(theme, '2xl')};
  max-width: 55%;
  height: auto;
  margin: ${props => themeSpace(props.theme, 'sm')} 0 ${props => themeSpace(props.theme, 'lg')};
  object-fit: contain;
`

export const IntroText = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  margin: 0 0 ${props => themeSpace(props.theme, 'lg')};
  max-width: min(100%, 52ch);

  &.highlight {
    color: ${({ theme }) => primaryText(theme)};
    font-weight: 600;
  }
`

/* The row of "Not now" / "Skip survey" (a link Button of components.link,
   muted, set in the JSX), lg under what comes before it. */
export const SkipRow = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  text-align: center;
`

export const QuestionsWrapper = styled.div`
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'xs')};
`

export const QuestionBlock = styled.div`
  padding: ${props => themeSpace(props.theme, 'lg')} 0;
  ${props => dividerLineCss(props.theme, 'item')}

  &:last-of-type {
    border-bottom: none;
  }
`

/* The group a question belongs to, over it: the caption role (its letter
   spacing and case too, when the theme gives them) */
export const QuestionLabel = styled.div`
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'letter_spacing', 'transform'], weight: 700 })}
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  margin-bottom: ${props => themeSpace(props.theme, 'xs')};
`

// a question of the survey: a section of the page (h2), in the h4 typography
export const QuestionTitle = styled.h2`
  margin: 0 0 ${props => themeSpace(props.theme, 'md')};
  ${props => headingText(props.theme, 'h4')}
  color: ${({ theme }) => themeColor(theme, 'text')};
`

// The two answers of the delivery (a group of radios), lg apart
export const Thumbs = styled.div`
  display: flex;
  gap: ${props => themeSpace(props.theme, 'lg')};
`

export const SubQuestion = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'md')};

  p.sub-title {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
    color: ${({ theme }) => themeColor(theme, 'text')};
  }
`

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'sm')};
`

/* The optional comment of a question: a textarea of components.input, as
   wide as the question, md under its chips. */
export const CommentField = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'md')};
`

export const SurveyHint = styled.p`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  text-align: center;
  margin: ${props => themeSpace(props.theme, 'md')} 0 0;

  &.error {
    color: ${({ theme }) => themeColor(theme, 'danger_text')};
  }
`

/* The button of components.order_tracking slots.survey_submit (set in the
   JSX), full width. */
export const SubmitLane = styled.div`
  width: 100%;
  margin-top: ${props => themeSpace(props.theme, 'lg')};
`

export const ProductSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
  background: ${props => themeColor(props.theme, 'surface')};
  ${props => dividerLineCss(props.theme, 'item')}
`

/* The header of a product: a button that opens its details when it has
   them (else a plain row), sm in from the sides of its row. */
export const ProductAccordion = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: calc(100% - 2 * ${({ theme }) => themeSpace(theme, 'sm')});
  margin: 0 ${({ theme }) => themeSpace(theme, 'sm')};
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: ${({ clickable }) => clickable ? 'pointer' : 'default'};
  position: relative;
  ${props => bareButtonCss(props.theme)}

  /* the chevron (ChevronIcon) at the row's end */
  .accordion__icon {
    margin-inline-start: auto;
  }

  @media (min-width: 411px) {
    flex-direction: row;
  }
  ${props => blockStill(props.theme)}
`

/* The product's quantity, photo, texts and price in a row, sm apart; the
   price at its end. */
export const ProductInfo = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  overflow: hidden;
`

export const ProductImageWrapper = styled.span`
  display: block;
  flex-shrink: 0;
  max-width: ${props => themeSize(props.theme, 'lg')};
  max-height: ${props => themeSize(props.theme, 'lg')};
  height: ${props => themeSize(props.theme, 'lg')};
  width: ${props => themeSize(props.theme, 'lg')};

  @media (min-width: 361px) {
    max-width: ${props => themeSize(props.theme, 'xl')};
    max-height: ${props => themeSize(props.theme, 'xl')};
    height: ${props => themeSize(props.theme, 'xl')};
    width: ${props => themeSize(props.theme, 'xl')};
  }

  @media (min-width: 411px) {
    max-width: ${props => themeMedia(props.theme, '3xs')};
    max-height: ${props => themeMedia(props.theme, '3xs')};
    height: ${props => themeMedia(props.theme, '3xs')};
    width: ${props => themeMedia(props.theme, '3xs')};
  }
`

export const ProductImage = styled.span`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: contain;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
`

/* The quantity: a count of components.badge (neutral, md), its weight kept */
export const ProductQuantity = styled.span`
  align-self: flex-start;
  ${props => badgeCss(props.theme, { variant: 'neutral', size: 'md', count: true, weight: 600 })}
`

export const ProductContentInfo = styled.span`
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-transform: capitalize;
  flex: 1;
  min-width: 0;

  /* the product name: a line of text, not a heading */
  .product-name {
    display: block;
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
  }

  .comment {
    display: block;
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    overflow-wrap: break-word;
  }
`

// The product's price at the end of its row; a discount shows the old one struck
export const ProductPrice = styled.span`
  flex-shrink: 0;
  white-space: nowrap;
  text-align: end;
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 700 })}
  color: ${({ theme }) => themeColor(theme, 'text')};

  s {
    color: ${props => themeColor(props.theme, 'text_muted')};
    ${props => themeText(props.theme, 'body', { props: ['weight'] })}
    margin-inline-end: ${props => themeSpace(props.theme, 'xs')};
  }
`

export const ProductAccordionContent = styled.div`
  overflow: hidden;
  /* as components.accordion (animated / speed), else at once */
  ${props => motionCss(props.theme, 'accordion', ['max-height'])}
  width: 100%;
  margin: auto;

  @media (min-width: 481px) {
    width: 80%;
  }
`

/* The ingredients left out, the options and the toppings removed: their
   titles in the body role, each choice under them in the body role and the
   muted color. */
export const ProductOptionsList = styled.ul`
  list-style-type: none;

  .suboption {
    margin-inline-start: -${props => themeSpace(props.theme, 'xl')};
  }

  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'] })}
    margin: 0;
  }

  li span {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  li.ingredient {
    padding-inline-start: ${props => themeSpace(props.theme, 'lg')};
  }
`
