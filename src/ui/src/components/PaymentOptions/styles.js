import styled from 'styled-components'
import { themeIconSize, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'

export const PaymentMethodsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

/* A single choice list (components.choice), the width of its container */
export const PaymentMethodsList = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
  width: 100%;
`

/* Clipped out of the flow without letting a long announcement widen the page. */
export const PaymentMethodsStatus = styled.span`
  position: absolute;
  max-width: 100%;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

/* The method's logo or icon inside its option, in the option's color */
export const PayChoiceLogo = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ theme }) => themeSize(theme, 'md')};
  height: ${({ theme }) => themeSize(theme, 'sm')};

  > img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  > svg {
    font-size: ${props => themeIconSize(props.theme, 'lg')};
    path {
      fill: currentColor;
    }
  }
`

export const Container = styled.div`
  margin: 0 auto;
`

export const PayCardSelected = styled.div`
  /* tokens.space.lg under the list of methods */
  padding: ${props => themeSpace(props.theme, 'lg')} 0 0;
`

/* The details of Stripe Redirect once filled, inside its option
   (components.choice sets the color): the method on a line, the account
   holder and the email under it in the theme's caption */
export const RedirectDetails = styled.span`
  display: flex;
  flex-direction: column;

  && small {
    ${({ theme }) => themeText(theme, 'caption')}
    color: inherit;
  }
`
