import styled from 'styled-components'
import { themePart, themeSpace, themeText, headingText } from '~/utils/themeTokens'
import { fieldGap, fieldMessageCss } from '~ui/src/styles/Field'
import { themeColor } from '~/utils/themeColors'

/* The redeem: its title outside a modal (in one, the modal's row shows it),
   tokens.space.xl over each action, as every form of the payments */
export const Container = styled.div`
  h2 {
    ${props => headingText(props.theme, 'h2')}
    text-align: start;
    margin-top: 0;
    /* tokens.space.xxxl below */
    margin-bottom: ${props => themeSpace(props.theme, 'xxxl')};
  }
`

/* The form: the action tokens.space.xl from the last field (its gap and
   this sm) */
export const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
`

/* The submit: tokens.space.sm under the last field's gap (xl in all) */
export const FormAction = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'sm')};
`

/* The OK of the redeemed gift card: tokens.space.xl over it */
export const InfoAction = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`

/* A field (its label above it when the theme says so: LabeledField) and
   its error, components.field's gap from the next one (the form rhythm) */
export const FormController = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => fieldGap(props.theme)};
`

/* The error of a field, under it: components.field's error text and color */
export const FieldError = styled.p`
  ${props => fieldMessageCss(props.theme, { error: true })}
`

/* The redeemed gift card: a content container (components.card), still (it
   cannot be touched), tokens.space.lg inside */
export const GiftCardInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  ${({ theme }) => `
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    padding: ${themeSpace(theme, 'lg')};
  `}

  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: ${props => themeSpace(props.theme, 'xs')} 0;
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`
