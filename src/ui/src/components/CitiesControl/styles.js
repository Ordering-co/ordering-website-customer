import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themeSpace } from '~/utils/themeTokens'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { modalTheme } from '../Overlay/modalTheme'

export const Container = styled.div`
  padding: ${({ theme }) => themeSpace(theme, 'xl')};
`

// The cities, options of components.choice (the choice gap apart, as every choice list)
export const CityChoices = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

export const CityChoiceRow = styled.div`
  display: flex;
  align-items: center;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Keep the full Choice touch area in its own row even when the gap is zero. */
    /* touch-target */
    min-block-size: 44px;
  }
`

export const ButtonWrapper = styled.div`
  position: sticky;
  bottom: 0;
  background: ${props => themeColor(props.theme, 'surface')};
  /* the list's sides */
  padding: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'xl')} ${themeSpace(theme, 'xl')}`};
`

export const SearchBarContainer = styled.div`
  margin-bottom: ${({ theme }) => themeSpace(theme, 'lg')};
`

export const CityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  margin-top: ${({ theme }) => themeSpace(theme, 'xxxl')};
  margin-bottom: ${({ theme }) => modalTheme(theme).gap};

  @media (min-width: 450px) {
    margin-top: 0;
  }
`

export const CityTitle = styled.h2`
  ${({ theme }) => headingText(theme, 'h2')}
  text-align: left;
  color: ${({ theme }) => themeColor(theme, 'text')};
  opacity: 1;
  margin: 0;
  flex: 1;
  &::first-letter {
    text-transform: capitalize;
  }
  ${({ theme }) => themePart(theme, 'modal', { text: 'base.title' })}
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
`
