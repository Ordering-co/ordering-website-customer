import styled, { css } from 'styled-components'
import { themeColor, withAlpha } from '~/utils/themeColors'
import { headingText, themeBorderStyle, themeBorderWidth, themeFontFamily, themePart, themeSpace, themeSize, themeText, buttonStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { dateStripDayCss, dateStripNameCss, dateStripNumberCss } from '~ui/src/styles/Calendar'
import { layerBackground } from '~ui/src/styles/Layer'

/* A day of a days swiper is a button in the text color; the selected one
   takes the primary's light fill and the primary; the keyboard focus the
   theme's focus ring. */
export const day = (theme, selected) => css`
  /* the colors, rounding, border and space of components.date_strip; hovered
     it stays as at rest (the theme has no hover for a day) */
  ${dateStripDayCss(theme, selected)}
`

// The attributes of a day (a button, pressed when selected)
export const dayAttrs = ({ selected }) => ({ as: 'button', type: 'button', 'aria-pressed': !!selected })

// Out of a modal (a popover) the title is the h2 of the theme, a section's
// space over the choices (in a modal it goes to the modal's row)
export const Title = styled.h2`
  color: ${props => themeColor(props.theme, 'text')};
  ${({ theme }) => headingText(theme, 'h2')}
  margin: 0 0 ${({ theme }) => themeSpace(theme, 'xl')};
  text-align: start;

  @media (max-width: 450px) {
    ${props => props.theme.rtl && css`
      padding-right: ${props => themeSpace(props.theme, 'xxl')};
      padding-left: 0;
    `}
  }
`

// The delivery time options, as far apart as the options of
// every choice list (components.choice.base.gap), and a section's space below
export const MomentChoices = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const TimeListWrapper = styled.div`
  font-family: ${props => themeFontFamily(props.theme, 'body')};
  display: flex;
  flex-direction: column;
  margin: ${props => themeSpace(props.theme, 'xxs')};
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  /* components.menu */
  ${props => themePart(props.theme, 'menu', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
`

export const ButtonWrapper = styled.div`
  display: flex;
  position: sticky;
  bottom: 0;
  z-index: 1;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
  padding-top: ${({ theme }) => themeSpace(theme, 'md')};
  background: ${props => layerBackground(props.theme)};
`

export const OrderTimeWrapper = styled.div`
  /* "Order time" is a heading of the theme (a section of the
     moment), a small space over its steps */
  > h2, > h3, > h4 {
    ${({ theme }) => headingText(theme, 'h3')}
    margin: 0 0 ${({ theme }) => themeSpace(theme, 'sm')};
  }
`

export const Day = styled.div.attrs(dayAttrs)`
  display: flex;
  flex-grow: 1;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  ${props => buttonStill(props.theme)}
  ${({ theme, selected }) => day(theme, selected)}
`

export const DayName = styled.div`
  display: flex;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  &:first-letter {
    text-transform: uppercase;
  }

  ${({ isAppoint }) => isAppoint && css`
    ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
  `}
  /* the name of components.date_strip (an appointment keeps its caption) */
  ${({ theme, isAppoint }) => !isAppoint && dateStripNameCss(theme)}
`

export const DayNumber = styled.div`
  display: flex;
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 500 })}

  ${({ isAppoint }) => isAppoint && css`
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 400 })}
  `}
  /* the number of components.date_strip (an appointment keeps its body_lg) */
  ${({ theme, isAppoint }) => !isAppoint && dateStripNumberCss(theme)}
`

export const TimeItem = styled.div`
  cursor: pointer;
  display: flex;
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xxl')};
  /* components.divider item, on one edge only (adjacent rows
     would draw a 2px line between them) */
  ${props => dividerLineCss(props.theme, 'item')}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${props => withAlpha(themeColor(props.theme, 'primary'), 0.12)};
      opacity: 0.8;
    }
  }

  span {
    width: 100%;
    display: flex;
    align-items: center;
    ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
    justify-content: ${props => props?.is12hours ? 'space-between' : 'center'};

    .time-container {
      display: flex;
      align-items: center;
      gap: ${props => themeSpace(props.theme, 'sm')};

      p#hours, p#minutes {
        margin: 0;
        padding: 0 ${props => themeSpace(props.theme, 'xs')};
      }

      p#separator {
        margin: 0;
        padding: 0 ${props => themeSpace(props.theme, 'xs')};
      }
    }

    p#period {
      margin: 0;
    }
  }

  ${({ active }) => active && css`
    background: ${props => themeColor(props.theme, 'primary')};
    border-color: ${props => themeColor(props.theme, 'primary')};
    color: ${props => themeColor(props.theme, 'on_primary')};

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        background: ${props => themeColor(props.theme, 'primary')};
        opacity: 1;
      }
    }
  `}

  ${({ isDisabled }) => isDisabled && css`
    pointer-events: none;
    opacity: 0.7;
  `}

  ${({ cateringPreorder }) => cateringPreorder && css`
    background: ${props => layerBackground(props.theme)};
    width: 100%;
    min-width: 100%;
    height: ${props => themeSize(props.theme, 'lg')};
    margin: 0;
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};

    span {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
      display: flex;
      align-items: center;
      margin: ${props => themeSpace(props.theme, 'md')} 0;
      margin-left: ${props => themeSpace(props.theme, 'lg')};
      p{
        position: relative;
        bottom: ${props => themeSpace(props.theme, 'xxs')};
      }
    }
    ${({ active }) => active && css`
      background: ${props => themeColor(props.theme, 'primary')};
      color: ${props => themeColor(props.theme, 'on_primary')};
      border-color: ${props => themeColor(props.theme, 'primary')};
      span {
        p{
          bottom: 0;
          margin-left: ${props => themeSpace(props.theme, 'xxs')};
        }
      }
    `}
  `}

  ${({ isAppoint }) => isAppoint && css`
    @media (min-width: 769px) {
      span {
        ${props => themeText(props.theme, 'caption', { props: ['size'] })}
      }
    }
  `}
  ${props => buttonStill(props.theme)}
`

export const ClosedBusinessMsg = styled.div`
  text-align: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  width: 100%;
`

export const Divider = styled.div`
  /* components.divider section (its line, its spacing around) */
  ${props => dividerRules(props.theme, 'section')}
`

export const ScheduleBody = styled.div`
  overflow: visible;
`
