import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeRadius, themeSpace, themeText } from '~/utils/themeTokens'

export const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
  min-width: 0;
`

export const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
  min-width: 0;
`

export const Group = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
`

// The invitation's three actions: at `sm` the touch areas of the secondary (its own height) and of the small
// ghost below it met, and a phone tap on the secondary's lower edge went to the ghost
export const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  min-width: 0;
`

export const Mark = styled.span`
  display: inline-flex;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  color: ${({ theme }) => themeColor(theme, 'primary_text')};
`

export const Benefits = styled.ul`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin: 0;
  padding: 0;
  list-style: none;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => themeSpace(theme, 'sm')};
  }
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
  }
`

export const Identity = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin: 0;
  padding: ${({ theme }) => `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'md')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  overflow-wrap: anywhere;
  ${({ theme }) => themeText(theme, 'body')}
`

export const Summary = styled.ul`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin: 0;
  padding: ${({ theme }) => `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'md')}`};
  list-style: none;
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => themeSpace(theme, 'sm')};
    overflow-wrap: anywhere;
  }
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
  }
`

export const Label = styled.label`
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

export const Hint = styled.span`
  color: ${({ theme, $error }) => ($error ? themeColor(theme, 'danger_text') : themeColor(theme, 'text_muted'))};
  ${({ theme }) => themeText(theme, 'caption')}
`

export const Done = styled.div`
  display: grid;
  justify-items: start;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`
