import styled from 'styled-components'

export const BusinessSearch = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`

export const SearchFieldWidth = styled.div`
  width: 100%;
  min-width: 0;

  @media (min-width: 681px) {
    width: ${props => props.$wide ? '80%' : '50%'};
  }
  @media (min-width: 1390px) {
    width: 100%;
  }
`
