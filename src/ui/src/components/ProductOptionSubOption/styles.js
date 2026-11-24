import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'

/* ---- a sub-option is a Choice (design-system piece) with its extras as siblings ---- */

// The row's Choice and, under it, its stepper and halves (nothing interactive goes inside a Choice)
export const SubOptionRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// The stepper and the halves, under the row
export const SubOptionExtras = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// The stepper at the end of the row's first line
export const StepperEnd = styled.div`
  display: flex;
  align-items: center;
  margin-inline-start: auto;
`

// The halves tabs take a line of the row
export const HalvesRow = styled.div`
  flex-basis: 100%;
  min-width: 0;
`

// The glyph of a half (left / whole / right): the right half is the left one turned; below 360px the
// glyphs go, so the three tabs fit a 320px screen
export const HalfGlyph = styled.span`
  display: inline-flex;
  ${({ $reverse }) => $reverse && 'transform: rotate(180deg);'}
  @media (max-width: 360px) {
    display: none;
  }
`
