import styled, { css } from 'styled-components'
import { headingText, themeSpace } from '~/utils/themeTokens'

export const TaxInformationContainer = styled.div`
  h3{
    ${props => headingText(props.theme, 'h3')}
  }
  h4{
    ${props => headingText(props.theme, 'h4')}
  }
  /* the description and the products' title start where the
     modal's title does (no centering, no side margin): the description one
     xl over the rest, the title md over its products */
  ${({ theme }) => css`
    h3 {
      text-align: start;
      margin: 0 0 ${themeSpace(theme, 'xl')};
    }
    h4 {
      margin: 0 0 ${themeSpace(theme, 'md')};
    }
  `}
`

export const ProductContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  /* the products one under the other, the whole width of the
     modal's content (lined up with its title), md apart; each card keeps its
     own padding and border (components.product_card, no frame of its own)
     and its shadow falls in the modal's padding, not clipped */
  ${({ theme }) => css`
    flex-direction: column;
    flex-wrap: nowrap;
    gap: ${themeSpace(theme, 'md')};
    && > div {
      width: 100%;
      margin: 0;
      cursor: initial;
    }
  `}
`
