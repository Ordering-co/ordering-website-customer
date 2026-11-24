import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'

// The place of the suggestions: right under the field, as wide as it, as tall
// as a share of the screen. The box and its scroll are the MenuSurface's.
export const AddressMapBoxListContainer = styled.div`
  position: absolute;
  top: 100%;
  inset-inline: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 40dvh;
`

// What a suggestion shows, in its MenuItemButton (an option of components.menu, which spreads its children
// apart): the pin and the address together at the start, the theme's gap between them, so every address starts
// at the same point whatever its length
export const SuggestionContent = styled.span`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const SuggestionPin = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

// The address of a suggestion: room above and below the text
export const SuggestionText = styled.p`
  margin: 0;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
`

// The address under the "use my location" row: muted, wrapped (a long address never cuts or widens the row)
export const SuggestionDetail = styled.span`
  display: block;
  overflow-wrap: anywhere;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}
`
