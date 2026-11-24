import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { fieldGap } from '~ui/src/styles/Field'

export const InputContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;

  /* the fields inside their row (no margin past its width), tokens.space.md
     apart, the rows too (the form rhythm) */
  gap: ${({ theme }) => fieldGap(theme)};
  margin-top: ${({ theme }) => fieldGap(theme)};
`

export const FormContainer = styled.div``

/* the action tokens.space.xl under the fields, of the row's width (the button is fullWidth) */
export const SubmitRow = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`
