import styled, { css } from 'styled-components'
import { themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'

export const Container = styled.div`
  width: 100%;
  /* tokens.space.lg under the tabs */
  margin-top: ${props => themeSpace(props.theme, 'lg')};
`

/* the action of a method, of the row's width (the button is fullWidth); while the
   method loads it answers no pointer */
export const ActionSlot = styled.div`
  width: 100%;
  ${({ $isLoading }) => $isLoading && css`
    pointer-events: none;
  `}
`

export const PaymentSquareContainer = styled.div`
  min-height: calc(2.7 * ${props => themeSize(props.theme, 'xl')});
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

/* What stopped the attempt (the order is being confirmed, or could not be read), under the actions */
export const Notice = styled.p`
  margin: ${props => themeSpace(props.theme, 'md')} 0 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`
