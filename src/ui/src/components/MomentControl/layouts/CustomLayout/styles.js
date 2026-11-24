import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { calendarCss } from '~ui/src/styles/Calendar'

export const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: ${({ theme }) => themeSpace(theme, 'xl')};
    > div {
      width: calc((100% - ${({ theme }) => themeSpace(theme, 'xl')}) / 2);
    }
  }
`
// a panel beside the times' one; the calendar in it is the theme's
// (components.calendar)
export const CalendarWrapper = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'lg')};
  border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
  box-sizing: border-box;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  ${({ theme }) => calendarCss(theme)}
`
export const TimeListWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  max-height: 50dvh;
  overflow: auto;
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'lg')};
  border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
  box-sizing: border-box;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  margin-top: ${props => themeSpace(props.theme, 'xl')};

  @media (min-width: 768px) {
    margin-top: 0;
  }
`

export const TimeItem = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${props => themeColor(props.theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'md')};
  width: calc(50% - 2 * ${props => themeSpace(props.theme, 'md')});
  min-width: calc(50% - 2 * ${props => themeSpace(props.theme, 'md')});
  box-sizing: border-box;
  user-select: none;

  ${({ active }) => active && css`
    background: ${props => themeColor(props.theme, 'primary_subtle')};
    color: ${props => primaryText(props.theme)};
  `}

  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    white-space: nowrap;
  }
`
export const ClosedBusinessMsg = styled.div`
  text-align: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  width: 100%;
`
