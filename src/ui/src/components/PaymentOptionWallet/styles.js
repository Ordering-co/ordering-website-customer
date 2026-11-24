import styled from 'styled-components'
import { blockStill, themeSpace } from '~/utils/themeTokens'

export const SectionWrapper = styled.div`
  padding-top: ${props => themeSpace(props.theme, 'sm')};
  display: flex;
  flex-direction: column;
  ${props => blockStill(props.theme)}
`
