import styled, { css } from 'styled-components'
import { themeScrollbar, themeSpace } from '~/utils/themeTokens'

export const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`
export const CardsContainer = styled.div`
  display: flex;
  ${({ isBusinessesPage }) => isBusinessesPage && css`
    box-sizing: border-box;
  `}
`

export const CardsContainerWrapper = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
  display: flex;
  overflow: auto hidden;
  ${({ isBusinessesPage }) => isBusinessesPage && css`
    overflow: scroll hidden;
    width: 100%;
  `}
  /* the theme's scrollbar (tokens.scrollbar.size) */
  ::-webkit-scrollbar {
    width: ${props => themeScrollbar(props.theme).size};
    height: ${props => themeScrollbar(props.theme).size};
  }
  ${({ isLoading }) => isLoading && css`
    ::-webkit-scrollbar {
      width: 0px;
      height: 0px;
    }
  `}
`
