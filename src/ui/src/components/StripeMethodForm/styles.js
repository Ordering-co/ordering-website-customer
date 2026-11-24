import styled from 'styled-components'
import { themeSize } from '~/utils/themeTokens'

export const Container = styled.div`
  width: 100%;
  span {
    width: 100%;
    height: ${props => themeSize(props.theme, 'sm')};
  }
`
