import styled from 'styled-components'
import { fieldLabelCss, fieldMessageCss } from '~ui/src/styles/Field'
import { themeSpace } from '~/utils/themeTokens'

export const PaymentCashContainer = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'xl')} 0px 0px;
`

export const FormCash = styled.div`
  display: flex;
  flex-direction: column;

  /* the field's label is components.field's at every width, its label_gap
     over its field */
  align-items: stretch;
  &&& > label {
    display: block;
    ${({ theme }) => fieldLabelCss(theme)}
  }
`

export const WrapperInput = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;

  /* the touch redirect below sits under the field, not over it */
  isolation: isolate;

  @media (pointer: coarse) {
    /* touch-target */ min-block-size: 44px;
  }
`

// Redirect touches above and below the painted field to the native input.
export const CashFieldHit = styled.label`
  display: none;

  @media (pointer: coarse) {
    display: block;
    position: absolute;
    z-index: -1;
    inset: 0;
    cursor: text;
  }
`

/* the error under a field, the error text of components.field, its
   message_gap under it, at every width */
export const ErrorText = styled.p`
  &&& {
    ${({ theme }) => fieldMessageCss(theme, { error: true })}
  }
`
