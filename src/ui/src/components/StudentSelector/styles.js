import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeText, themeSpace } from '~/utils/themeTokens'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { fieldLabelGap } from '~ui/src/styles/Field'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: min(100%, 35ch);
  /* a field (its label_gap between the label and the select),
     sm above and lg below */
  gap: ${({ theme }) => fieldLabelGap(theme)};
  margin: ${({ theme }) => themeSpace(theme, 'sm')} 0 ${({ theme }) => themeSpace(theme, 'lg')};

`

/* Add student (a primary ghost button): at the start of the column, a step below the select. */
export const AddStudentAction = styled.div`
  align-self: flex-start;
  margin-top: ${props => themeSpace(props.theme, 'xs')};
`

export const Label = styled.span`
  ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 600 })}
  color: ${({ theme }) => themeColor(theme, 'text')};
`

/* an info alert of the theme (the menu is filtered), a status */
export const Notice = styled.div.attrs(alertAttrs('info'))`
  margin: 0 0 ${props => themeSpace(props.theme, 'lg')};

  strong {
    font-weight: 600;
  }
  ${props => alertRules(props.theme, 'info')}
`

/* a warning alert of the theme, a status */
export const Warning = styled.div.attrs(alertAttrs('warning'))`
  margin-top: ${props => themeSpace(props.theme, 'sm')};
  ${props => alertRules(props.theme, 'warning')}
`
