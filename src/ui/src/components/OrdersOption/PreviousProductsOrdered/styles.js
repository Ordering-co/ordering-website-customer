import styled, { css } from 'styled-components'
import { themeScrollbar, themeSpace } from '~/utils/themeTokens'

export const ProductsList = styled.div`
  display: flex;
  box-sizing: border-box;
  width: 100%;
  .product-card {
    ${({ horizontal }) => horizontal
? css`
      flex: 0 0 min(85%, 34ch) !important;
    `
: css`
      width: auto !important;
      max-width: none !important;
    `}
    margin: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'md')} !important;
    /* its background is the one of components.product_card */
  }

  .vertical {
    width: 100%;
  }
`

export const ProductsListContainer = styled.div`
    margin-top: ${props => themeSpace(props.theme, 'md')};
    display: flex;
    overflow: ${({ horizontal }) => horizontal ? 'scroll hidden' : 'hidden'};
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
