import styled, { css } from 'styled-components'
import { themeScrollbar, themeSpace } from '~/utils/themeTokens'

export const BusinessListWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;

  ${({ isLoading }) => isLoading
? css`
    ::-webkit-scrollbar {
        width: 0px;
        height: 0px;
    }
  `
: css`
      /* the theme's scrollbar (tokens.scrollbar.size) */
      ::-webkit-scrollbar {
          width: ${props => themeScrollbar(props.theme).size};
          height: ${props => themeScrollbar(props.theme).size};
      }
  `}
`

export const BusinessList = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  align-items: center;
  ${({ noResults }) => noResults && css`
    justify-content: center;
  `}
  @media (min-width: 480px){
    flex-direction: row;
  }
  ${({ horizontal }) => horizontal && css`
    /* a card of the carousel: a share of the row, never wider than a line of text */
    #searchlistorder {
      > div {
        flex: 0 0 min(85%, 36ch);
      }
    }
  `}
  .vertical {
    padding: ${props => themeSpace(props.theme, 'xs')} 0;
    width: 100%;

    > div {
      padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
    }
  }
`
