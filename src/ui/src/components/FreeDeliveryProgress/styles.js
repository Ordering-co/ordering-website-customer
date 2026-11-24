import styled from 'styled-components'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { alertRules } from '~ui/src/styles/Alert'

/* an alert of the theme (components.alert), success once unlocked and info
   before, its content centered; its roles are the ones of the markup (a
   status when it changes) */
export const Wrapper = styled.div`
  ${({ theme, $unlocked }) => alertRules(theme, $unlocked ? 'success' : 'info')}
  && { align-items: center; }
`

export const Content = styled.div`
  min-width: 0;
  flex: 1;
`

export const ProgressDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${props => themeSpace(props.theme, 'md')};
  /* the theme's sm above the bar */
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
`

export const Message = styled.span`
  flex: 1 1 18ch;
  color: inherit;
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight', 'line'], weight: 600 })}
`

export const Amounts = styled.span`
  flex: 0 0 auto;
  color: inherit;
  ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
`
