import styled from 'styled-components'
import { fieldMessageCss } from '~ui/src/styles/Field'

// The box of the phone field is the base InputPhone's; this only holds its
// label and its error, and is the anchor (`.phone_number`) of its screens.
export const Container = styled.div`
  position: relative;
`

// The phone's error: the error text of components.field, its
// message_gap under the field
export const ErrorMsg = styled.span`
  display: block;
  padding: 0;
  text-align: start;
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`
