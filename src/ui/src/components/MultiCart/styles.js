import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { srOnlyCss } from '~ui/src/styles/Rules'

/* The placeholder of a column: its groups md apart (the lines of a group
   together). */
export const SkeletonColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const SkeletonGroup = styled.div`
  display: flex;
  flex-direction: column;
`

/* What the page is doing, for assistive technology only. */
export const LoadingStatus = styled.p`
  ${srOnlyCss}
`
