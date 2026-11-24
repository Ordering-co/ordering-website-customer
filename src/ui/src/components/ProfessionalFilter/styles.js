import styled, { css } from 'styled-components'
import { headingText, themeSpace, themeText, themeSize } from '~/utils/themeTokens'

export const Container = styled.div`
  > h2 {
    ${props => headingText(props.theme, 'h2')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  }
`

export const ProfessionalItem = styled.div`
  display: flex;
  align-items: center;
  flex: 0 0 min(85%, 25ch);

  > svg {
    height: ${props => themeSize(props.theme, 'md')};
    width: ${props => themeSize(props.theme, 'md')};
    min-width: ${props => themeSize(props.theme, 'md')};
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
      margin-right: 0px;
    `}
  }

  > span {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin: 0px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  margin: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const ContentWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;
`

export const ProfessionalListing = styled.div`
  display: flex;
`
