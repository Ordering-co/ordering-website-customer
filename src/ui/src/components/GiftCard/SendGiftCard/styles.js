import styled from 'styled-components'
import { themePart, themeSpace, headingText } from '~/utils/themeTokens'
import { fieldGap, fieldMessageCss } from '~ui/src/styles/Field'

/* A content container (components.card) as the other blocks of the order's
   page, still (it cannot be touched): tokens.space.lg inside (xl from
   768px), its title (an h2 with the h3 look) tokens.space.xl over the fields,
   the action tokens.space.xl under them (the last field's gap and sm) */
export const Container = styled.form`
  ${({ theme }) => `
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    box-sizing: border-box;
    padding: ${themeSpace(theme, 'lg')};
    @media (min-width: 768px) {
      padding: ${themeSpace(theme, 'xl')};
    }
    > h2 {
      ${headingText(theme, 'h3')}
      margin-top: 0;
      margin-bottom: ${themeSpace(theme, 'xl')};
    }
  `}
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

/* The action, tokens.space.sm under the last field's gap */
export const Actions = styled.div`
  display: flex;
  margin-top: ${props => themeSpace(props.theme, 'sm')};
`
