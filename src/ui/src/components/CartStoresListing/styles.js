import styled, { css } from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  padding: 0 ${props => themeSpace(props.theme, 'xs')};
`

export const ItemListing = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  margin: ${props => themeSpace(props.theme, 'xl')} 0 0;
`

export const WrapperSearch = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;

  .search-bar {
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
      margin-right: 0;
    `}
    .search-field {
      width: 100%;
    }
  }

  div:last-child {
    text-align: right;

    ${props => props.theme?.rtl && css`
      text-align: left;
    `}
  }
`
