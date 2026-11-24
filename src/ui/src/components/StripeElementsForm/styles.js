import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeText } from '~/utils/themeTokens'

/* a message, not a title (as PaymentOptionStripe's warning) */
export const ErrorMessage = styled.p`
  color: ${props => themeColor(props.theme, 'danger_text')};
  ${props => themeText(props.theme, 'body_lg')}
  padding: 0;
`
