import { getThemeCss } from '~/utils/themeCss'
import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'

export const Container = styled.div`
`
/* A single choice list (components.choice), as the checkout's
   (PaymentOptions): its options choice's gap apart, the width of its container */
export const PaymethodsListContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
  width: 100%;
  margin-left: 0;
`
export const WalletPaymentOptionContainer = styled.div`
  /* tokens.space.lg under the list of methods (as the card picked) */
  padding-top: ${props => themeSpace(props.theme, 'lg')};
`
