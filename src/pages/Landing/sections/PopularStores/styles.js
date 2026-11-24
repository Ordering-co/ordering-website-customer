import styled from 'styled-components'
import { themeMedia, themeSpace } from '~/utils/themeTokens'

// The cards fill the column: as many as fit at a card's width (a media box of
// the theme, already a CSS length), a row of the theme's space apart. A card
// sizes itself as a share of its row (the listing's flex rows), so here each
// fills its own cell; the doubled class wins over the card's media-query widths.
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, ${({ theme }) => themeMedia(theme, '5xl')}), 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};

  && > * {
    width: 100%;
  }
`
