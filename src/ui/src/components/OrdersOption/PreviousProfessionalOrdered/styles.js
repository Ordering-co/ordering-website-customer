import styled, { css } from 'styled-components'
import { themeScrollbar, themeSpace } from '~/utils/themeTokens'

export const ProductsList = styled.div`
  display: flex;
  box-sizing: border-box;

  #autoscroll {
    > div {
      flex: 0 0 min(85%, 38ch);
    }
  }

  @media(min-width: 480px){
    #autoscroll {
      > div {
        flex-basis: min(85%, 44ch);
      }
    }
  }
`

export const ProductsListContainer = styled.div`
    margin-top: ${props => themeSpace(props.theme, 'md')};
    display: flex;
    overflow: scroll hidden;
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
