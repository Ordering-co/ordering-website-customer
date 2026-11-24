import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themeRadius, themeSpace, themeIconSize, themeSize, themeText, themeValue, buttonStill } from '~/utils/themeTokens'
import { ProductGalleryArrow, galleryArrowOptions, productGutter } from '~ui/src/components/ProductForm/styles'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { KEYBOARD_OPEN_IN_FLOW } from '~ui/hooks/useKeyboardOpen'
import { dateStripDayAttrs, dateStripDayCss, dateStripNameCss, dateStripNumberCss } from '~ui/src/styles/Calendar'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

export const Container = styled.div`
  max-height: 100vh;
  max-height: 100dvh; /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  position: relative;
  @media (min-width: 1200px) {
    max-height: calc(70vh - ${props => themeSpace(props.theme, 'xl')});
    max-height: calc(70dvh - ${props => themeSpace(props.theme, 'xl')});
  }
`

export const ImageWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  width: 100%;
  position: relative;
`

export const SwiperWrapper = styled.div`
  position: relative;
  width: 100%;

  .mySwiper2 {
    width: 100%;

    .swiper-slide-active {
      border-radius: 0px;
      img {
        border-radius: 0px;
      }
    }
  }

  .swiper {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  .swiper-slide {
    background-size: cover;
    background-position: center;
  }
  .swiper-slide img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* the service's photo is 4:3 with cover at every width, like the product
     modal's gallery */
  .mySwiper2 {
    height: auto;
    max-height: none;
    aspect-ratio: 4 / 3;
  }
`

export const ServiceGalleryArrow = styled(ProductGalleryArrow)`
  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Move the painted square only when the centered hit target would be clipped. */
    /* touch-target */ --service-gallery-target: 44px;
    ${({ $side, theme }) => {
      const height = componentVars(theme, 'button', { ...galleryArrowOptions(theme), shape: 'icon' })['--ui-button-height']
      const inset = `max(${themeSpace(theme, 'sm')}, calc((var(--service-gallery-target) - ${height}) / 2))`
      return `inset-inline-${$side === 'prev' ? 'start' : 'end'}: ${inset};`
    }}
  }
`

export const HeaderInfoWrapper = styled.div`
  padding: ${props => themeSpace(props.theme, 'xl')} ${props => productGutter(props.theme)} ${props => themeSpace(props.theme, 'lg')};
  h2 {
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    ${props => headingText(props.theme, 'h2')}
  }
  p {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
    margin: 0px;
    color: ${props => themeColor(props.theme, 'text_muted')};
    white-space: pre-wrap;
  }
`

export const PriceAndDuration = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => themeSpace(props.theme, 'xs')};
  span {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'], weight: 400 })}
    &.dot {
      margin: 0px ${props => themeSpace(props.theme, 'xs')};
    }
  }
`

export const Divider = styled.div`
  /* components.divider band */
  ${props => dividerRules(props.theme, 'band')}
`

export const ProfessionalInfoWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  padding: 0px ${props => productGutter(props.theme)};
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  > h3 {
    ${props => headingText(props.theme, 'h3')}
    margin: 0px;
  }
  span {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    color: ${props => themeColor(props.theme, 'danger_text')};
  }
`

export const ScheduleWrapper = styled.div`
  padding: 0px ${props => productGutter(props.theme)};
  margin-top: ${props => themeSpace(props.theme, 'xxl')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  > div:last-child {
    padding: 0px;
  }
`

export const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  ${KEYBOARD_OPEN_IN_FLOW}
  /* of the dialog's background (components.modal) */
  background: ${({ theme }) => themeValue(theme, 'modal', 'base.background')};
  padding: ${props => themeSpace(props.theme, 'md')} ${props => productGutter(props.theme)} ${props => themeSpace(props.theme, 'xxl')};
  /* components.divider item */
  ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
  bottom: 0px;
  z-index: 11;

  /* the time (only the row's own span: not the label of the base Button) */
  > span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 500 })}
  }
`

// The slot of an action of the booking bar: the bar's width up to a measure of text (38ch, 25ch on a phone), no
// pointer while sold out; the Button inside fills it
export const BookingAction = styled.div`
  display: flex;
  /* the 38ch and 25ch are the Button's own characters */
  ${({ theme }) => controlMeasureCss(theme, 'button', { size: 'md' })}
  width: 100%;
  max-width: min(100%, 38ch);
  ${({ $soldout }) => $soldout && 'pointer-events: none;'}

  @media (max-width: 512px) {
    max-width: min(100%, 25ch);
  }
`

export const InfoWrapper = styled.span`
  display: flex;
  align-items: center;
  flex: 1;
`

export const NameWrapper = styled.span`
  margin-left: ${props => themeSpace(props.theme, 'xl')};
  flex: 1;
  ${props => props.theme.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'xl')};
    margin-left: 0px;
  `}
  .professional-name {
    display: block;
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin: 0px;
  }
`

export const StatusInfo = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  span {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
    &.status {
      color: ${props => themeColor(props.theme, 'danger_text')};
    }
  }

  ${({ available }) => available && css`
    span.status {
      color: ${props => themeColor(props.theme, 'success_text')};
    }
  `}
`

export const EmptyProfessional = styled.div`
  min-height: calc(1.8 * ${props => themeSize(props.theme, 'xl')});
  margin-bottom: calc(1.8 * ${props => themeSize(props.theme, 'xl')});
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const SkeletonBlock = styled.div`
  width: ${({ width }) => width && `${width}%`};
  border-radius: ${props => themeRadius(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'xxxl')} auto ${props => themeSpace(props.theme, 'xl')} auto;

  span {
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
  }
`

export const OrderTimeWrapper = styled.div``

export const DateWrapper = styled.div``

export const MonthYearLayer = styled.div`
  margin-top: 0px;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'line'] })}
  }
`

export const DaysSwiper = styled.div`
  width: 100%;
  position: relative;
  ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
  ${props => dividerLineCss(props.theme, 'item')}

  .swiper-datelist {
    padding: 0 ${props => themeIconSize(props.theme, 'md')}; /* room for the arrows (icon.md wide); lg (16) would put them over the days */
    .swiper-button-prev {
      background-image: url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='currentColor' stroke-width='0' viewBox='0 0 16 16' height='1em' width='1em' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.86 8.753l5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 00-1.659-.753l-5.48 4.796a1 1 0 000 1.506z'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: 100% auto;
      background-position: center;
      width: ${props => themeIconSize(props.theme, 'md')};
    }

    .swiper-button-prev::after {
      display: none;
    }
    .swiper-button-next {
      background-image: url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='currentColor' stroke-width='0' viewBox='0 0 16 16' height='1em' width='1em' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 011.659-.753l5.48 4.796a1 1 0 010 1.506z'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: 100% auto;
      background-position: center;
      width: ${props => themeIconSize(props.theme, 'md')};
    }

    .swiper-button-next::after {
      display: none;
    }

    .swiper-button-next, .swiper-container-rtl .swiper-button-prev {
      right: 0px;
      left: auto;
    }
    .swiper-button-prev, .swiper-container-rtl .swiper-button-next {
      left: 0px;
      right: auto;
    }
  }
`

// a day of components.date_strip, a button pressed when selected
export const Day = styled.div.attrs(dateStripDayAttrs)`
  display: flex;
  flex-grow: 1;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  ${props => buttonStill(props.theme)}
  ${({ theme, selected }) => dateStripDayCss(theme, selected)}
`

export const DayName = styled.div`
  display: flex;
  &:first-letter {
    text-transform: uppercase;
  }
  /* the name of components.date_strip */
  ${({ theme }) => dateStripNameCss(theme)}
`

export const DayNumber = styled.div`
  display: flex;
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 500 })}
  /* the number of components.date_strip */
  ${({ theme }) => dateStripNumberCss(theme)}
`

export const TimeListWrapper = styled.div`
  margin-inline-start: calc(-1 * ${props => themeSpace(props.theme, 'md')});
  width: calc(100% + 2 * ${props => themeSpace(props.theme, 'md')});
  margin-top: ${props => themeSpace(props.theme, 'xxl')};
  max-height: 30dvh;
  overflow: auto;
  /* components.menu */
  ${props => themePart(props.theme, 'menu', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
`

export const TimeGrid = styled(TimeListWrapper)`
  --service-time-cell-target: 0px;
  --service-time-columns: 2;
  --service-time-gap: calc(2 * ${props => themeSpace(props.theme, 'md')});
  /* Fit the touch area to the scrollport, up to the existing column limit. */
  --service-time-track: calc((100% - (var(--service-time-columns) - 1) * var(--service-time-gap)) / var(--service-time-columns));
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, max(var(--service-time-cell-target), var(--service-time-track))), 1fr));
  gap: var(--service-time-gap);
  box-sizing: border-box;
  padding: ${props => themeSpace(props.theme, 'md')};

  @media (min-width: 400px) {
    --service-time-columns: 3;
  }
  @media (min-width: 576px) {
    --service-time-columns: 4;
  }
  @media (min-width: 769px) {
    --service-time-columns: 6;
  }
  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Reserve the Chip's touch area inside the scrollport on both axes. */
    /* touch-target */ --service-time-cell-target: 44px;
  }
`

/* A busy time is still selectable; it is booking that is disabled. */
export const TimeCell = styled.div`
  display: grid;
  grid-template-rows: minmax(var(--service-time-cell-target), auto);
  align-content: start;
  align-items: center;
  row-gap: ${({ theme }) => themeSpace(theme, 'xxs')};
`

export const TimeAvailability = styled.span`
  text-align: center;
  overflow-wrap: anywhere;
  ${({ theme }) => themeText(theme, 'caption')}
  color: ${({ theme }) => themeColor(theme, 'text')};
`

export const ClosedBusinessMsg = styled.div`
  text-align: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  width: 100%;
`

export const GuestUserLink = ({ $loading, ...props }) => (
  <Button
    {...props}
    appearance='link'
    style={{
      margin: 'var(--ot-space-lg) var(--ot-space-md)',
      whiteSpace: 'nowrap',
      opacity: $loading ? 0.7 : undefined,
      pointerEvents: $loading ? 'none' : undefined
    }}
  />
)
