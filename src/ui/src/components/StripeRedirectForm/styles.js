import styled, { css } from 'styled-components'
import { themeRadius, themeShadow, themeSpace, themeValue, blockStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { fieldGap, fieldLabelCss, fieldMessageCss } from '~ui/src/styles/Field'

export const FormRedirect = styled.form`
  display: flex;
  flex-direction: column;

  .StripeElement,
  .StripeElementIdeal {
    display: block;
    margin: 0 ${props => themeSpace(props.theme, 'md')};
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'md')};
    box-shadow: ${props => themeShadow(props.theme, 'sm')};
    border-radius: ${props => themeRadius(props.theme, 'xs')};
    /* a field: the background of components.input */
    background: ${props => themeValue(props.theme, 'input', 'base.background')};
  }

  .StripeElement--focus,
  .StripeElementIdeal--focus {
    box-shadow: ${props => themeShadow(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }

  .StripeElement.loading {
    height: ${props => getThemeCss(props.theme, 'input').sizes.md.height};
    opacity: 0.6;
  }

  .StripeElementIdeal {
    padding: 0;
  }

  /* the fields tokens.space.md apart (the form rhythm), nothing at the side */
  ${({ theme }) => css`
    padding: 0;
    gap: ${fieldGap(theme)};
  `}
`

/* the action md further than the fields (xl in all, as the card form's), of the
   form's width (the button is fullWidth) */
export const SubmitRow = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'md')};
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;

  /* the label of components.field, its label_gap over its
     field */
  ${({ theme }) => css`
    margin-bottom: 0;
    label {
      display: block;
      ${fieldLabelCss(theme)}
    }
  `}
`

export const ErrorMessage = styled.p`
  /* the error under a field, the error text of
     components.field, its message_gap under it */
  ${({ theme }) => css`
    ${fieldMessageCss(theme, { error: true })}
  `}
`
