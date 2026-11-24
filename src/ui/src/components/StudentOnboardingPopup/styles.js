import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'sm')};
  /* the theme's md between the students, like the fields of a form */
  gap: ${props => themeSpace(props.theme, 'md')};
`

/* Add student sits at the start of the column, a step below the students. */
export const CreateAction = styled.div`
  align-self: flex-start;
  margin-top: ${props => themeSpace(props.theme, 'xs')};
`
