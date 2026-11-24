import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { stepMarkerCss } from '~ui/src/styles/Steps'

// The three steps: a sequence, so an ordered list and numbered markers
export const Steps = styled.ol`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
  margin: 0;
  padding: 0;
  list-style: none;
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

export const Step = styled.li`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// the marker of components.steps in its active state
export const Marker = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  ${({ theme }) => stepMarkerCss(theme, { state: 'active', size: 'md' })}
`

export const StepTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'h4')}
`

export const StepText = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body')}
`
