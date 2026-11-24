import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { fieldActionsGap, fieldGap, fieldLabelCss, fieldMessageCss } from '~ui/src/styles/Field'

/* A field of the form: its label the label of components.field, its
   label_gap over the control. */
const fieldCss = ({ theme }) => css`
  label {
    display: block;
    ${fieldLabelCss(theme)}
  }
`

export const FormStripe = styled.form`
  display: flex;
  flex-direction: column;
`

export const CardZipcodeField = styled.div`
  color: ${props => themeColor(props.theme, 'text_muted')};
  ${fieldCss}
`

export const CardExpiryCvcField = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: ${props => fieldGap(props.theme)};
`

export const FormRow = styled.div`
  /* the fields components.field's gap apart (the form rhythm) */
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${fieldGap(theme)};
  `}
`

export const ErrorMessage = styled.div`
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 'bold' })}
  margin-top: ${props => themeSpace(props.theme, 'md')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  color: ${props => themeColor(props.theme, 'danger_text')};
  margin: ${props => themeSpace(props.theme, 'md')} 0px 0px ${props => themeSpace(props.theme, 'md')};
  ${props => props.theme?.rtl && css`
    margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} 0px 0px;
  `}
  /* the error under a field, the error text of components.field, its
     message_gap under it; nothing while there is no error */
  ${({ theme }) => css`
    ${fieldMessageCss(theme, { error: true })}
    &:empty {
      display: none;
    }
  `}
`

export const FormActions = styled.div`
  width: 100%;
  /* components.field's actions_gap over the action */
  margin-top: ${props => fieldActionsGap(props.theme)};
`
